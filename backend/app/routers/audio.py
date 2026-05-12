from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..services.audio_service import analyze_audio, audio_status


router = APIRouter(prefix="/audio", tags=["audio"])
WHISPER_MODELS = {"tiny", "base", "small"}


@router.get("/status")
def status():
    return audio_status()


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
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
    suffix = Path(file.filename or "").suffix or ".wav"
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = Path(tmp.name)
        return analyze_audio(
            tmp_path,
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
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if "tmp_path" in locals() and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
