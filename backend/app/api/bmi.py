# backend/app/api/bmi.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import get_db
from app.models.user import BMIRequest, BMIResponse
from app.services.bmi_service import calculate_bmi_full
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/calculate", response_model=BMIResponse)
async def calculate_bmi(req: BMIRequest, db: AsyncSession = Depends(get_db)):
    """
    Calculates BMI, BMR (Mifflin-St Jeor), TDEE, and macros.
    Also returns category, advice and color for the frontend ring component.
    """
    try:
        result = calculate_bmi_full(req)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"BMI calc error: {e}")
        raise HTTPException(status_code=500, detail="Calculation failed")


@router.get("/history/{user_id}")
async def bmi_history(user_id: int, db: AsyncSession = Depends(get_db)):
    """returns past bmi entries for the analytics chart"""
    # TODO: query bmi_logs table once we build that model
    return {"user_id": user_id, "history": []}
