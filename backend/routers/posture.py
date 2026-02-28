# routers/posture.py
from fastapi import APIRouter
from pydantic import BaseModel
from ml.posture_analyzer import run_posture_analysis
from services.s3_storage import upload_posture_frame
import base64

router = APIRouter()

class PostureRequest(BaseModel):
    image_b64: str
    exercise: str
    user_id: str = "anonymous"

@router.post("/analyze")
async def analyze_posture(req: PostureRequest):
    result = run_posture_analysis(req.image_b64, req.exercise)
    # save frame to S3 for history (only if we got a valid pose)
    if "score" in result and result["score"] > 0:
        try:
            raw = req.image_b64.split(",")[-1]
            img_bytes = base64.b64decode(raw)
            url = upload_posture_frame(img_bytes, req.user_id)
            result["saved_frame_url"] = url
        except Exception as e:
            result["save_error"] = str(e)
    return result
