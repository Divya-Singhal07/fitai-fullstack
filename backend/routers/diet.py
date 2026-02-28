# routers/diet.py
from fastapi import APIRouter
from pydantic import BaseModel
from ml.bmi_diet_model import predict_diet_type, calc_tdee

router = APIRouter()

class DietRequest(BaseModel):
    bmi: float
    age: int
    activity: int   # 0-4
    goal: int       # 0=lose, 1=maintain, 2=gain
    preferences: list = []

@router.post("/recommend")
async def recommend_diet(req: DietRequest):
    diet_type = predict_diet_type(req.bmi, req.age, req.activity, req.goal)
    return {"diet_type": diet_type, "preferences": req.preferences}
