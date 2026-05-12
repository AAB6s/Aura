from functools import lru_cache
from pathlib import Path

from backend.sexism_detection.detector import SexismDetector, model_status


@lru_cache(maxsize=1)
def sexism_detector() -> SexismDetector:
    return SexismDetector()


def sexism_status():
    return model_status(loaded=sexism_detector.cache_info().currsize > 0)


def detect_sexism(image_path: Path):
    return sexism_detector().detect(image_path)

