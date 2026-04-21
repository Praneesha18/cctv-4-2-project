import os

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

from app.models.clip_model import DEVICE, model, preprocess

POOL_WINDOW_SIZE = max(1, int(os.getenv("POOL_WINDOW_SIZE", "8")))


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


def pool_embeddings(embeddings):
    if len(embeddings) == 0:
        return np.array([], dtype=np.float32)

    pooled = embeddings.mean(axis=0, keepdims=True)
    normalized = normalize_embeddings(pooled)
    return normalized[0]


def pool_embeddings_by_window(embeddings, window_size=POOL_WINDOW_SIZE):
    if len(embeddings) == 0:
        return np.empty((0, 0), dtype=np.float32)

    effective_window_size = max(1, min(len(embeddings), window_size))
    normalized_windows = []
    for start in range(0, len(embeddings) - effective_window_size + 1):
        window = embeddings[start : start + effective_window_size]
        normalized_windows.append(pool_embeddings(window))

    return np.stack(normalized_windows).astype(np.float32)


def frames_to_embeddings(frames):
    if not frames:
        raise ValueError("No frames were extracted from the video.")

    images = [resize_frame(frame) for frame in frames]
    images = torch.cat(images).to(DEVICE)

    with torch.no_grad():
        embeddings = model.encode_image(images)
        embeddings = F.normalize(embeddings, dim=-1)

    frame_embeddings = normalize_embeddings(embeddings.cpu().numpy())
    pooled_embeddings = pool_embeddings_by_window(frame_embeddings)
    pooled_embedding = pool_embeddings(pooled_embeddings)
    return frame_embeddings, pooled_embeddings, pooled_embedding
