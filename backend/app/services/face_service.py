from functools import lru_cache
from pathlib import Path

from backend.face_detection.detector import FaceDetector, model_status


@lru_cache(maxsize=1)
def face_detector() -> FaceDetector:
    return FaceDetector()


def face_status():
    return model_status(loaded=face_detector.cache_info().currsize > 0)


def detect_faces(image_path: Path, confidence: float = 0.25):
    return face_detector().detect(image_path, confidence=confidence)
