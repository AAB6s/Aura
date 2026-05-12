from functools import lru_cache
from pathlib import Path

from backend.weapon_detection.detector import WeaponDetector, model_status


@lru_cache(maxsize=1)
def weapon_detector() -> WeaponDetector:
    return WeaponDetector()


def weapon_status():
    status = model_status()
    status["loaded"] = weapon_detector.cache_info().currsize > 0
    return status


def detect_weapons(image_path: Path, confidence: float = 0.25):
    return weapon_detector().detect(image_path, confidence=confidence)
