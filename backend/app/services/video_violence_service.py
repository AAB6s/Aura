from functools import lru_cache
from pathlib import Path

from backend.video_violence_detection.detector import VideoSwinViolenceDetector, model_status


@lru_cache(maxsize=1)
def video_violence_detector() -> VideoSwinViolenceDetector:
    return VideoSwinViolenceDetector()


def video_violence_status():
    return model_status(loaded=video_violence_detector.cache_info().currsize > 0)


def detect_video_violence(media_path: Path, threshold: float = 0.6, num_frames: int = 32):
    return video_violence_detector().detect(media_path, threshold=threshold, num_frames=num_frames)
