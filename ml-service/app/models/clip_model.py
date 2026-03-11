import clip, torch
from app.config import settings

device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load(settings.clip_model_name, device=device)
model.eval()
