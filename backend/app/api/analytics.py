# backend/app/api/analytics.py
# returns data formatted for plotly charts on the frontend
# also has a /d3 endpoint that returns raw data for custom d3 visualisations

from fastapi import APIRouter, Query
from datetime import datetime, timedelta
import random
import math

router = APIRouter()


def _mock_weight_series(days=30):
    """generate realistic-looking weight loss data - replace with db query in prod"""
    base = 78.0
    data = []
    for i in range(days):
        # slight downward trend with noise
        noise = random.gauss(0, 0.3)
        trend = -0.08 * i
        data.append({
            "date": (datetime.now() - timedelta(days=days - i)).strftime("%Y-%m-%d"),
            "weight": round(base + trend + noise, 1),
        })
    return data


def _mock_workout_freq(weeks=8):
    days_of_week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return [
        {
            "week": f"Week {w+1}",
            "sessions": random.randint(2, 6),
            "avg_duration_min": random.randint(25, 65),
        }
        for w in range(weeks)
    ]


def _mock_calories(days=14):
    return [
        {
            "date": (datetime.now() - timedelta(days=days - i)).strftime("%Y-%m-%d"),
            "consumed": random.randint(1600, 2400),
            "target": 2000,
            "burned": random.randint(200, 500),
        }
        for i in range(days)
    ]


def _mock_pose_scores():
    exercises = ["squat", "pushup", "plank", "curl", "jumping_jack"]
    return [
        {
            "exercise": ex,
            "avg_score": round(random.uniform(55, 95), 1),
            "sessions": random.randint(3, 20),
        }
        for ex in exercises
    ]


def _mock_muscle_radar():
    return [
        {"muscle": "Chest",    "score": random.randint(40, 90)},
        {"muscle": "Back",     "score": random.randint(40, 90)},
        {"muscle": "Legs",     "score": random.randint(40, 90)},
        {"muscle": "Core",     "score": random.randint(40, 90)},
        {"muscle": "Shoulders","score": random.randint(40, 90)},
        {"muscle": "Arms",     "score": random.randint(40, 90)},
    ]


@router.get("/overview/{user_id}")
async def analytics_overview(user_id: int):
    """
    Returns all chart data in one call to minimise round trips.
    Frontend uses plotly for most charts, d3 for the muscle heatmap.
    """
    return {
        "weight_series":   _mock_weight_series(30),
        "workout_freq":    _mock_workout_freq(8),
        "calorie_tracker": _mock_calories(14),
        "pose_scores":     _mock_pose_scores(),
        "muscle_radar":    _mock_muscle_radar(),
        "streak_days":     random.randint(1, 21),
        "total_workouts":  random.randint(10, 80),
        "total_minutes":   random.randint(300, 2000),
    }


@router.get("/d3/heatmap/{user_id}")
async def activity_heatmap(user_id: int, year: int = Query(default=2024)):
    """
    D3 calendar heatmap data — returns all days with workout intensity.
    0 = rest, 1 = light, 2 = moderate, 3 = intense
    """
    start = datetime(year, 1, 1)
    days = 366 if year % 4 == 0 else 365
    heatmap = []
    for i in range(days):
        d = start + timedelta(days=i)
        # generate a plausible workout pattern
        is_weekend = d.weekday() >= 5
        has_workout = random.random() < (0.35 if is_weekend else 0.6)
        heatmap.append({
            "date": d.strftime("%Y-%m-%d"),
            "value": random.randint(1, 3) if has_workout else 0,
        })
    return {"year": year, "data": heatmap}
