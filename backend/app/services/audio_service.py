from functools import lru_cache
from pathlib import Path

from .paths import BACKEND_DIR


@lru_cache(maxsize=1)
def audio_pipeline():
    from backend.audio_violence_detection.pipeline import AudioContextPipeline

    return AudioContextPipeline()


def audio_status():
    model_path = BACKEND_DIR / "audio_violence_detection" / "models" / "resnet34_final.pt"
    return {
        "name": "audio_violence_detection",
        "model_path": str(model_path),
        "exists": model_path.exists(),
        "size_bytes": model_path.stat().st_size if model_path.exists() else 0,
        "loaded": audio_pipeline.cache_info().currsize > 0,
        "features": {
            "transcription": {"default": False, "whisper_models": ["tiny", "base", "small"]},
            "speaker_grouping": {"default": True},
            "pyannote_diarization": {"default": False},
            "hf_emotion": {"default": False},
            "hf_deepfake": {"default": False},
            "acoustic_context": {"default": True},
            "integrity": {"default": True},
            "xai": {"default": True},
        },
    }


def analyze_audio(
    audio_path: Path,
    transcription: bool = False,
    whisper_model: str = "tiny",
    speaker_grouping: bool = True,
    pyannote_diarization: bool = False,
    hf_emotion: bool = False,
    hf_deepfake: bool = False,
    acoustic_context: bool = True,
    integrity: bool = True,
    xai: bool = True,
):
    return audio_pipeline().analyze(
        audio_path,
        transcription=transcription,
        whisper_model=whisper_model,
        speaker_grouping=speaker_grouping,
        pyannote_diarization=pyannote_diarization,
        hf_emotion=hf_emotion,
        hf_deepfake=hf_deepfake,
        acoustic_context=acoustic_context,
        integrity=integrity,
        xai=xai,
    )
