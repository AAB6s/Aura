from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.heartbeat_service import heartbeat_status, predict_heartbeat, predict_live_heartbeat


class HeartbeatRequest(BaseModel):
    features: dict[str, float] = Field(default_factory=dict)
    signal: list[float] | None = None


class HeartbeatLiveRequest(BaseModel):
    signal: list[float] = Field(default_factory=list)


router = APIRouter(prefix="/heartbeat", tags=["heartbeat"])


@router.get("/status")
def status():
    return heartbeat_status()


@router.get("/ping")
def ping():
    return {"status": "ok"}


@router.post("/predict")
async def predict(payload: HeartbeatRequest):
    try:
        return predict_heartbeat(payload.features, signal=payload.signal)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/live")
async def live(payload: HeartbeatLiveRequest):
    try:
        return predict_live_heartbeat(payload.signal)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
