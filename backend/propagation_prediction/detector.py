from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
MODEL_DIR = ROOT_DIR / "models"
BUNDLE_PATH = MODEL_DIR / "propagation_bundle.pt"
TRANSFORMER_PATH = MODEL_DIR / "propagation_transformer.keras"
FEATURE_COLUMNS = [
    "src_score",
    "deepfake_score",
    "violence_score",
    "manip_risk",
    "social_risk",
    "law_score",
    "digital_pen",
    "is_sexual",
    "is_minor",
    "is_public",
    "is_organized",
    "hour_posted",
    "day_of_week",
]
SEQUENCE_LENGTH = 8


def model_status(loaded: bool = False):
    return {
        "name": "propagation_prediction",
        "bundle_path": str(BUNDLE_PATH),
        "transformer_path": str(TRANSFORMER_PATH),
        "exists": BUNDLE_PATH.exists() and TRANSFORMER_PATH.exists(),
        "bundle_size_bytes": BUNDLE_PATH.stat().st_size if BUNDLE_PATH.exists() else 0,
        "transformer_size_bytes": TRANSFORMER_PATH.stat().st_size if TRANSFORMER_PATH.exists() else 0,
        "loaded": loaded,
        "input_type": "structured",
        "feature_columns": FEATURE_COLUMNS,
        "sequence_length": SEQUENCE_LENGTH,
        "outputs": ["virality_score", "virality_class", "propagation_curve"],
    }


class PropagationPredictor:
    def __init__(self, bundle_path: Path | None = None, transformer_path: Path | None = None):
        import pickle
        import warnings

        import torch

        self.bundle_path = Path(bundle_path or BUNDLE_PATH)
        self.transformer_path = Path(transformer_path or TRANSFORMER_PATH)
        if not self.bundle_path.exists():
            raise FileNotFoundError(f"Missing propagation bundle: {self.bundle_path}")
        if not self.transformer_path.exists():
            raise FileNotFoundError(f"Missing propagation transformer: {self.transformer_path}")
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            bundle = torch.load(self.bundle_path, map_location="cpu", weights_only=False)
            self.scaler = pickle.loads(bundle["preprocessing"]["scaler_pickle"])
            self.regressor = pickle.loads(bundle["models"]["xgb_regressor_pickle"])
            self.classifier = pickle.loads(bundle["models"]["xgb_classifier_pickle"])
        for model in (self.regressor, self.classifier):
            if hasattr(model, "set_params"):
                try:
                    model.set_params(device="cpu")
                except Exception:
                    pass
        self.metrics = bundle.get("metrics", {})
        self.transformer = None
        self.transformer_error = None
        try:
            try:
                import keras

                self.transformer = keras.saving.load_model(self.transformer_path, compile=False)
            except ImportError:
                import tensorflow as tf

                self.transformer = tf.keras.models.load_model(self.transformer_path, compile=False)
        except Exception as exc:
            self.transformer_error = str(exc)

    def _features(self, features: dict[str, float]):
        import numpy as np

        values = [float(features.get(column, 0.0)) for column in FEATURE_COLUMNS]
        raw = np.asarray([values], dtype="float32")
        scaled = self.scaler.transform(raw).astype("float32")
        return raw, scaled

    def predict(self, features: dict[str, float], positions: list[int] | None = None):
        import numpy as np

        raw, scaled = self._features(features or {})
        virality_score = float(self.regressor.predict(scaled)[0])
        class_probabilities = self.classifier.predict_proba(scaled)[0]
        classes = [int(value) for value in self.classifier.classes_]
        best_index = int(np.argmax(class_probabilities))
        class_scores = {
            f"class_{class_id}": round(float(score), 6)
            for class_id, score in zip(classes, class_probabilities)
        }
        transformer = {
            "status": "unavailable",
            "error": self.transformer_error,
            "propagation_curve": [],
        }
        if self.transformer is not None:
            if positions is None:
                positions = list(range(SEQUENCE_LENGTH))
            positions = [int(value) for value in positions[:SEQUENCE_LENGTH]]
            while len(positions) < SEQUENCE_LENGTH:
                positions.append(len(positions))
            curve = self.transformer.predict(
                {
                    "features_input": scaled,
                    "pos_input": np.asarray([positions], dtype="int32"),
                },
                verbose=0,
            )[0]
            transformer = {
                "status": "ready",
                "error": None,
                "propagation_curve": [round(float(value), 6) for value in curve.tolist()],
            }
        return {
            "model": "propagation_prediction",
            "virality_score": round(virality_score, 6),
            "virality_class": f"class_{classes[best_index]}",
            "virality_class_confidence": round(float(class_probabilities[best_index]), 6),
            "class_scores": class_scores,
            "transformer": transformer,
            "input": {
                "features": {
                    column: round(float(value), 6)
                    for column, value in zip(FEATURE_COLUMNS, raw[0].tolist())
                },
                "feature_columns": FEATURE_COLUMNS,
                "sequence_length": SEQUENCE_LENGTH,
            },
            "metrics": self.metrics,
        }
