from fastapi import FastAPI

from app.api.text import router as text_router
from app.api.video import router as video_router
from app.config import settings

app = FastAPI(title=settings.app_name)
app.include_router(text_router, tags=["text"])
app.include_router(video_router, tags=["video"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
