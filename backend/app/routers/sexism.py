from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..services.sexism_service import detect_sexism, sexism_status


router = APIRouter(prefix="/sexism", tags=["sexism"])


@router.get("/status")
def status():
    return sexism_status()


@router.post("/detect")
async def detect(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix or ".jpg"
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = Path(tmp.name)
        return detect_sexism(tmp_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if "tmp_path" in locals() and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
