import clip, torch
import torch.nn.functional as F
from app.models.clip_model import DEVICE, model


def build_prompt_variants(text):
    cleaned = text.strip()
    return [
        cleaned,
        f"a photo of {cleaned}",
        f"a video frame showing {cleaned}",
        f"a surveillance camera frame showing {cleaned}",
    ]


def text_to_embedding(text):
    if not text or not text.strip():
        raise ValueError("Input text must be non-empty.")

    prompts = build_prompt_variants(text)
    tokens = clip.tokenize(prompts).to(DEVICE)
    with torch.no_grad():
        embedding = model.encode_text(tokens)
        embedding = embedding.mean(dim=0, keepdim=True)
        embedding = F.normalize(embedding, dim=-1)
    return embedding.cpu().numpy()
