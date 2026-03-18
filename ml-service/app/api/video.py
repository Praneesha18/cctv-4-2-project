from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.frame_processor import build_window_embeddings, frames_to_embeddings
from app.utils.frame_extractor import extract_frames

router = APIRouter()


class VideoRequest(BaseModel):
    video_path: str = Field(..., min_length=1, description="Path to a local video file")
    fps: float = Field(1.0, gt=0, description="Frames per second to sample")


class VideoResponse(BaseModel):
    embeddings: list[list[float]]
    frame_count: int
    frame_samples: list[dict[str, float | int]]
    window_embeddings: list[list[float]]
    window_samples: list[dict[str, float | int]]


@router.post("/embed/video")
def embed_video(req: VideoRequest) -> VideoResponse:
    try:
        frame_samples = extract_frames(req.video_path, fps=req.fps)
        embeddings = frames_to_embeddings([sample["frame"] for sample in frame_samples])
        window_embeddings, window_samples = build_window_embeddings(embeddings, frame_samples)
        serializable_samples = [
            {
                "frame_index": sample["frame_index"],
                "timestamp_seconds": round(sample["timestamp_seconds"], 3),
            }
            for sample in frame_samples
        ]
        serializable_window_samples = [
            {
                "start_frame_index": sample["start_frame_index"],
                "end_frame_index": sample["end_frame_index"],
                "start_timestamp_seconds": round(sample["start_timestamp_seconds"], 3),
                "end_timestamp_seconds": round(sample["end_timestamp_seconds"], 3),
                "center_frame_index": sample["center_frame_index"],
                "center_timestamp_seconds": round(sample["center_timestamp_seconds"], 3),
            }
            for sample in window_samples
        ]
        return VideoResponse(
            embeddings=embeddings.tolist(),
            frame_count=len(frame_samples),
            frame_samples=serializable_samples,
            window_embeddings=window_embeddings.tolist(),
            window_samples=serializable_window_samples,
        )
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
