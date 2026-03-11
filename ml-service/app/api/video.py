from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.frame_processor import frames_to_embeddings
from app.utils.frame_extractor import extract_frames

router = APIRouter()


class VideoRequest(BaseModel):
    video_path: str = Field(..., min_length=1, description="Path to a local video file")
    fps: float = Field(1.0, gt=0, description="Frames per second to sample")


@router.post("/embed/video")
def embed_video(req: VideoRequest) -> dict[str, list[list[float]]]:
    frames = extract_frames(req.video_path, fps=req.fps)
    embeddings = frames_to_embeddings(frames)
    return {"embeddings": embeddings.tolist(), "frame_count": len(frames)}
