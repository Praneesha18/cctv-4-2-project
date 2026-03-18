import numpy as np
import torch
import torch.nn.functional as F
import cv2
from PIL import Image

from app.models.clip_model import DEVICE, model, preprocess


def frames_to_embeddings(frames):
    if not frames:
        raise ValueError("No frames were extracted from the video.")

    images = []
    for frame in frames:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb)
        images.append(preprocess(pil_img).unsqueeze(0))

    images = torch.cat(images).to(DEVICE)

    with torch.no_grad():
        embeddings = model.encode_image(images)
        embeddings = F.normalize(embeddings, dim=-1)

    return embeddings.cpu().numpy()


def build_window_embeddings(frame_embeddings, frame_samples, window_size=5, stride=2):
    if len(frame_embeddings) == 0 or len(frame_samples) == 0:
        return np.empty((0, 0), dtype=np.float32), []

    safe_window_size = max(1, int(window_size))
    safe_stride = max(1, int(stride))
    window_embeddings = []
    window_samples = []

    for start_index in range(0, len(frame_embeddings), safe_stride):
        end_index = min(start_index + safe_window_size, len(frame_embeddings))
        window_vectors = frame_embeddings[start_index:end_index]
        if len(window_vectors) == 0:
            continue

        averaged_vector = window_vectors.mean(axis=0)
        norm = np.linalg.norm(averaged_vector)
        if norm > 0:
            averaged_vector = averaged_vector / norm

        start_sample = frame_samples[start_index]
        end_sample = frame_samples[end_index - 1]
        center_index = start_index + ((end_index - start_index - 1) // 2)
        center_sample = frame_samples[center_index]

        window_embeddings.append(averaged_vector.astype(np.float32))
        window_samples.append(
            {
                "start_frame_index": start_sample["frame_index"],
                "end_frame_index": end_sample["frame_index"],
                "start_timestamp_seconds": start_sample["timestamp_seconds"],
                "end_timestamp_seconds": end_sample["timestamp_seconds"],
                "center_frame_index": center_sample["frame_index"],
                "center_timestamp_seconds": center_sample["timestamp_seconds"],
            }
        )

        if end_index >= len(frame_embeddings):
            break

    if not window_embeddings:
        return np.empty((0, frame_embeddings.shape[1]), dtype=np.float32), []

    return np.stack(window_embeddings), window_samples
