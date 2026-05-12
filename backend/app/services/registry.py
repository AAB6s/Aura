from pathlib import Path

from .paths import BACKEND_DIR


MODEL_FOLDERS = {
    "document_intelligence_rag": BACKEND_DIR / "document_intelligence_rag" / "models",
    "audio_violence_detection": BACKEND_DIR / "audio_violence_detection" / "models",
    "sexism_detection": BACKEND_DIR / "sexism_detection" / "models",
    "threat_detection": BACKEND_DIR / "threat_detection" / "models",
    "weapon_detection": BACKEND_DIR / "weapon_detection" / "models",
    "image_authenticity_detection": BACKEND_DIR / "image_authenticity_detection" / "models",
    "face_detection": BACKEND_DIR / "face_detection" / "models",
    "text_authenticity_detection": BACKEND_DIR / "text_authenticity_detection" / "models",
    "propagation_prediction": BACKEND_DIR / "propagation_prediction" / "models",
    "biometric_heartbeat_detection": BACKEND_DIR / "biometric_heartbeat_detection" / "models",
    "video_violence_detection": BACKEND_DIR / "video_violence_detection" / "models",
}


def _weights(folder: Path):
    if not folder.exists():
        return []
    return [
        {
            "file": item.name,
            "path": str(item),
            "size_bytes": item.stat().st_size,
        }
        for item in sorted(folder.iterdir())
        if item.suffix.lower() in {".pt", ".pth", ".keras", ".joblib"}
    ]


def list_models():
    return [
        {
            "id": name,
            "path": str(path.parent),
            "weights": _weights(path),
        }
        for name, path in MODEL_FOLDERS.items()
    ]
