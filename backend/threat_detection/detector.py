from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
MODEL_PATH = ROOT_DIR / "models" / "best_r2plus1d18.pt"
LABELS = ["no_threat", "threat"]
DEFAULT_CLIP_FRAMES = 16
INPUT_SIZE = [112, 112]


def model_status(loaded: bool = False):
    return {
        "name": "threat_detection",
        "model_path": str(MODEL_PATH),
        "exists": MODEL_PATH.exists(),
        "size_bytes": MODEL_PATH.stat().st_size if MODEL_PATH.exists() else 0,
        "loaded": loaded,
        "input_type": "video",
        "clip_frames": DEFAULT_CLIP_FRAMES,
        "input_size": INPUT_SIZE,
        "classes": LABELS,
    }


class ThreatDetector:
    def __init__(self, model_path: Path | None = None, device: str | None = None):
        import os
        from collections import OrderedDict

        import torch
        import torch.nn as nn
        from torchvision.models.video import r2plus1d_18

        self.torch = torch
        self.model_path = Path(model_path or MODEL_PATH)
        if not self.model_path.exists():
            raise FileNotFoundError(f"Missing threat detection checkpoint: {self.model_path}")
        requested_device = device or os.getenv("THREAT_DEVICE") or os.getenv("APP_DEVICE", "auto")
        if requested_device == "cuda" and not torch.cuda.is_available():
            requested_device = "cpu"
        if requested_device == "auto":
            requested_device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(requested_device)
        try:
            state = torch.load(self.model_path, map_location="cpu", weights_only=True)
        except RuntimeError as exc:
            if "TorchScript" not in str(exc):
                raise
            state = torch.load(self.model_path, map_location="cpu", weights_only=False)
        if hasattr(state, "state_dict"):
            state = state.state_dict()
        state = OrderedDict((key.removeprefix("model."), value) for key, value in state.items())
        self.model = r2plus1d_18(weights=None)
        self.model.fc = nn.Linear(self.model.fc.in_features, 1)
        self.model.load_state_dict(state, strict=True)
        self.model.to(self.device).eval()

    def _read_video(self, media_path: Path, clip_frames: int):
        import cv2
        import numpy as np
        from PIL import Image, ImageOps

        capture = cv2.VideoCapture(str(media_path))
        if capture.isOpened():
            frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
            indices = np.linspace(0, max(frame_count - 1, 0), clip_frames, dtype=int) if frame_count > 0 else None
            frames = []
            if indices is not None:
                for index in indices:
                    capture.set(cv2.CAP_PROP_POS_FRAMES, int(index))
                    ok, frame = capture.read()
                    if ok and frame is not None:
                        frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if len(frames) < clip_frames:
                capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                fallback = []
                while True:
                    ok, frame = capture.read()
                    if not ok or frame is None:
                        break
                    fallback.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                if fallback:
                    pick = np.linspace(0, len(fallback) - 1, clip_frames, dtype=int)
                    frames = [fallback[int(index)] for index in pick]
            capture.release()
            if frames:
                duration = round(frame_count / fps, 3) if fps > 0 and frame_count > 0 else None
                return frames, {
                    "media_type": "video",
                    "frame_count": frame_count or len(frames),
                    "fps": round(fps, 3) if fps > 0 else None,
                    "duration_seconds": duration,
                    "sampled_frames": len(frames),
                }
        image = ImageOps.exif_transpose(Image.open(media_path)).convert("RGB")
        frame = np.asarray(image)
        return [frame for _ in range(clip_frames)], {
            "media_type": "image",
            "frame_count": 1,
            "fps": None,
            "duration_seconds": None,
            "sampled_frames": clip_frames,
        }

    def _tensor(self, frames):
        import cv2
        import numpy as np

        resized = [cv2.resize(frame, tuple(INPUT_SIZE), interpolation=cv2.INTER_AREA) for frame in frames]
        array = np.stack(resized).astype("float32") / 255.0
        tensor = self.torch.from_numpy(array).permute(3, 0, 1, 2)
        mean = self.torch.tensor([0.43216, 0.394666, 0.37645]).view(3, 1, 1, 1)
        std = self.torch.tensor([0.22803, 0.22145, 0.216989]).view(3, 1, 1, 1)
        return ((tensor - mean) / std).unsqueeze(0).to(self.device)

    def detect(self, media_path: Path, threshold: float = 0.5, clip_frames: int = DEFAULT_CLIP_FRAMES):
        clip_frames = max(1, int(clip_frames or DEFAULT_CLIP_FRAMES))
        threshold = min(max(float(threshold), 0.0), 1.0)
        frames, metadata = self._read_video(media_path, clip_frames)
        x = self._tensor(frames)
        with self.torch.inference_mode():
            logit = self.model(x).flatten()[0]
            threat_score = float(self.torch.sigmoid(logit).detach().cpu())
        label = "threat" if threat_score >= threshold else "no_threat"
        selected_score = threat_score if label == "threat" else 1.0 - threat_score
        return {
            "file": Path(media_path).name,
            "model": "threat_detection",
            "label": label,
            "threat_detected": label == "threat",
            "confidence": round(selected_score, 6),
            "threshold": threshold,
            "scores": {
                "no_threat": round(1.0 - threat_score, 6),
                "threat": round(threat_score, 6),
            },
            "video": metadata,
            "input": {
                "clip_frames": clip_frames,
                "input_size": INPUT_SIZE,
            },
        }
