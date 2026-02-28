# routers/bmi.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ml.bmi_diet_model import calc_tdee

router = APIRouter()

class BMIRequest(BaseModel):
    height_cm: float
    weight_kg: float
    age: int
    gender: str
    activity_level: float = 1.55

class BMIResponse(BaseModel):
    bmi: float
    category: str
    tdee: float
    advice: str

@router.post("/calculate", response_model=BMIResponse)
async def calculate_bmi(req: BMIRequest):
    if req.height_cm <= 0 or req.weight_kg <= 0:
        raise HTTPException(400, "Invalid height or weight")
    bmi = round(req.weight_kg / ((req.height_cm / 100) ** 2), 1)
    if   bmi < 18.5: cat, advice = "Underweight", "Focus on nutrient-dense calorie surplus."
    elif bmi < 25:   cat, advice = "Healthy",     "Great range — maintain your current habits!"
    elif bmi < 30:   cat, advice = "Overweight",  "Moderate diet + exercise will get you there."
    else:            cat, advice = "Obese",        "Start slow and stay consistent. Every step counts!"
    tdee = calc_tdee(req.weight_kg, req.height_cm, req.age, req.gender, req.activity_level)
    return BMIResponse(bmi=bmi, category=cat, tdee=tdee, advice=advice)
