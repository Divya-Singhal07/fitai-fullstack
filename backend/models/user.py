# models/user.py  –  MongoDB document schema (using Pydantic)
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class UserProfile(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    email: str
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    goal: str
    fitness_level: str
    dietary_preferences: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class WorkoutLog(BaseModel):
    user_id: str
    date: datetime = Field(default_factory=datetime.utcnow)
    exercises: List[dict]   # [{name, sets, reps, posture_score}]
    duration_min: int
    calories_burned: Optional[int] = None
    notes: Optional[str] = None
