from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from uuid import uuid4

from .audio_service import analyze_audio
from .face_service import detect_faces, face_detector
from .paths import BACKEND_DIR
from .threat_service import detect_threat
from .video_violence_service import detect_video_violence
from .weapon_service import detect_weapons, weapon_detector


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}
AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac"}
ARTIFACT_DIR = BACKEND_DIR / "artifacts" / "media_safety"

CHECK_LABELS = {
    "violence": "Violence",
    "threat": "Threat",
    "weapons": "Weapons",
    "faces": "Faces",
    "audio": "Audio signals",
}

COLORS = {
    "violence": (214, 82, 220),
    "threat": (0, 172, 255),
    "weapons": (42, 58, 230),
    "faces": (230, 186, 28),
    "audio": (88, 196, 96),
}
AUDIO_DISPLAY_THRESHOLD = 0.6


def media_safety_status():
    from .audio_service import audio_status
    from .face_service import face_status
    from .threat_service import threat_status
    from .video_violence_service import video_violence_status
    from .weapon_service import weapon_status

    return {
        "name": "media_safety_scan",
        "input_type": "image_video_audio",
        "checks": {
            "violence": video_violence_status(),
            "threat": threat_status(),
            "weapons": weapon_status(),
            "faces": face_status(),
            "audio": audio_status(),
        },
    }


def analyze_media_safety(
    media_path: Path,
    filename: str,
    content_type: str | None = None,
    run_violence: bool = True,
    run_threat: bool = True,
    run_weapons: bool = True,
    run_faces: bool = True,
    run_audio: bool = True,
    weapon_confidence: float = 0.25,
    face_confidence: float = 0.25,
    violence_threshold: float = 0.6,
    threat_threshold: float = 0.5,
    num_frames: int = 32,
    clip_frames: int = 16,
    object_frame_limit: int = 72,
    transcription: bool = False,
    whisper_model: str = "tiny",
    speaker_grouping: bool = True,
    pyannote_diarization: bool = False,
    hf_emotion: bool = False,
    hf_deepfake: bool = False,
    acoustic_context: bool = True,
    integrity: bool = True,
    xai: bool = True,
):
    media_path = Path(media_path)
    media_type = detect_media_type(media_path, content_type)
    selected = [
        check
        for check, enabled in {
            "violence": run_violence,
            "threat": run_threat,
            "weapons": run_weapons,
            "faces": run_faces,
            "audio": run_audio,
        }.items()
        if enabled
    ]
    if not selected:
        raise ValueError("Select at least one media safety check.")

    skipped = []
    errors = []
    results = {}
    frame_groups = {}
    video_metadata = read_video_metadata(media_path) if media_type == "video" else None

    tasks = {}
    with ThreadPoolExecutor(max_workers=min(5, max(1, len(selected)))) as executor:
        if run_violence:
            if media_type in {"image", "video"}:
                tasks[executor.submit(
                    detect_video_violence,
                    media_path,
                    threshold=violence_threshold,
                    num_frames=num_frames,
                )] = "violence"
            else:
                skipped.append(skip("violence", "Violence needs an image or video."))

        if run_threat:
            if media_type in {"image", "video"}:
                tasks[executor.submit(
                    detect_threat,
                    media_path,
                    threshold=threat_threshold,
                    clip_frames=clip_frames,
                )] = "threat"
            else:
                skipped.append(skip("threat", "Threat needs an image or video."))

        if run_weapons:
            if media_type == "image":
                tasks[executor.submit(detect_weapons, media_path, weapon_confidence)] = "weapons"
            elif media_type == "video":
                tasks[executor.submit(
                    detect_objects_in_video,
                    media_path,
                    "weapons",
                    weapon_confidence,
                    object_frame_limit,
                )] = "weapons"
            else:
                skipped.append(skip("weapons", "Weapons need an image or video."))

        if run_faces:
            if media_type == "image":
                tasks[executor.submit(detect_faces, media_path, face_confidence)] = "faces"
            elif media_type == "video":
                tasks[executor.submit(
                    detect_objects_in_video,
                    media_path,
                    "faces",
                    face_confidence,
                    object_frame_limit,
                )] = "faces"
            else:
                skipped.append(skip("faces", "Faces need an image or video."))

        if run_audio:
            if media_type == "audio":
                tasks[executor.submit(
                    analyze_audio,
                    media_path,
                    transcription,
                    whisper_model,
                    speaker_grouping,
                    pyannote_diarization,
                    hf_emotion,
                    hf_deepfake,
                    acoustic_context,
                    integrity,
                    xai,
                )] = "audio"
            elif media_type == "video":
                extracted_audio, reason = extract_audio(media_path)
                if extracted_audio is None:
                    skipped.append(skip("audio", reason))
                else:
                    tasks[executor.submit(
                        analyze_audio,
                        extracted_audio,
                        transcription,
                        whisper_model,
                        speaker_grouping,
                        pyannote_diarization,
                        hf_emotion,
                        hf_deepfake,
                        acoustic_context,
                        integrity,
                        xai,
                    )] = ("audio", extracted_audio)
            else:
                skipped.append(skip("audio", "Audio signals need an audio file or a video with sound."))

        for future in as_completed(tasks):
            task = tasks[future]
            check = task[0] if isinstance(task, tuple) else task
            cleanup_path = task[1] if isinstance(task, tuple) and len(task) > 1 else None
            try:
                output = future.result()
                if check in {"weapons", "faces"} and media_type == "video":
                    results[check] = output["result"]
                    frame_groups[check] = output["frame_detections"]
                elif check == "audio":
                    results[check] = compact_audio_result(output)
                else:
                    results[check] = output
            except Exception as exc:
                errors.append({"check": check, "message": str(exc)})
            finally:
                if cleanup_path is not None:
                    Path(cleanup_path).unlink(missing_ok=True)

    annotation = {"available": False, "frame_count": 0, "fps": None}
    previews = {}
    if media_type == "image":
        annotated = annotate_image(media_path, results)
        if annotated:
            previews["annotated_image_url"] = annotated["url"]
            annotation = {
                "available": True,
                "frame_count": 1,
                "fps": None,
            }
    elif media_type == "video":
        annotated = annotate_video(media_path, results, frame_groups, video_metadata)
        if annotated:
            previews["annotated_video_url"] = annotated["url"]
            annotation = {
                "available": True,
                "frame_count": annotated["frame_count"],
                "fps": annotated["fps"],
            }

    return {
        "file": filename,
        "model": "media_safety_scan",
        "media_type": media_type,
        "selected_checks": selected,
        "completed_checks": sorted(results.keys()),
        "results": results,
        "previews": previews,
        "timeline": build_timeline(results, frame_groups, media_type, video_metadata),
        "skipped": skipped,
        "errors": errors,
        "annotation": annotation,
    }


