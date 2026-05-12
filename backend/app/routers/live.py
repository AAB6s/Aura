from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel


router = APIRouter(prefix="/live", tags=["live"])

FFMPEG_BIN = os.getenv("FFMPEG_BIN", "ffmpeg")
START_TIMEOUT_SECONDS = 4.0


@dataclass
class StreamState:
    stream_id: str
    rtsp_url: str
    dir_path: Path
    process: subprocess.Popen
    created_at: float


STREAMS: dict[str, StreamState] = {}


class LiveStartRequest(BaseModel):
    rtsp_url: str


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


def _start_ffmpeg(rtsp_url: str, output_dir: Path) -> subprocess.Popen:
    playlist_path = output_dir / "index.m3u8"
    segment_pattern = str(output_dir / "segment_%03d.ts")

    command = [
        FFMPEG_BIN,
        "-rtsp_transport",
        "tcp",
        "-i",
        rtsp_url,
        "-fflags",
        "nobuffer",
        "-flags",
        "low_delay",
        "-an",
        "-c:v",
        "copy",
        "-f",
        "hls",
        "-hls_time",
        "1",
        "-hls_list_size",
        "4",
        "-hls_flags",
        "delete_segments+omit_endlist",
        "-hls_segment_filename",
        segment_pattern,
        str(playlist_path),
    ]

    return subprocess.Popen(
        command,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def _cleanup_stream(stream_id: str) -> None:
    state = STREAMS.pop(stream_id, None)
    if not state:
        return
    try:
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

    stream_id = uuid.uuid4().hex
    output_dir = Path(tempfile.mkdtemp(prefix="live_stream_"))

    try:
        process = _start_ffmpeg(rtsp_url, output_dir)
    except Exception as exc:
        shutil.rmtree(output_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    STREAMS[stream_id] = StreamState(
        stream_id=stream_id,
        rtsp_url=rtsp_url,
        dir_path=output_dir,
        process=process,
        created_at=time.time(),
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
