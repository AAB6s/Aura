from fastapi import APIRouter

from ..services.registry import list_models


router = APIRouter(tags=["models"])


@router.get("/health")
def health():
    return {"ok": True}


@router.get("/models")
def models():
    return {"models": list_models()}

