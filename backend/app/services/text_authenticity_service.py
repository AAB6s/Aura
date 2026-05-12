from functools import lru_cache

from backend.text_authenticity_detection.detector import TextAuthenticityDetector, model_status


@lru_cache(maxsize=1)
def text_authenticity_detector() -> TextAuthenticityDetector:
    return TextAuthenticityDetector()


def text_authenticity_status():
    return model_status(loaded=text_authenticity_detector.cache_info().currsize > 0)


def detect_text_authenticity(text: str, threshold: float = 0.5):
    return text_authenticity_detector().detect(text, threshold=threshold)
