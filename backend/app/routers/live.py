from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

import cv2
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..services.weapon_service import weapon_detector


router = APIRouter(prefix="/live", tags=["live"])

FFMPEG_BIN = os.getenv("FFMPEG_BIN", "ffmpeg")
START_TIMEOUT_SECONDS = 15.0


@dataclass
class StreamState:
    stream_id: str
    rtsp_url: str
    dir_path: Path
    process: subprocess.Popen
    created_at: float
    stop_event: threading.Event
    thread: threading.Thread
    tool: str


STREAMS: dict[str, StreamState] = {}


class LiveStartRequest(BaseModel):
    rtsp_url: str
    tool: str | None = None


class LiveStartResponse(BaseModel):
    stream_id: str
    playlist_url: str


def _ensure_ffmpeg():
    if shutil.which(FFMPEG_BIN) is None:
        raise HTTPException(
            status_code=500,
            detail="ffmpeg introuvable. Installez ffmpeg ou ajoutez-le au PATH.",
        )


def _normalize_rtsp(url: str) -> str:
    trimmed = url.strip()
    if not trimmed:
        raise HTTPException(status_code=400, detail="rtsp_url is required.")
    if not trimmed.lower().startswith("rtsp://"):
        trimmed = f"rtsp://{trimmed}"
    if not trimmed.lower().startswith("rtsp://"):
        raise HTTPException(status_code=400, detail="rtsp_url must start with rtsp://")
    return trimmed


def _normalize_tool(tool: str | None) -> str:
    value = (tool or "none").strip().lower()
    if value not in {"none", "weapon_detection"}:
        raise HTTPException(status_code=400, detail="Unsupported tool.")
    return value


def _open_capture(rtsp_url: str):
    capture = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return capture


def _start_ffmpeg(width: int, height: int, fps: float, output_dir: Path) -> subprocess.Popen:
    playlist_path = output_dir / "index.m3u8"
    segment_pattern = str(output_dir / "segment_%03d.ts")
    gop = max(int(fps), 10)

    command = [
        FFMPEG_BIN,
        "-f",
        "rawvideo",
        "-pix_fmt",
        "bgr24",
        "-s",
        f"{width}x{height}",
        "-r",
        f"{fps:.2f}",
        "-i",
        "-",
        "-fflags",
        "nobuffer",
        "-flags",
        "low_delay",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-tune",
        "zerolatency",
        "-g",
        str(gop),
        "-keyint_min",
        str(gop),
        "-sc_threshold",
        "0",
        "-f",
        "hls",
        "-hls_time",
        "1",
        "-hls_list_size",
        "4",
        "-hls_flags",
        "delete_segments+omit_endlist+independent_segments",
        "-hls_segment_filename",
        segment_pattern,
        str(playlist_path),
    ]

    return subprocess.Popen(
        command,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def _draw_weapon_boxes(frame, results) -> bool:
    detected = False
    for result in results:
        names = result.names
        for box in result.boxes:
            detected = True
            cls = int(box.cls[0])
            label = names.get(cls, str(cls))
            conf = float(box.conf[0])
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
            text = f"{label} {conf:.2f}"
            cv2.putText(
                frame,
                text,
                (x1, max(y1 - 8, 12)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )
    if detected:
        cv2.putText(
            frame,
            "WEAPON DETECTED",
            (12, 32),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 0, 255),
            2,
            cv2.LINE_AA,
        )
    return detected


def _pump_frames(
    rtsp_url: str,
    process: subprocess.Popen,
    stop_event: threading.Event,
    width: int,
    height: int,
    fps: float,
    tool: str,
):
    backoff = 0.4
    detector = weapon_detector().model if tool == "weapon_detection" else None
    frame_index = 0
    capture = None
    try:
        while not stop_event.is_set():
            if capture is None or not capture.isOpened():
                if capture is not None:
                    capture.release()
                capture = _open_capture(rtsp_url)
                time.sleep(0.2)

            ok, frame = capture.read()
            if not ok or frame is None:
                if capture is not None:
                    capture.release()
                capture = None
                time.sleep(backoff)
                backoff = min(backoff * 1.4, 3.0)
                continue

            backoff = 0.4
            if frame.shape[1] != width or frame.shape[0] != height:
                frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)

            if detector is not None and frame_index % 3 == 0:
                results = detector.predict(frame, conf=0.25, verbose=False)
                _draw_weapon_boxes(frame, results)
            frame_index += 1

            try:
                if process.stdin:
                    process.stdin.write(frame.tobytes())
            except (BrokenPipeError, OSError):
                break

            if fps > 0:
                time.sleep(max(0.0, (1.0 / fps) * 0.25))
    finally:
        if capture is not None:
            capture.release()
        try:
            if process.stdin:
                process.stdin.close()
        except OSError:
            pass


