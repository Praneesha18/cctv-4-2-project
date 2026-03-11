import clip, torch
from app.models.clip_model import model


def text_to_embedding(text):
    if not text or not text.strip():
        raise ValueError("Input text must be non-empty.")

    tokens = clip.tokenize([text.strip()]).to(model.device)
    with torch.no_grad():
        embedding = model.encode_text(tokens)
    return embedding.cpu().numpy()
