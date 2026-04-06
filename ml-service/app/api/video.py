import cv2
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.services.frame_processor import frames_to_embeddings
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
    frame_embeddings = frames_to_embeddings(raw_frames)
    return frame_embeddings, frame_samples


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
        frame_embeddings, frame_samples = _extract_embeddings_and_samples(
            req.video_path,
            req.fps,
        )
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "embeddings": frame_embeddings.tolist(),
        "frame_samples": frame_samples,
        "frame_count": int(len(frame_samples)),
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
