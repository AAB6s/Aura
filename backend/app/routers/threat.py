from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..services.threat_service import detect_threat, threat_status


router = APIRouter(prefix="/threat", tags=["threat"])


@router.get("/status")
def status():
    return threat_status()


@router.post("/detect")
async def detect(
    file: UploadFile = File(...),
    threshold: float = Form(0.5),
    clip_frames: int = Form(16),
):
    suffix = Path(file.filename or "").suffix or ".mp4"
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = Path(tmp.name)
        return detect_threat(tmp_path, threshold=threshold, clip_frames=clip_frames)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if "tmp_path" in locals() and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