def _cleanup_stream(stream_id: str) -> None:
    state = STREAMS.pop(stream_id, None)
    if not state:
        return
    try:
        state.stop_event.set()
        if state.thread.is_alive():
            state.thread.join(timeout=2)
        if state.process.poll() is None:
            state.process.terminate()
            try:
                state.process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                state.process.kill()
    finally:
        shutil.rmtree(state.dir_path, ignore_errors=True)


@router.post("/start", response_model=LiveStartResponse)
def start_stream(payload: LiveStartRequest, request: Request):
    _ensure_ffmpeg()
    rtsp_url = _normalize_rtsp(payload.rtsp_url)
    tool = _normalize_tool(payload.tool)

    stream_id = uuid.uuid4().hex
    output_dir = Path(tempfile.mkdtemp(prefix="live_stream_"))

    try:
        capture = _open_capture(rtsp_url)
        ok, frame = capture.read()
        if not ok or frame is None:
            capture.release()
            raise HTTPException(status_code=502, detail="Impossible de lire le flux RTSP.")

        height, width = frame.shape[:2]
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
        if fps <= 0:
            fps = 20.0

        process = _start_ffmpeg(width, height, fps, output_dir)
        stop_event = threading.Event()
        thread = threading.Thread(
            target=_pump_frames,
            args=(rtsp_url, process, stop_event, width, height, fps, tool),
            daemon=True,
        )
        thread.start()
        capture.release()
    except Exception as exc:
        shutil.rmtree(output_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    STREAMS[stream_id] = StreamState(
        stream_id=stream_id,
        rtsp_url=rtsp_url,
        dir_path=output_dir,
        process=process,
        created_at=time.time(),
        stop_event=stop_event,
        thread=thread,
        tool=tool,
    )

    playlist_path = output_dir / "index.m3u8"
    deadline = time.time() + START_TIMEOUT_SECONDS
    while time.time() < deadline:
        if playlist_path.exists():
            break
        if process.poll() is not None:
            _cleanup_stream(stream_id)
            raise HTTPException(status_code=500, detail="ffmpeg exited before stream start.")
        time.sleep(0.2)

    if not playlist_path.exists():
        _cleanup_stream(stream_id)
        raise HTTPException(status_code=504, detail="Stream did not start in time.")

    playlist_url = str(
        request.url_for(
            "live_stream_file",
            stream_id=stream_id,
            file_path="index.m3u8",
        )
    )

    return LiveStartResponse(stream_id=stream_id, playlist_url=playlist_url)


@router.post("/stop/{stream_id}")
def stop_stream(stream_id: str):
    if stream_id not in STREAMS:
        return {"status": "stopped", "found": False}
    _cleanup_stream(stream_id)
    return {"status": "stopped", "found": True}


@router.get("/stream/{stream_id}/{file_path:path}", name="live_stream_file")
def get_stream_file(stream_id: str, file_path: str):
    state = STREAMS.get(stream_id)
    if not state:
        raise HTTPException(status_code=404, detail="Stream not found.")

    if not file_path or ".." in file_path or file_path.startswith("/"):
        raise HTTPException(status_code=404, detail="Invalid file path.")

    target = (state.dir_path / file_path).resolve()
    if state.dir_path not in target.parents and target != state.dir_path:
        raise HTTPException(status_code=404, detail="Invalid file path.")
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found.")

    if target.suffix == ".m3u8":
        media_type = "application/vnd.apple.mpegurl"
    elif target.suffix == ".ts":
        media_type = "video/mp2t"
    else:
        media_type = "application/octet-stream"

    return FileResponse(target, media_type=media_type)
