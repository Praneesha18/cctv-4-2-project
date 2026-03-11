from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.text_processor import text_to_embedding

router = APIRouter()


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Input text to embed")


@router.post("/embed/text")
def embed_text(req: TextRequest) -> dict[str, list[list[float]]]:
    try:
        return {"embedding": text_to_embedding(req.text).tolist()}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
