# backend/app/api/posture.py
# pose analysis endpoint - accepts image/video frame, returns keypoints and feedback
# mediapipe does the heavy lifting here, opencv handles image processing

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import base64
import logging

from app.services.pose_service import analyze_pose_frame

router = APIRouter()
logger = logging.getLogger(__name__)


class KeyPoint(BaseModel):
    name: str
    x: float
    y: float
    z: float
    visibility: float


class PoseFeedback(BaseModel):
    exercise: str
    keypoints: List[KeyPoint]
    angles: dict
    errors: List[str]        # e.g. ["knees caving inward", "back not straight"]
    score: float             # 0-100 posture quality score
    suggestions: List[str]
    rep_count: Optional[int]


@router.post("/analyze", response_model=PoseFeedback)
async def analyze_posture(
    exercise: str,
    file: UploadFile = File(...),
):
    """
    Accepts a single image frame, runs mediapipe pose detection,
    checks joint angles for the specified exercise and returns feedback.
    """
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=415, detail="Image files only (jpeg/png/webp)")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:   # 10 MB cap
        raise HTTPException(status_code=413, detail="Image too large (max 10MB)")

    try:
        result = await analyze_pose_frame(image_bytes, exercise)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Pose analysis error: {e}")
        raise HTTPException(status_code=500, detail="Pose analysis failed")


@router.post("/analyze-base64")
async def analyze_posture_b64(payload: dict):
    """
    Same as above but accepts base64 encoded image.
    Useful for webcam streams from the frontend.
    """
    image_b64 = payload.get("image")
    exercise  = payload.get("exercise", "squat")

    if not image_b64:
        raise HTTPException(status_code=422, detail="Missing image field")

    try:
        image_bytes = base64.b64decode(image_b64.split(",")[-1])
        result = await analyze_pose_frame(image_bytes, exercise)
        return result
    except Exception as e:
        logger.error(f"Base64 pose error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")
