# routers/analytics.py  –  returns plotly-ready data for the frontend charts
from fastapi import APIRouter
from typing import List
import random   # placeholder until we have real DB data

router = APIRouter()

@router.get("/weekly-progress/{user_id}")
async def weekly_progress(user_id: str):
    # TODO: pull from PostgreSQL workout_logs table
    # for now returning mock data in the shape the frontend expects
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return {
        "labels": days,
        "calories_burned": [random.randint(200, 500) for _ in days],
        "workout_duration": [random.randint(20, 60) for _ in days],
        "posture_scores":   [random.randint(60, 100) for _ in days],
    }

@router.get("/bmi-history/{user_id}")
async def bmi_history(user_id: str):
    # TODO: pull from MongoDB user_metrics collection
    months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"]
    return {
        "labels": months,
        "bmi_values": [27.4, 26.8, 26.1, 25.5, 24.9, 24.3],
    }
