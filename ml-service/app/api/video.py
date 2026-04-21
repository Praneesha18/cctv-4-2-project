import cv2
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.services.frame_processor import POOL_WINDOW_SIZE, frames_to_embeddings
from app.utils.frame_extractor import extract_frames

router = APIRouter()


class VideoEmbedRequest(BaseModel):
    video_path: str = Field(..., min_length=1, description="Path to the video file")
    fps: float = Field(2, gt=0, description="Sampling rate for frame extraction")


class FramePreviewRequest(BaseModel):
    video_path: str = Field(..., min_length=1, description="Path to the video file")
    timestamp_seconds: float = Field(0, ge=0, description="Frame timestamp")


def _extract_embeddings_and_samples(video_path: str, fps: float):
    frames = extract_frames(video_path, fps=fps)
    raw_frames = [item["frame"] for item in frames]
    frame_samples = [
        {
            "frame_index": int(item["frame_index"]),
            "timestamp_seconds": float(item["timestamp_seconds"]),
            "quality": item.get("quality", {}),
        }
        for item in frames
    ]
    frame_embeddings, pooled_embeddings, action_embedding = frames_to_embeddings(raw_frames)
    pooled_samples = []
    effective_window_size = max(1, min(len(frame_samples), POOL_WINDOW_SIZE))
    for start in range(0, len(frame_samples) - effective_window_size + 1):
        window_samples = frame_samples[start : start + effective_window_size]
        if not window_samples:
            continue

        representative_index = min(len(window_samples) - 1, len(window_samples) // 2)
        representative_sample = window_samples[representative_index]
        pooled_samples.append(
            {
                "start_frame_index": int(window_samples[0]["frame_index"]),
                "end_frame_index": int(window_samples[-1]["frame_index"]),
                "start_timestamp_seconds": float(window_samples[0]["timestamp_seconds"]),
                "end_timestamp_seconds": float(window_samples[-1]["timestamp_seconds"]),
                "representative_frame_index": int(
                    representative_sample["frame_index"]
                ),
                "representative_timestamp_seconds": float(
                    representative_sample["timestamp_seconds"]
                ),
                "window_frame_count": int(len(window_samples)),
            }
        )

    return (
        frame_embeddings,
        pooled_embeddings,
        action_embedding,
        frame_samples,
        pooled_samples,
    )


def _load_preview_frame(video_path: str, timestamp_seconds: float):
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        raise FileNotFoundError(f"Could not open video file: {video_path}")

    capture.set(cv2.CAP_PROP_POS_MSEC, max(0.0, float(timestamp_seconds)) * 1000.0)
    success, frame = capture.read()
    capture.release()

    if not success or frame is None:
        raise ValueError("Could not extract preview frame from the video.")

    success, encoded = cv2.imencode(".jpg", frame)
    if not success:
        raise ValueError("Could not encode preview frame.")

    return encoded.tobytes()


@router.post("/embed/video")
def embed_video(req: VideoEmbedRequest) -> dict:
    try:
        (
            frame_embeddings,
            pooled_embeddings,
            action_embedding,
            frame_samples,
            pooled_samples,
        ) = _extract_embeddings_and_samples(req.video_path, req.fps)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "embeddings": frame_embeddings.tolist(),
        "pooled_embeddings": pooled_embeddings.tolist(),
        "action_embedding": action_embedding.tolist(),
        "frame_samples": frame_samples,
        "pooled_samples": pooled_samples,
        "frame_count": int(len(frame_samples)),
        "pooled_count": int(len(pooled_samples)),
        "pool_window_size": POOL_WINDOW_SIZE,
    }


@router.post("/preview/frame")
def preview_frame(req: FramePreviewRequest) -> Response:
    try:
        image_bytes = _load_preview_frame(req.video_path, req.timestamp_seconds)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return Response(content=image_bytes, media_type="image/jpeg")
