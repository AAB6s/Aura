from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..services.media_safety_service import analyze_media_safety, media_safety_status


router = APIRouter(prefix="/media-safety", tags=["media-safety"])
WHISPER_MODELS = {"tiny", "base", "small"}


@router.get("/status")
def status():
    return media_safety_status()


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    violence: bool = Form(True),
    threat: bool = Form(True),
    weapons: bool = Form(True),
    faces: bool = Form(True),
    audio: bool = Form(True),
    weapon_confidence: float = Form(0.25),
    face_confidence: float = Form(0.25),
    violence_threshold: float = Form(0.6),
    threat_threshold: float = Form(0.5),
    num_frames: int = Form(32),
    clip_frames: int = Form(16),
    object_frame_limit: int = Form(72),
    transcription: bool = Form(False),
    whisper_model: str = Form("tiny"),
    speaker_grouping: bool = Form(True),
    pyannote_diarization: bool = Form(False),
    hf_emotion: bool = Form(False),
    hf_deepfake: bool = Form(False),
    acoustic_context: bool = Form(True),
    integrity: bool = Form(True),
    xai: bool = Form(True),
):
    if whisper_model not in WHISPER_MODELS:
        raise HTTPException(status_code=400, detail="Unsupported whisper_model.")
    suffix = Path(file.filename or "").suffix or ".bin"
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = Path(tmp.name)
        return analyze_media_safety(
            tmp_path,
            filename=file.filename or tmp_path.name,
            content_type=file.content_type,
            run_violence=violence,
            run_threat=threat,
            run_weapons=weapons,
            run_faces=faces,
            run_audio=audio,
            weapon_confidence=weapon_confidence,
            face_confidence=face_confidence,
            violence_threshold=violence_threshold,
            threat_threshold=threat_threshold,
            num_frames=num_frames,
            clip_frames=clip_frames,
            object_frame_limit=object_frame_limit,
            transcription=transcription,
            whisper_model=whisper_model,
            speaker_grouping=speaker_grouping,
            pyannote_diarization=pyannote_diarization,
            hf_emotion=hf_emotion,
            hf_deepfake=hf_deepfake,
            acoustic_context=acoustic_context,
            integrity=integrity,
            xai=xai,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if "tmp_path" in locals() and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
