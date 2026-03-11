import torch
import cv2
from PIL import Image

from app.models.clip_model import model, preprocess


def frames_to_embeddings(frames):
    if not frames:
        raise ValueError("No frames were extracted from the video.")

    images = []
    for frame in frames:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb)
        images.append(preprocess(pil_img).unsqueeze(0))

    images = torch.cat(images).to(model.device)

    with torch.no_grad():
        embeddings = model.encode_image(images)

    return embeddings.cpu().numpy()
