from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.heartbeat_service import heartbeat_status, predict_heartbeat


class HeartbeatRequest(BaseModel):
    features: dict[str, float] = Field(default_factory=dict)
    signal: list[float] | None = None


router = APIRouter(prefix="/heartbeat", tags=["heartbeat"])


@router.get("/status")
def status():
    return heartbeat_status()


@router.post("/predict")
async def predict(payload: HeartbeatRequest):
    try:
        return predict_heartbeat(payload.features, signal=payload.signal)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
