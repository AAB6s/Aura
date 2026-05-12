from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
MODEL_PATH = ROOT_DIR / "models" / "roberta_text_authenticity_detector.pt"
LABELS = ["HUMAN", "AI_GENERATED"]
POSITIVE_CLASS = "AI_GENERATED"
THRESHOLD = 0.5
MAX_LENGTH = 256


def model_status(loaded: bool = False):
    return {
        "name": "text_authenticity_detection",
        "model_path": str(MODEL_PATH),
        "exists": MODEL_PATH.exists(),
        "size_bytes": MODEL_PATH.stat().st_size if MODEL_PATH.exists() else 0,
        "loaded": loaded,
        "input_type": "text",
        "classes": LABELS,
        "positive_class": POSITIVE_CLASS,
        "threshold": THRESHOLD,
        "max_length": MAX_LENGTH,
    }


class TextAuthenticityDetector:
    def __init__(self, model_path: Path | None = None, device: str | None = None):
        import os

        import torch
        from transformers import AutoTokenizer, RobertaConfig, RobertaForSequenceClassification

        self.torch = torch
        self.model_path = Path(model_path or MODEL_PATH)
        if not self.model_path.exists():
            raise FileNotFoundError(f"Missing text authenticity checkpoint: {self.model_path}")
        requested_device = device or os.getenv("TEXT_AUTH_DEVICE") or os.getenv("APP_DEVICE", "auto")
        if requested_device == "cuda" and not torch.cuda.is_available():
            requested_device = "cpu"
        if requested_device == "auto":
            requested_device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(requested_device)
        checkpoint = torch.load(self.model_path, map_location="cpu", weights_only=False)
        config = RobertaConfig(
            num_labels=2,
            type_vocab_size=1,
            max_position_embeddings=514,
            id2label={0: LABELS[0], 1: LABELS[1]},
            label2id={LABELS[0]: 0, LABELS[1]: 1},
        )
        self.model = RobertaForSequenceClassification(config)
        self.model.load_state_dict(checkpoint["state_dict"], strict=True)
        tokenizer_name = os.getenv("TEXT_AUTH_TOKENIZER", "roberta-base")
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(tokenizer_name, local_files_only=True)
        except Exception:
            self.tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
        self.model.to(self.device).eval()

    def detect(self, text: str, threshold: float = THRESHOLD):
        threshold = min(max(float(threshold), 0.0), 1.0)
        text = text or ""
        tokens = self.tokenizer(
            text,
            truncation=True,
            padding=True,
            max_length=MAX_LENGTH,
            return_tensors="pt",
        )
        tokens = {key: value.to(self.device) for key, value in tokens.items()}
        with self.torch.inference_mode():
            logits = self.model(**tokens).logits[0]
            probabilities = self.torch.softmax(logits, dim=0).detach().cpu().tolist()
        index = int(max(range(len(probabilities)), key=probabilities.__getitem__))
        ai_score = float(probabilities[1])
        label = POSITIVE_CLASS if ai_score >= threshold else "HUMAN"
        selected_index = LABELS.index(label)
        return {
            "model": "text_authenticity_detection",
            "label": label,
            "ai_generated": label == POSITIVE_CLASS,
            "confidence": round(float(probabilities[selected_index]), 6),
            "threshold": threshold,
            "scores": {name: round(float(score), 6) for name, score in zip(LABELS, probabilities)},
            "input": {
                "characters": len(text),
                "max_length": MAX_LENGTH,
            },
        }
