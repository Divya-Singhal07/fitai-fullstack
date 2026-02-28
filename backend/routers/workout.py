# routers/workout.py
from fastapi import APIRouter
from pydantic import BaseModel
from ml.workout_recommender import recommend_exercises

router = APIRouter()

class WorkoutRequest(BaseModel):
    bmi: float
    age: int
    fitness_level: int  # 0=beginner, 1=intermediate, 2=advanced
    goal: int           # 0=weight_loss, 1=muscle, 2=endurance, 3=flexibility

@router.post("/recommend")
async def recommend_workout(req: WorkoutRequest):
    exercises = recommend_exercises(req.bmi, req.age, req.fitness_level, req.goal)
    return {"exercises": exercises}
