import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

from app.models.clip_model import DEVICE, model, preprocess


def normalize_embeddings(embeddings):
    if len(embeddings) == 0:
        return embeddings.astype(np.float32)

    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    safe_norms = np.where(norms == 0, 1.0, norms)
    return (embeddings / safe_norms).astype(np.float32)


def resize_frame(frame):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image = Image.fromarray(rgb)
    return preprocess(image).unsqueeze(0)


def frames_to_embeddings(frames):
    if not frames:
        raise ValueError("No frames were extracted from the video.")

    images = [resize_frame(frame) for frame in frames]
    images = torch.cat(images).to(DEVICE)

    with torch.no_grad():
        embeddings = model.encode_image(images)
        embeddings = F.normalize(embeddings, dim=-1)

    return normalize_embeddings(embeddings.cpu().numpy())
