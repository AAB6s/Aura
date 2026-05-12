from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import (
    audio,
    document,
    face,
    image_authenticity,
    live,
    models,
    propagation,
    sexism,
    text_authenticity,
    threat,
    weapon,
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
app.include_router(audio.router)
app.include_router(sexism.router)
app.include_router(threat.router)
app.include_router(weapon.router)
app.include_router(image_authenticity.router)
app.include_router(face.router)
app.include_router(text_authenticity.router)
app.include_router(propagation.router)
app.include_router(live.router)
