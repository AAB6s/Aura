from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..services.image_authenticity_service import detect_image_authenticity, image_authenticity_status


router = APIRouter(prefix="/image-authenticity", tags=["image-authenticity"])


@router.get("/status")
def status():
    return image_authenticity_status()


@router.post("/detect")
async def detect(
    file: UploadFile = File(...),
    threshold: float = Form(0.5),
):
    suffix = Path(file.filename or "").suffix or ".jpg"
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = Path(tmp.name)
        return detect_image_authenticity(tmp_path, threshold=threshold)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if "tmp_path" in locals() and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
