from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.propagation_service import predict_propagation, propagation_status


class PropagationRequest(BaseModel):
    features: dict[str, float] = Field(default_factory=dict)
    positions: list[int] | None = None


router = APIRouter(prefix="/propagation", tags=["propagation"])


@router.get("/status")
def status():
    return propagation_status()


@router.post("/predict")
async def predict(payload: PropagationRequest):
    try:
        return predict_propagation(payload.features, positions=payload.positions)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
