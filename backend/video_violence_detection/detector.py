from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
MODEL_PATH = ROOT_DIR / "models" / "videoswin_t_violence_detector.pth"
LABELS = ["noFight", "fight"]
DEFAULT_NUM_FRAMES = 32
INPUT_SIZE = [224, 224]


def model_status(loaded: bool = False):
    return {
        "name": "video_violence_detection",
        "model_path": str(MODEL_PATH),
        "exists": MODEL_PATH.exists(),
        "size_bytes": MODEL_PATH.stat().st_size if MODEL_PATH.exists() else 0,
        "loaded": loaded,
        "input_type": "video",
        "classes": LABELS,
        "num_frames": DEFAULT_NUM_FRAMES,
        "input_size": INPUT_SIZE,
    }


def _build_model(labels: list[str], dropout: float, fc_dropout: float):
    import torch.nn as nn
    from torchvision.models.video import swin3d_t

    class VideoSwinModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.backbone = swin3d_t(weights=None)
            in_features = (
                self.backbone.head[-1].in_features
                if isinstance(self.backbone.head, nn.Sequential)
                else self.backbone.head.in_features
            )
            self.head = nn.Sequential(
                nn.Dropout(fc_dropout),
                nn.Linear(in_features, 256),
                nn.LayerNorm(256),
                nn.GELU(),
                nn.Dropout(dropout),
                nn.Linear(256, len(labels)),
            )
            self.backbone.head = self.head

        def forward(self, x):
            return self.backbone(x)

    return VideoSwinModel()


class VideoSwinViolenceDetector:
    def __init__(self, model_path: Path | None = None, device: str | None = None):
        import os

        import torch

        self.torch = torch
        self.model_path = Path(model_path or MODEL_PATH)
        if not self.model_path.exists():
            raise FileNotFoundError(f"Missing video violence checkpoint: {self.model_path}")
        requested_device = device or os.getenv("VIDEO_VIOLENCE_DEVICE") or os.getenv("APP_DEVICE", "auto")
        if requested_device == "cuda" and not torch.cuda.is_available():
            requested_device = "cpu"
        if requested_device == "auto":
            requested_device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(requested_device)

        checkpoint = torch.load(self.model_path, map_location="cpu", weights_only=False)
        cfg = checkpoint.get("cfg", {}) if isinstance(checkpoint, dict) else {}
        state = checkpoint.get("model_state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint
        labels = cfg.get("classes") or LABELS
        self.labels = [str(label) for label in labels]
        model = _build_model(
            self.labels,
            dropout=float(cfg.get("dropout", 0.3)),
            fc_dropout=float(cfg.get("fc_dropout", 0.5)),
        )
        model.load_state_dict(state, strict=True)
        self.model = model.to(self.device).eval()
        classes_lower = [label.lower() for label in self.labels]
        self.positive_index = classes_lower.index("fight") if "fight" in classes_lower else min(1, len(self.labels) - 1)

    def _read_frames(self, video_path: Path, num_frames: int):
        import cv2
        import numpy as np
        from PIL import Image, ImageOps

        capture = cv2.VideoCapture(str(video_path))
        if capture.isOpened():
            frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
            frames = []
            if frame_count > 0:
                for index in np.linspace(0, frame_count - 1, num_frames, dtype=int):
                    capture.set(cv2.CAP_PROP_POS_FRAMES, int(index))
                    ok, frame = capture.read()
                    if ok and frame is not None:
                        frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if len(frames) < num_frames:
                capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                fallback = []
                while True:
                    ok, frame = capture.read()
                    if not ok or frame is None:
                        break
                    fallback.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                if fallback:
                    pick = np.linspace(0, len(fallback) - 1, num_frames, dtype=int)
                    frames = [fallback[int(index)] for index in pick]
            capture.release()
            if frames:
                return frames, {
                    "media_type": "video",
                    "frame_count": frame_count or len(frames),
                    "fps": round(fps, 3) if fps > 0 else None,
                    "duration_seconds": round(frame_count / fps, 3) if fps > 0 and frame_count > 0 else None,
                    "sampled_frames": len(frames),
                }
        image = ImageOps.exif_transpose(Image.open(video_path)).convert("RGB")
        frame = np.asarray(image)
        return [frame for _ in range(num_frames)], {
            "media_type": "image",
            "frame_count": 1,
            "fps": None,
            "duration_seconds": None,
            "sampled_frames": num_frames,
        }

    def _tensor(self, frames):
        import cv2
        import numpy as np

        resized = [cv2.resize(frame, tuple(INPUT_SIZE), interpolation=cv2.INTER_LINEAR) for frame in frames]
        array = np.stack(resized).astype("float32") / 255.0
        tensor = self.torch.from_numpy(array).permute(3, 0, 1, 2)
        mean = self.torch.tensor([0.45, 0.45, 0.45]).view(3, 1, 1, 1)
        std = self.torch.tensor([0.225, 0.225, 0.225]).view(3, 1, 1, 1)
        return ((tensor - mean) / std).unsqueeze(0).to(self.device)

    def detect(
        self,
        media_path: Path,
        threshold: float = 0.6,
        num_frames: int = DEFAULT_NUM_FRAMES,
    ):
        num_frames = max(4, min(int(num_frames or DEFAULT_NUM_FRAMES), 64))
        threshold = min(max(float(threshold), 0.0), 1.0)
        frames, metadata = self._read_frames(media_path, num_frames)
        x = self._tensor(frames)
        with self.torch.inference_mode():
            probabilities = self.torch.softmax(self.model(x), dim=1)[0].detach().cpu().tolist()
        violence_score = float(probabilities[self.positive_index])
        positive_label = self.labels[self.positive_index]
        label = positive_label if violence_score >= threshold else self.labels[0]
        confidence = violence_score if label == positive_label else 1.0 - violence_score
        return {
            "file": Path(media_path).name,
            "model": "video_violence_detection",
            "label": label,
            "violence_detected": label == positive_label,
            "confidence": round(float(confidence), 6),
            "threshold": threshold,
            "scores": {
                label_name: round(float(score), 6)
                for label_name, score in zip(self.labels, probabilities)
            },
            "video": metadata,
            "input": {
                "num_frames": num_frames,
                "input_size": INPUT_SIZE,
            },
        }
