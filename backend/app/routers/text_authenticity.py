from fastapi import APIRouter, Form, HTTPException

from ..services.text_authenticity_service import detect_text_authenticity, text_authenticity_status


router = APIRouter(prefix="/text-authenticity", tags=["text-authenticity"])


@router.get("/status")
def status():
    return text_authenticity_status()


@router.post("/detect")
async def detect(
    text: str = Form(...),
    threshold: float = Form(0.5),
):
    try:
        return detect_text_authenticity(text, threshold=threshold)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
