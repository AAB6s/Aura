from functools import lru_cache

from backend.biometric_heartbeat_detection.detector import HeartbeatDetector, model_status


@lru_cache(maxsize=1)
def heartbeat_detector() -> HeartbeatDetector:
    return HeartbeatDetector()


def heartbeat_status():
    return model_status(loaded=heartbeat_detector.cache_info().currsize > 0)


def predict_heartbeat(features: dict[str, float], signal: list[float] | None = None):
    return heartbeat_detector().predict(features, signal=signal)
