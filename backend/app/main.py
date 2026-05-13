from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .services.paths import BACKEND_DIR
from .routers import (
    document,
    heartbeat,
    image_authenticity,
    media_safety,
    models,
    propagation,
    sexism,
    text_authenticity,
)


app = FastAPI(
    title="Model Demo API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router)
app.include_router(document.router)
app.include_router(media_safety.router)
app.include_router(sexism.router)
app.include_router(image_authenticity.router)
app.include_router(text_authenticity.router)
app.include_router(propagation.router)
app.include_router(heartbeat.router)
ARTIFACTS_DIR = BACKEND_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/artifacts", StaticFiles(directory=ARTIFACTS_DIR), name="artifacts")
