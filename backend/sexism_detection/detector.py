from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
MODEL_PATH = ROOT_DIR / "models" / "SexistMemeDetector.pt"
LABELS = ["not_sexist", "sexist"]


def model_status(loaded: bool = False):
    return {
        "name": "sexism_detection",
        "model_path": str(MODEL_PATH),
        "exists": MODEL_PATH.exists(),
        "size_bytes": MODEL_PATH.stat().st_size if MODEL_PATH.exists() else 0,
        "loaded": loaded,
        "input_size": [640, 640],
        "classes": LABELS,
    }


class SexismDetector:
    def __init__(self, model_path: Path | None = None, device: str | None = None):
        import os
        from collections import OrderedDict

        import torch
        import torch.nn as nn
        from transformers import CLIPConfig, CLIPModel

        self.torch = torch
        self.model_path = Path(model_path or MODEL_PATH)
        if not self.model_path.exists():
            raise FileNotFoundError(f"Missing sexism detection checkpoint: {self.model_path}")
        requested_device = device or os.getenv("SEXISM_DEVICE") or os.getenv("APP_DEVICE", "auto")
        if requested_device == "cuda" and not torch.cuda.is_available():
            requested_device = "cpu"
        if requested_device == "auto":
            requested_device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(requested_device)
        state = torch.load(self.model_path, map_location="cpu", weights_only=True)
        clip_state = OrderedDict((key.removeprefix("clip."), value) for key, value in state.items() if key.startswith("clip."))
        classifier_state = OrderedDict((key.removeprefix("classifier."), value) for key, value in state.items() if key.startswith("classifier."))
        self.clip = CLIPModel(CLIPConfig())
        self.clip.load_state_dict(clip_state, strict=True)
        self.classifier = nn.Sequential(
            nn.Linear(1024, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 2),
        )
        missing, unexpected = self.classifier.load_state_dict(classifier_state, strict=False)
        allowed_missing = {"1.running_mean", "1.running_var"}
        if set(missing) - allowed_missing or unexpected:
            raise RuntimeError(f"Unexpected classifier checkpoint keys. missing={missing}, unexpected={unexpected}")
        self.clip.to(self.device).eval()
        self.classifier.to(self.device).eval()
        self.input_ids = torch.tensor([[49406, 49407] + [49407] * 75], dtype=torch.long, device=self.device)
        self.attention_mask = torch.tensor([[1, 1] + [0] * 75], dtype=torch.long, device=self.device)

    def _pixel_values(self, image_path: Path):
        import numpy as np
        from PIL import Image, ImageOps

        image = ImageOps.exif_transpose(Image.open(image_path)).convert("RGB")
        original_size = list(image.size)
        image = image.resize((640, 640), Image.Resampling.BICUBIC).resize((224, 224), Image.Resampling.BICUBIC)
        array = np.asarray(image).astype("float32") / 255.0
        tensor = self.torch.from_numpy(array).permute(2, 0, 1)
        mean = self.torch.tensor([0.48145466, 0.4578275, 0.40821073]).view(3, 1, 1)
        std = self.torch.tensor([0.26862954, 0.26130258, 0.27577711]).view(3, 1, 1)
        pixel_values = ((tensor - mean) / std).unsqueeze(0).to(self.device)
        return pixel_values, original_size

    def detect(self, image_path: Path):
        pixel_values, original_size = self._pixel_values(image_path)
        with self.torch.inference_mode():
            output = self.clip(input_ids=self.input_ids, attention_mask=self.attention_mask, pixel_values=pixel_values)
            features = self.torch.cat([output.image_embeds, output.text_embeds], dim=1)
            logits = self.classifier(features)
            probabilities = self.torch.softmax(logits, dim=1)[0].detach().cpu().tolist()
        index = int(max(range(len(probabilities)), key=probabilities.__getitem__))
        label = LABELS[index]
        return {
            "file": Path(image_path).name,
            "model": "sexism_detection",
            "label": label,
            "sexism_detected": label == "sexist",
            "confidence": round(float(probabilities[index]), 6),
            "scores": {name: round(float(score), 6) for name, score in zip(LABELS, probabilities)},
            "original_size": original_size,
            "input_size": [640, 640],
        }

