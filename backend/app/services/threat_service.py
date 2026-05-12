from functools import lru_cache
from pathlib import Path

from backend.threat_detection.detector import ThreatDetector, model_status


@lru_cache(maxsize=1)
def threat_detector() -> ThreatDetector:
    return ThreatDetector()


def threat_status():
    return model_status(loaded=threat_detector.cache_info().currsize > 0)


def detect_threat(media_path: Path, threshold: float = 0.5, clip_frames: int = 16):
    return threat_detector().detect(media_path, threshold=threshold, clip_frames=clip_frames)

