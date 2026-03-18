import os
import shutil

import clip, torch
from app.config import settings

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def load_clip_model():
    os.makedirs(settings.clip_cache_dir, exist_ok=True)

    try:
        return clip.load(
            settings.clip_model_name,
            device=DEVICE,
            download_root=settings.clip_cache_dir,
        )
    except RuntimeError as exc:
        # Recover once from a corrupted cached model file.
        if "SHA256 checksum" not in str(exc):
            raise

        shutil.rmtree(settings.clip_cache_dir, ignore_errors=True)
        os.makedirs(settings.clip_cache_dir, exist_ok=True)
        return clip.load(
            settings.clip_model_name,
            device=DEVICE,
            download_root=settings.clip_cache_dir,
        )


model, preprocess = load_clip_model()
model.eval()