def detect_media_type(path: Path, content_type: str | None):
    content_type = (content_type or "").lower()
    suffix = path.suffix.lower()
    if content_type.startswith("image/") or suffix in IMAGE_EXTENSIONS:
        return "image"
    if content_type.startswith("video/") or suffix in VIDEO_EXTENSIONS:
        return "video"
    if content_type.startswith("audio/") or suffix in AUDIO_EXTENSIONS:
        return "audio"
    return "unknown"


def skip(check: str, reason: str):
    return {"check": check, "label": CHECK_LABELS.get(check, check), "reason": reason}


def read_video_metadata(video_path: Path):
    import cv2

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        return {"frame_count": 0, "fps": None, "duration_seconds": None}
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    capture.release()
    return {
        "frame_count": frame_count,
        "fps": round(fps, 3) if fps > 0 else None,
        "duration_seconds": round(frame_count / fps, 3) if fps > 0 and frame_count > 0 else None,
    }


def detect_objects_in_video(video_path: Path, check: str, confidence: float, frame_limit: int):
    import cv2
    import numpy as np

    detector = weapon_detector() if check == "weapons" else face_detector()
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise ValueError("Could not read video frames.")

    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    if frame_count > 0:
        count = min(max(1, int(frame_limit)), frame_count)
        indices = sorted(set(int(index) for index in np.linspace(0, frame_count - 1, count, dtype=int)))
    else:
        indices = list(range(max(1, int(frame_limit))))

    frame_detections = []
    total_detections = 0
    for frame_index in indices:
        if frame_count > 0:
            capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        ok, frame = capture.read()
        if not ok or frame is None:
            continue
        detections = predict_yolo_frame(detector.model, frame, confidence)
        total_detections += len(detections)
        if detections:
            frame_detections.append(
                {
                    "frame_index": int(frame_index),
                    "time_seconds": round(frame_index / fps, 3) if fps > 0 else None,
                    "detections": detections,
                }
            )

    capture.release()
    return {
        "result": {
            "model": "weapon_detection" if check == "weapons" else "face_detection",
            "frame_count": frame_count,
            "fps": round(fps, 3) if fps > 0 else None,
            "sampled_frames": len(indices),
            "total_detections": total_detections,
            "frame_detections": frame_detections,
        },
        "frame_detections": frame_detections,
    }


