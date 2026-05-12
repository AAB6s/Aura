from functools import lru_cache

from backend.propagation_prediction.detector import PropagationPredictor, model_status


@lru_cache(maxsize=1)
def propagation_predictor() -> PropagationPredictor:
    return PropagationPredictor()


def propagation_status():
    return model_status(loaded=propagation_predictor.cache_info().currsize > 0)


def predict_propagation(features: dict[str, float], positions: list[int] | None = None):
    return propagation_predictor().predict(features, positions=positions)
