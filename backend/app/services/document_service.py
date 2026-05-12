from functools import lru_cache


@lru_cache(maxsize=1)
def document_pipeline():
    from backend.document_intelligence_rag.pipeline import DocumentLegalPipeline

    return DocumentLegalPipeline()


def reload_document_models():
    pipeline = document_pipeline()
    pipeline.load_models()
    return pipeline.model_status()


def document_model_status():
    from backend.document_intelligence_rag.config import (
        CONTENT_CLASSES,
        EVIDENCE_CLASSES,
        INFERENCE_TTA,
        MODEL_FILES,
        QUALITY_CLASSES,
        TAMPER_CLASSES,
    )

    classes_by_name = {
        "content": CONTENT_CLASSES,
        "evidence": EVIDENCE_CLASSES,
        "quality": QUALITY_CLASSES,
        "tamper": TAMPER_CLASSES,
    }
    loaded = document_pipeline.cache_info().currsize > 0
    if loaded:
        return document_pipeline().model_status()
    return [
        {
            "name": name,
            "loaded": False,
            "path": str(path),
            "error": None if path.exists() else "missing",
            "temperature": None,
            "classes": classes_by_name.get(name, []),
            "tta": INFERENCE_TTA,
            "device": "not_loaded",
        }
        for name, path in MODEL_FILES.items()
    ]
