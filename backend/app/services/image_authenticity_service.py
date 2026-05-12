from functools import lru_cache
from pathlib import Path

from backend.image_authenticity_detection.detector import ImageAuthenticityDetector, model_status


@lru_cache(maxsize=1)
def image_authenticity_detector() -> ImageAuthenticityDetector:
    return ImageAuthenticityDetector()


def image_authenticity_status():
    return model_status(loaded=image_authenticity_detector.cache_info().currsize > 0)


def detect_image_authenticity(image_path: Path, threshold: float = 0.5):
    return image_authenticity_detector().detect(image_path, threshold=threshold)