def predict_yolo_frame(model, frame, confidence: float):
    results = model.predict(frame, conf=confidence, verbose=False)
    detections = []
    for result in results:
        names = result.names
        for box in result.boxes:
            cls = int(box.cls[0])
            detections.append(
                {
                    "label": names.get(cls, str(cls)),
                    "confidence": round(float(box.conf[0]), 6),
                    "box_xyxy": [round(float(value), 2) for value in box.xyxy[0].tolist()],
                }
            )
    return detections


def extract_audio(video_path: Path):
    import shutil
    import subprocess

    try:
        import imageio_ffmpeg

        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return None, "Audio extraction needs ffmpeg."

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = ARTIFACT_DIR / f"{uuid4().hex}.wav"
    command = [
        ffmpeg,
        "-y",
        "-i",
        str(video_path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "32000",
        str(output_path),
    ]
    completed = subprocess.run(command, capture_output=True, text=True)
    if completed.returncode != 0 or not output_path.exists() or output_path.stat().st_size <= 44:
        output_path.unlink(missing_ok=True)
        return None, "No usable audio stream found."
    return output_path, ""


def annotate_image(image_path: Path, results: dict):
    import cv2

    image = cv2.imread(str(image_path))
    if image is None:
        return None
    draw_global_badges(image, results)
    for check in ("weapons", "faces"):
        result = results.get(check)
        if result and "detections" in result:
            draw_boxes(image, result["detections"], check)

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = ARTIFACT_DIR / f"{uuid4().hex}.jpg"
    cv2.imwrite(str(output_path), image)
    return {"url": f"/artifacts/media_safety/{output_path.name}", "path": str(output_path)}


def annotate_video(video_path: Path, results: dict, frame_groups: dict, metadata: dict | None):
    import cv2

    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        return None

    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 25.0) or 25.0
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if width <= 0 or height <= 0:
        capture.release()
        return None

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    raw_output_path = ARTIFACT_DIR / f"{uuid4().hex}.raw.mp4"
    output_path = ARTIFACT_DIR / f"{uuid4().hex}.mp4"
    writer = cv2.VideoWriter(
        str(raw_output_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )
    if not writer.isOpened():
        capture.release()
        return None

    grouped = {
        check: {item["frame_index"]: item["detections"] for item in items}
        for check, items in frame_groups.items()
    }
    sampled_indices = {
        check: sorted(items.keys())
        for check, items in grouped.items()
    }
    all_sample_count = sum(len(items) for items in sampled_indices.values())
    hold = max(1, int((frame_count or 1) / max(1, all_sample_count) / 2)) if all_sample_count else 0
    audio_segments = (results.get("audio") or {}).get("timeline", [])
    frame_index = 0
    written = 0
    while True:
        ok, frame = capture.read()
        if not ok or frame is None:
            break
        time_seconds = frame_index / fps if fps > 0 else None
        draw_global_badges(frame, results, frame_index + 1, frame_count, time_seconds)
        for check in ("weapons", "faces"):
            detections = nearest_detections(
                grouped.get(check, {}),
                sampled_indices.get(check, []),
                frame_index,
                hold,
            )
            draw_boxes(frame, detections, check)
        draw_audio_strip(frame, audio_segments, time_seconds)
        writer.write(frame)
        written += 1
        frame_index += 1

    capture.release()
    writer.release()
    final_path = browser_encode_video(raw_output_path, output_path)
    return {
        "url": f"/artifacts/media_safety/{final_path.name}",
        "path": str(final_path),
        "frame_count": written,
        "fps": round(fps, 3),
    }


def nearest_detections(grouped: dict, sampled_indices: list[int], frame_index: int, hold: int):
    if frame_index in grouped:
        return grouped[frame_index]
    if not grouped or not sampled_indices or hold <= 0:
        return []
    nearest = min(sampled_indices, key=lambda index: abs(index - frame_index))
    if abs(nearest - frame_index) <= hold:
        return grouped.get(nearest, [])
    return []


def browser_encode_video(raw_path: Path, output_path: Path):
    import shutil
    import subprocess

    try:
        import imageio_ffmpeg

        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raw_path.replace(output_path)
        return output_path
    completed = subprocess.run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(raw_path),
            "-an",
            "-vcodec",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(output_path),
        ],
        capture_output=True,
        text=True,
    )
    if completed.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0:
        raw_path.unlink(missing_ok=True)
        return output_path
    return raw_path


