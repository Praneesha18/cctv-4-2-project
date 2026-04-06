import clip
import torch
import torch.nn.functional as F

from app.models.clip_model import DEVICE, model


def build_prompt_variants(text):
    cleaned = text.strip().lower()
    prompts = [
        cleaned,
        f"a photo of {cleaned}",
        f"an image of {cleaned}",
        f"a video frame showing {cleaned}",
        f"a CCTV frame showing {cleaned}",
        f"security camera footage of {cleaned}",
    ]
    return list(dict.fromkeys(prompt for prompt in prompts if prompt.strip()))


def build_prompt_weights(cleaned, prompts):
    weight_map = {
        cleaned: 0.30,
        f"a photo of {cleaned}": 0.18,
        f"an image of {cleaned}": 0.16,
        f"a video frame showing {cleaned}": 0.16,
        f"a CCTV frame showing {cleaned}": 0.12,
        f"security camera footage of {cleaned}": 0.08,
    }

    weights = [weight_map.get(prompt, 0.05) for prompt in prompts]
    total = sum(weights) or 1.0
    return [weight / total for weight in weights]


def text_to_embedding(text):
    if not text or not text.strip():
        raise ValueError("Input text must be non-empty.")

    cleaned = text.strip().lower()
    prompts = build_prompt_variants(cleaned)
    weights = build_prompt_weights(cleaned, prompts)
    tokens = clip.tokenize(prompts).to(DEVICE)

    with torch.no_grad():
        embeddings = model.encode_text(tokens)
        embeddings = F.normalize(embeddings, dim=-1)

        weight_tensor = torch.tensor(
            weights,
            device=DEVICE,
            dtype=embeddings.dtype,
        ).unsqueeze(1)

        embedding = (embeddings * weight_tensor).sum(dim=0, keepdim=True)
        embedding = F.normalize(embedding, dim=-1)

    return embedding.cpu().numpy()
