from collections import OrderedDict
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
MODEL_PATH = ROOT_DIR / "models" / "clip_image_authenticity_detector.pth"
LABELS = ["REAL", "AI_GENERATED_OR_FAKE"]
POSITIVE_CLASS = "AI_GENERATED_OR_FAKE"
THRESHOLD = 0.5
INPUT_SIZE = [224, 224]


def model_status(loaded: bool = False):
    return {
        "name": "image_authenticity_detection",
        "model_path": str(MODEL_PATH),
        "exists": MODEL_PATH.exists(),
        "size_bytes": MODEL_PATH.stat().st_size if MODEL_PATH.exists() else 0,
        "loaded": loaded,
        "input_type": "image",
        "input_size": INPUT_SIZE,
        "classes": LABELS,
        "positive_class": POSITIVE_CLASS,
        "threshold": THRESHOLD,
    }


class ImageAuthenticityDetector:
    def __init__(self, model_path: Path | None = None, device: str | None = None):
        import os

        import torch
        import torch.nn as nn
        from transformers import CLIPConfig, CLIPModel

        self.torch = torch
        self.model_path = Path(model_path or MODEL_PATH)
        if not self.model_path.exists():
            raise FileNotFoundError(f"Missing image authenticity checkpoint: {self.model_path}")
        requested_device = device or os.getenv("IMAGE_AUTH_DEVICE") or os.getenv("APP_DEVICE", "auto")
        if requested_device == "cuda" and not torch.cuda.is_available():
            requested_device = "cpu"
        if requested_device == "auto":
            requested_device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(requested_device)
        checkpoint = torch.load(self.model_path, map_location="cpu", weights_only=False)
        state = checkpoint.get("state_dict", checkpoint)
        clip_state = OrderedDict(
            (key.removeprefix("clip."), value) for key, value in state.items() if key.startswith("clip.")
        )
        head_state = OrderedDict(
            (key.removeprefix("head."), value) for key, value in state.items() if key.startswith("head.")
        )
        self.clip = CLIPModel(CLIPConfig())
        self.clip.load_state_dict(clip_state, strict=True)
        self.head = nn.Sequential(
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 1),
        )
        self.head.load_state_dict(head_state, strict=True)
        self.clip.to(self.device).eval()
        self.head.to(self.device).eval()

    def _pixel_values(self, image_path: Path):
        import numpy as np
        from PIL import Image, ImageOps

        image = ImageOps.exif_transpose(Image.open(image_path)).convert("RGB")
        original_size = list(image.size)
        image = image.resize(tuple(INPUT_SIZE), Image.Resampling.BICUBIC)
        array = np.asarray(image).astype("float32") / 255.0
        tensor = self.torch.from_numpy(array).permute(2, 0, 1)
        mean = self.torch.tensor([0.48145466, 0.4578275, 0.40821073]).view(3, 1, 1)
        std = self.torch.tensor([0.26862954, 0.26130258, 0.27577711]).view(3, 1, 1)
        return ((tensor - mean) / std).unsqueeze(0).to(self.device), original_size

    def detect(self, image_path: Path, threshold: float = THRESHOLD):
        threshold = min(max(float(threshold), 0.0), 1.0)
        pixel_values, original_size = self._pixel_values(image_path)
        with self.torch.inference_mode():
            vision_output = self.clip.vision_model(pixel_values=pixel_values)
            features = self.clip.visual_projection(vision_output.pooler_output)
            logit = self.head(features).flatten()[0]
            fake_score = float(self.torch.sigmoid(logit).detach().cpu())
        scores = {
            "REAL": round(1.0 - fake_score, 6),
            "AI_GENERATED_OR_FAKE": round(fake_score, 6),
        }
        label = POSITIVE_CLASS if fake_score >= threshold else "REAL"
        confidence = scores[label]
        return {
            "file": Path(image_path).name,
            "model": "image_authenticity_detection",
            "label": label,
            "ai_generated": label == POSITIVE_CLASS,
            "confidence": confidence,
            "threshold": threshold,
            "scores": scores,
            "original_size": original_size,
            "input_size": INPUT_SIZE,
        }
