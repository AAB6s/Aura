from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
MODEL_PATH = ROOT_DIR / "models" / "yolov8n_face_detector.pt"
LABELS = ["face"]


def model_status(loaded: bool = False):
    return {
        "name": "face_detection",
        "model_path": str(MODEL_PATH),
        "exists": MODEL_PATH.exists(),
        "size_bytes": MODEL_PATH.stat().st_size if MODEL_PATH.exists() else 0,
        "loaded": loaded,
        "input_type": "image",
        "classes": LABELS,
    }


class FaceDetector:
    def __init__(self, model_path: Path | None = None):
        self.model_path = Path(model_path or MODEL_PATH)
        if not self.model_path.exists():
            raise FileNotFoundError(f"Missing face detection checkpoint: {self.model_path}")
        from ultralytics import YOLO

        self.model = YOLO(str(self.model_path))

    def detect(self, image_path: Path, confidence: float = 0.25):
        from PIL import Image, ImageOps

        image = ImageOps.exif_transpose(Image.open(image_path)).convert("RGB")
        original_size = list(image.size)
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
            "model": "face_detection",
            "detections": detections,
            "original_size": original_size,
        }
