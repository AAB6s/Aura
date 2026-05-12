from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
MODEL_DIR = ROOT_DIR / "models"
REGRESSOR_PATH = MODEL_DIR / "heartbeat_regressor.joblib"
CALIBRATED_CLASSIFIER_PATH = MODEL_DIR / "heartbeat_calibrated_classifier.joblib"
RANDOM_FOREST_PATH = MODEL_DIR / "heartbeat_random_forest.joblib"
SCALER_PATH = MODEL_DIR / "heartbeat_scaler.joblib"
TRANSFORMER_METADATA_PATH = MODEL_DIR / "heartbeat_transformer_metadata.pt"
TRANSFORMER_TORCHSCRIPT_PATH = MODEL_DIR / "heartbeat_transformer_torchscript.pt"

BASE_FEATURES = [f"hrv_{index:02d}" for index in range(1, 36)]
AUXILIARY_FEATURES = [f"aux_{index:02d}" for index in range(1, 13)]
FEATURE_COLUMNS = BASE_FEATURES + AUXILIARY_FEATURES
SEQUENCE_LENGTH = 256
CLASS_NAMES = {
    0: "Calm / No stress signal",
    1: "Elevated / Monitor situation",
    2: "Danger signal / Acute stress",
}


def model_status(loaded: bool = False):
    files = {
        "regressor": REGRESSOR_PATH,
        "calibrated_classifier": CALIBRATED_CLASSIFIER_PATH,
        "random_forest": RANDOM_FOREST_PATH,
        "scaler": SCALER_PATH,
        "transformer_metadata": TRANSFORMER_METADATA_PATH,
        "transformer_torchscript": TRANSFORMER_TORCHSCRIPT_PATH,
    }
    return {
        "name": "biometric_heartbeat_detection",
        "exists": all(path.exists() for path in files.values()),
        "loaded": loaded,
        "input_type": "structured",
        "base_feature_count": len(BASE_FEATURES),
        "auxiliary_feature_count": len(AUXILIARY_FEATURES),
        "feature_columns": FEATURE_COLUMNS,
        "sequence_length": SEQUENCE_LENGTH,
        "classes": [CLASS_NAMES[index] for index in sorted(CLASS_NAMES)],
        "files": {
            name: {
                "path": str(path),
                "exists": path.exists(),
                "size_bytes": path.stat().st_size if path.exists() else 0,
            }
            for name, path in files.items()
        },
    }


class HeartbeatDetector:
    def __init__(self, device: str | None = None):
        import os
        import warnings

        import joblib
        import torch

        for path in [
            REGRESSOR_PATH,
            CALIBRATED_CLASSIFIER_PATH,
            RANDOM_FOREST_PATH,
            SCALER_PATH,
            TRANSFORMER_METADATA_PATH,
            TRANSFORMER_TORCHSCRIPT_PATH,
        ]:
            if not path.exists():
                raise FileNotFoundError(f"Missing heartbeat artifact: {path}")

        requested_device = device or os.getenv("HEARTBEAT_DEVICE") or os.getenv("APP_DEVICE", "auto")
        if requested_device == "cuda" and not torch.cuda.is_available():
            requested_device = "cpu"
        if requested_device == "auto":
            requested_device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch = torch
        self.device = torch.device(requested_device)

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self.regressor = joblib.load(REGRESSOR_PATH)
            self.calibrated_classifier = joblib.load(CALIBRATED_CLASSIFIER_PATH)
            self.random_forest = joblib.load(RANDOM_FOREST_PATH)
            self.scaler = joblib.load(SCALER_PATH)
            metadata = torch.load(TRANSFORMER_METADATA_PATH, map_location="cpu", weights_only=False)
        self.class_names = {
            int(key): value for key, value in metadata.get("class_names", CLASS_NAMES).items()
        }
        self.sequence_length = int(metadata.get("seq_len", SEQUENCE_LENGTH))
        self.sequence_model = torch.jit.load(str(TRANSFORMER_TORCHSCRIPT_PATH), map_location=self.device)
        self.sequence_model.eval()

    def _feature_vector(self, features: dict[str, float]):
        import numpy as np

        base = np.asarray(
            [[float(features.get(column, 0.0)) for column in BASE_FEATURES]],
            dtype="float32",
        )
        auxiliary = np.asarray(
            [[float(features.get(column, 0.0)) for column in AUXILIARY_FEATURES]],
            dtype="float32",
        )
        scaled_base = self.scaler.transform(base).astype("float32")
        return np.concatenate([scaled_base, auxiliary], axis=1)

    def _sequence_tensor(self, signal: list[float] | None):
        import numpy as np

        values = np.asarray(signal or [0.0], dtype="float32").flatten()
        if values.size == 0:
            values = np.zeros(1, dtype="float32")
        if values.size != self.sequence_length:
            source = np.linspace(0.0, 1.0, values.size)
            target = np.linspace(0.0, 1.0, self.sequence_length)
            values = np.interp(target, source, values).astype("float32")
        mean = float(values.mean())
        std = float(values.std())
        normalized = values - mean if std < 1e-6 else (values - mean) / std
        tensor = self.torch.from_numpy(normalized.reshape(1, self.sequence_length, 1))
        return tensor.to(self.device)

    def predict(self, features: dict[str, float], signal: list[float] | None = None):
        x = self._feature_vector(features or {})
        calibrated_probabilities = self.calibrated_classifier.predict_proba(x)[0]
        random_forest_probabilities = self.random_forest.predict_proba(x)[0]
        calibrated_label_index = int(self.calibrated_classifier.predict(x)[0])
        regression_score = float(self.regressor.predict(x)[0])

        with self.torch.inference_mode():
            logits = self.sequence_model(self._sequence_tensor(signal))
            sequence_probabilities = self.torch.softmax(logits, dim=1)[0].detach().cpu().tolist()

        sequence_label_index = int(max(range(len(sequence_probabilities)), key=sequence_probabilities.__getitem__))
        class_scores = {
            self.class_names.get(int(label), f"class_{label}"): round(float(score), 6)
            for label, score in zip(self.calibrated_classifier.classes_, calibrated_probabilities)
        }
        rf_scores = {
            self.class_names.get(int(label), f"class_{label}"): round(float(score), 6)
            for label, score in zip(self.random_forest.classes_, random_forest_probabilities)
        }
        sequence_scores = {
            self.class_names.get(index, f"class_{index}"): round(float(score), 6)
            for index, score in enumerate(sequence_probabilities)
        }
        label = self.class_names.get(calibrated_label_index, f"class_{calibrated_label_index}")
        class_list = list(self.calibrated_classifier.classes_)
        confidence = float(calibrated_probabilities[class_list.index(calibrated_label_index)])

        return {
            "model": "biometric_heartbeat_detection",
            "label": label,
            "class_index": calibrated_label_index,
            "confidence": round(confidence, 6),
            "stress_score": round(regression_score, 6),
            "scores": class_scores,
            "random_forest_scores": rf_scores,
            "sequence": {
                "label": self.class_names.get(sequence_label_index, f"class_{sequence_label_index}"),
                "class_index": sequence_label_index,
                "confidence": round(float(sequence_probabilities[sequence_label_index]), 6),
                "scores": sequence_scores,
                "input_length": self.sequence_length,
            },
            "input": {
                "base_feature_count": len(BASE_FEATURES),
                "auxiliary_feature_count": len(AUXILIARY_FEATURES),
                "sequence_length": self.sequence_length,
                "feature_columns": FEATURE_COLUMNS,
            },
        }
