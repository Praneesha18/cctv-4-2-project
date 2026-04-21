import os
import shutil
import time
from http.client import RemoteDisconnected
from urllib.error import URLError

import clip, torch
from app.config import settings

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def load_clip_model():
    os.makedirs(settings.clip_cache_dir, exist_ok=True)
    max_attempts = max(1, int(settings.clip_download_retries))
    backoff_seconds = max(0.1, float(settings.clip_download_retry_backoff_seconds))

    for attempt in range(1, max_attempts + 1):
        try:
            return clip.load(
                settings.clip_model_name,
                device=DEVICE,
                download_root=settings.clip_cache_dir,
            )
        except RuntimeError as exc:
            # Recover from a corrupted cached model file by forcing a clean cache.
            if "SHA256 checksum" in str(exc):
                shutil.rmtree(settings.clip_cache_dir, ignore_errors=True)
                os.makedirs(settings.clip_cache_dir, exist_ok=True)
            else:
                # Non-checksum runtime errors are not expected to recover via retry.
                raise
        except (RemoteDisconnected, URLError, TimeoutError, ConnectionError, OSError) as exc:
            if attempt >= max_attempts:
                raise RuntimeError(
                    "Failed to download CLIP model after "
                    f"{max_attempts} attempts. Ensure outbound network access "
                    f"or pre-populate cache at {settings.clip_cache_dir}."
                ) from exc
        else:
            continue

        if attempt < max_attempts:
            # Exponential backoff for transient network failures.
            time.sleep(backoff_seconds * (2 ** (attempt - 1)))

    raise RuntimeError(
        "Unable to load CLIP model after retries. "
        f"Model={settings.clip_model_name}, cache={settings.clip_cache_dir}"
    )


model, preprocess = load_clip_model()
model.eval()
