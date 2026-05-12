from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
MODEL_PATH = ROOT_DIR / "models" / "best_yolov8_danger.pt"


def model_status():
    return {
        "name": "weapon_detection",
        "model_path": str(MODEL_PATH),
        "exists": MODEL_PATH.exists(),
        "size_bytes": MODEL_PATH.stat().st_size if MODEL_PATH.exists() else 0,
        "loaded": False,
    }


class WeaponDetector:
    def __init__(self, model_path: Path | None = None):
        self.model_path = Path(model_path or MODEL_PATH)
        if not self.model_path.exists():
            raise FileNotFoundError(f"Missing weapon detection checkpoint: {self.model_path}")
        from ultralytics import YOLO

        self.model = YOLO(str(self.model_path))

    def detect(self, image_path: Path, confidence: float = 0.25):
        results = self.model.predict(str(image_path), conf=confidence, verbose=False)
        detections = []
        for result in results:
            names = result.names
            for box in result.boxes:
                cls = int(box.cls[0])
                detections.append(
                    {
                        "label": names.get(cls, str(cls)),
                        "confidence": round(float(box.conf[0]), 6),
                        "box_xyxy": [round(float(value), 2) for value in box.xyxy[0].tolist()],
                    }
                )
        return {
            "file": Path(image_path).name,
            "model": "weapon_detection",
            "detections": detections,
        }

