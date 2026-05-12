from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..services.weapon_service import detect_weapons, weapon_status


router = APIRouter(prefix="/weapon", tags=["weapon"])


@router.get("/status")
def status():
    return weapon_status()


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
        return detect_weapons(tmp_path, confidence=confidence)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if "tmp_path" in locals() and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)

