from __future__ import annotations

import os

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter(prefix="/chat", tags=["chat"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
DEFAULT_TIMEOUT_SECONDS = 20


class PsychologiqueRequest(BaseModel):
    text: str
    mode: str = "text"
    history: list = []


@router.post("/psychologique")
def psychologique(payload: PsychologiqueRequest):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required.")
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set.")

    try:
        base_url = "https://generativelanguage.googleapis.com/v1beta"
        endpoint = f"{base_url}/models/{GEMINI_MODEL}:generateContent"
        response = requests.post(
            endpoint,
            params={"key": GEMINI_API_KEY},
            json={
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": text}],
                    }
                ]
            },
            timeout=DEFAULT_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Gemini API unreachable.") from exc

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API error: {response.status_code} {response.text}",
        )

    try:
        payload = response.json()
        candidates = payload.get("candidates", []) if isinstance(payload, dict) else []
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                return {"response": str(parts[0].get("text", ""))}
        return {"response": ""}
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Gemini API invalid JSON.") from exc
