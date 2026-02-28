# backend/app/models/user.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SAEnum
from sqlalchemy.sql import func
from app.db.postgres import Base
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import enum


class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class GoalEnum(str, enum.Enum):
    lose = "lose"
    maintain = "maintain"
    gain = "gain"


# SQLAlchemy ORM model (stored in postgres)
class UserDB(Base):
    __tablename__ = "users"

    id          = Column(Integer, primary_key=True, index=True)
    email       = Column(String, unique=True, index=True)
    name        = Column(String)
    height_cm   = Column(Float)
    weight_kg   = Column(Float)
    age         = Column(Integer)
    gender      = Column(SAEnum(GenderEnum))
    goal        = Column(SAEnum(GoalEnum))
    activity_lvl= Column(Float, default=1.55)
    diet_pref   = Column(String, default="balanced")
    avatar_url  = Column(String, nullable=True)   # stored in S3
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())


# Pydantic schemas for request/response validation
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    height_cm: float
    weight_kg: float
    age: int
    gender: GenderEnum
    goal: GoalEnum
    activity_lvl: float = 1.55
    diet_pref: str = "balanced"

    @field_validator("height_cm")
    @classmethod
    def height_range(cls, v):
        if not (50 <= v <= 300):
            raise ValueError("height must be between 50 and 300 cm")
        return v

    @field_validator("weight_kg")
    @classmethod
    def weight_range(cls, v):
        if not (10 <= v <= 500):
            raise ValueError("weight must be between 10 and 500 kg")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    height_cm: float
    weight_kg: float
    age: int
    gender: GenderEnum
    goal: GoalEnum
    avatar_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BMIRequest(BaseModel):
    height_cm: float
    weight_kg: float
    age: int
    gender: GenderEnum
    activity_lvl: float = 1.55
    goal: GoalEnum = GoalEnum.maintain


class BMIResponse(BaseModel):
    bmi: float
    category: str
    color: str
    bmr: float
    tdee: float
    target_calories: float
    macros: dict
    advice: str