def draw_global_badges(frame, results: dict, frame_number: int | None = None, frame_count: int | None = None, time_seconds: float | None = None):
    import cv2

    height, width = frame.shape[:2]
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (width, 74), (18, 18, 22), -1)
    cv2.addWeighted(overlay, 0.72, frame, 0.28, 0, frame)
    title = "MEDIA SAFETY SCAN"
    if frame_number is not None:
        title = f"{title} | Frame {frame_number:05d}/{max(frame_count or frame_number, frame_number):05d}"
    if time_seconds is not None:
        title = f"{title} | {time_seconds:.2f}s"
    cv2.putText(frame, title, (14, 26), cv2.FONT_HERSHEY_DUPLEX, 0.62, (255, 255, 255), 1, cv2.LINE_AA)

    x = 14
    y = 48
    for check, label in badge_items(results):
        color = COLORS[check]
        text = f"{CHECK_LABELS[check]} {label}"
        size, _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.rectangle(frame, (x, y - 16), (x + size[0] + 14, y + 6), color, -1)
        cv2.putText(frame, text, (x + 7, y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        x += size[0] + 22
        if x > width - 160:
            break


def badge_items(results: dict):
    output = []
    violence = results.get("violence")
    if violence:
        label = violence.get("label", "")
        confidence = float(violence.get("confidence", 0.0))
        output.append(("violence", f"{label} {confidence:.0%}"))
    threat = results.get("threat")
    if threat:
        label = threat.get("label", "")
        confidence = float(threat.get("confidence", 0.0))
        output.append(("threat", f"{label} {confidence:.0%}"))
    weapons = results.get("weapons")
    if weapons:
        count = weapons.get("total_detections", len(weapons.get("detections", [])))
        output.append(("weapons", str(count)))
    faces = results.get("faces")
    if faces:
        count = faces.get("total_detections", len(faces.get("detections", [])))
        output.append(("faces", str(count)))
    return output


def draw_boxes(frame, detections: list, check: str):
    import cv2

    if not detections:
        return
    height, width = frame.shape[:2]
    color = COLORS[check]
    for detection in detections:
        x1, y1, x2, y2 = [int(round(value)) for value in detection["box_xyxy"]]
        x1 = max(0, min(width - 1, x1))
        y1 = max(0, min(height - 1, y1))
        x2 = max(0, min(width - 1, x2))
        y2 = max(0, min(height - 1, y2))
        if x2 <= x1 or y2 <= y1:
            continue
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        text = f"{CHECK_LABELS[check]}: {detection['label']} {detection['confidence']:.0%}"
        size, _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
        top = max(0, y1 - size[1] - 8)
        cv2.rectangle(frame, (x1, top), (min(width - 1, x1 + size[0] + 10), y1), color, -1)
        cv2.putText(frame, text, (x1 + 5, max(12, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1, cv2.LINE_AA)


def draw_audio_strip(frame, audio_segments: list, time_seconds: float | None):
    import cv2

    if time_seconds is None or not audio_segments:
        return
    active = None
    for segment in audio_segments:
        if float(segment.get("event_confidence", 0.0)) < AUDIO_DISPLAY_THRESHOLD:
            continue
        start = float(segment.get("start", 0.0))
        end = float(segment.get("end", start))
        if start <= time_seconds <= end:
            active = segment
            break
    if active is None:
        return
    height, width = frame.shape[:2]
    color = COLORS["audio"]
    label = active.get("event_label", "audio")
    confidence = float(active.get("event_confidence", 0.0))
    text = f"Audio: {label} {confidence:.0%}"
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, height - 42), (width, height), (16, 32, 16), -1)
    cv2.addWeighted(overlay, 0.68, frame, 0.32, 0, frame)
    cv2.rectangle(frame, (14, height - 30), (14 + int((width - 28) * max(0.05, min(1.0, confidence))), height - 20), color, -1)
    cv2.putText(frame, text, (14, height - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (230, 255, 230), 1, cv2.LINE_AA)


def build_timeline(results: dict, frame_groups: dict, media_type: str, metadata: dict | None):
    duration = (metadata or {}).get("duration_seconds") or 0
    timeline = []
    if media_type == "video":
        violence = results.get("violence")
        if violence:
            timeline.append(
                {
                    "check": "violence",
                    "start": 0,
                    "end": duration,
                    "label": violence.get("label"),
                    "score": violence.get("confidence"),
                }
            )
        threat = results.get("threat")
        if threat:
            timeline.append(
                {
                    "check": "threat",
                    "start": 0,
                    "end": duration,
                    "label": threat.get("label"),
                    "score": threat.get("confidence"),
                }
            )
        for check, groups in frame_groups.items():
            for group in groups:
                time_seconds = group.get("time_seconds")
                timeline.append(
                    {
                        "check": check,
                        "start": time_seconds,
                        "end": None,
                        "label": f"{len(group.get('detections', []))} detection(s)",
                        "detections": group.get("detections", []),
                    }
                )
    audio = results.get("audio")
    if audio:
        for segment in audio.get("timeline", [])[:200]:
            if float(segment.get("event_confidence", 0.0)) < AUDIO_DISPLAY_THRESHOLD:
                continue
            timeline.append(
                {
                    "check": "audio",
                    "start": segment.get("start"),
                    "end": segment.get("end"),
                    "label": segment.get("event_label"),
                    "score": segment.get("event_confidence"),
                }
            )
    return sorted(timeline, key=lambda item: float(item.get("start") or 0))


def compact_audio_result(result: dict):
    timeline = []
    for segment in result.get("timeline", [])[:300]:
        if float(segment.get("event_confidence", 0.0)) < AUDIO_DISPLAY_THRESHOLD:
            continue
        timeline.append(
            {
                "index": segment.get("index"),
                "start": segment.get("start"),
                "end": segment.get("end"),
                "event_label": segment.get("event_label"),
                "event_confidence": segment.get("event_confidence"),
                "decision_status": segment.get("decision_status"),
                "secondary_events": segment.get("secondary_events", [])[:3],
                "probabilities": segment.get("probabilities", [])[:6],
                "low_energy": segment.get("low_energy"),
                "acoustic_context": segment.get("acoustic_context"),
                "speaker": segment.get("speaker"),
                "transcript": segment.get("transcript"),
                "transcript_status": segment.get("transcript_status"),
                "language": segment.get("language"),
                "hf_emotion": segment.get("hf_emotion"),
                "hf_deepfake": segment.get("hf_deepfake"),
                "reference_speaker": segment.get("reference_speaker"),
            }
        )
    return {
        "file": result.get("file"),
        "file_hash": result.get("file_hash"),
        "duration_seconds": result.get("duration_seconds"),
        "sample_rate": result.get("sample_rate"),
        "model": {
            "name": (result.get("model") or {}).get("name"),
            "classes": (result.get("model") or {}).get("classes", []),
            "temperature": (result.get("model") or {}).get("temperature"),
            "tta_shifts": (result.get("model") or {}).get("tta_shifts", []),
        },
        "summary": result.get("summary", {}),
        "integrity": result.get("integrity", {}),
        "timeline": timeline,
        "timeline_truncated": len(result.get("timeline", [])) > len(timeline),
        "xai_reference_count": len(result.get("xai_references", [])),
        "elapsed_seconds": result.get("elapsed_seconds"),
    }
