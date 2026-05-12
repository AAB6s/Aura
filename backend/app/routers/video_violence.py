from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..services.video_violence_service import detect_video_violence, video_violence_status


router = APIRouter(prefix="/video-violence", tags=["video-violence"])


@router.get("/status")
def status():
    return video_violence_status()


@router.post("/detect")
async def detect(
    file: UploadFile = File(...),
    threshold: float = Form(0.6),
    num_frames: int = Form(32),
):
    suffix = Path(file.filename or "").suffix or ".mp4"
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = Path(tmp.name)
        return detect_video_violence(tmp_path, threshold=threshold, num_frames=num_frames)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if "tmp_path" in locals() and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
