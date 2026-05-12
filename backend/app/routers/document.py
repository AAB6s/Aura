from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from ..services.document_service import document_model_status, document_pipeline, reload_document_models


router = APIRouter(prefix="/document", tags=["document"])


class ChatRequest(BaseModel):
    question: str
    session_id: str | None = None


@router.get("/status")
def status():
    return {"models": document_model_status()}


@router.post("/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    question: str = Form(""),
    case_id: str = Form(""),
):
    suffix = Path(file.filename or "").suffix or ".bin"
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = Path(tmp.name)
        return document_pipeline().analyze(tmp_path, question, case_id or None)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if "tmp_path" in locals() and tmp_path.exists():
            tmp_path.unlink(missing_ok=True)


@router.post("/chat")
async def chat(payload: ChatRequest):
    try:
        return document_pipeline().chat(payload.question, payload.session_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/reload-models")
def reload_models():
    return {"models": reload_document_models()}
