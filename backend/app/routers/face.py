from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..services.face_service import detect_faces, face_status


router = APIRouter(prefix="/face", tags=["face"])


@router.get("/status")
def status():
    return face_status()


@router.post("/detect")
async def detect(
    file: UploadFile = File(...),
    confidence: float = Form(0.25),
):
    suffix = Path(file.filename or "").suffix or ".jpg"
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = Path(tmp.name)
        return detect_faces(tmp_path, confidence=confidence)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if "tmp_path" in locals() and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
