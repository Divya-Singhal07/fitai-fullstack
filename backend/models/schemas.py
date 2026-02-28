# models/schemas.py — Pydantic request/response schemas

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"


class GoalType(str, Enum):
    lose = "lose"
    maintain = "maintain"
    gain = "gain"


class FitnessLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class DietType(str, Enum):
    vegan = "vegan"
    vegetarian = "vegetarian"
    keto = "keto"
    high_protein = "high_protein"
    gluten_free = "gluten_free"
    balanced = "balanced"


# ── BMI ───────────────────────────────────────────────────────────

class BMIRequest(BaseModel):
    height_cm: float = Field(..., gt=100, lt=250, description="Height in centimetres")
    weight_kg: float = Field(..., gt=20,  lt=300, description="Weight in kilograms")
    age: int          = Field(..., gt=10,  lt=100)
    gender: Gender
    activity_level: float = Field(1.55, ge=1.2, le=1.9)


class BMIResponse(BaseModel):
    bmi: float
    category: str
    color: str
    advice: str
    bmr: float
    tdee: float
    target_calories: float
    macros: dict   # { protein_pct, carb_pct, fat_pct }


# ── DIET ──────────────────────────────────────────────────────────

class DietRequest(BaseModel):
    goal: GoalType
    diet_type: DietType = DietType.balanced
    calories_target: float
    allergies: Optional[List[str]] = []


class MealItem(BaseModel):
    name: str
    description: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    emoji: str


class DietPlanResponse(BaseModel):
    breakfast: MealItem
    lunch: MealItem
    snack: MealItem
    dinner: MealItem
    total_calories: int
    weekly_tips: List[str]


# ── WORKOUT ───────────────────────────────────────────────────────

class WorkoutRequest(BaseModel):
    age: int
    gender: Gender
    fitness_level: FitnessLevel
    goal: str
    limitations: Optional[List[str]] = []


class DayPlan(BaseModel):
    day: str
    name: str
    emoji: str
    exercises: str
    intensity: str   # rest | active | hard
    duration_mins: int


class WeeklyPlanResponse(BaseModel):
    level: str
    goal: str
    tip: str
    days: List[DayPlan]
    hard_days: int
    active_days: int
    rest_days: int


# ── POSTURE ───────────────────────────────────────────────────────

class PostureAnalysisResponse(BaseModel):
    exercise: str
    score: float           # 0-100
    feedback: List[str]
    corrections: List[str]
    keypoints: dict        # MediaPipe landmark positions
    rep_count: int
    form_grade: str        # A / B / C / D


# ── CHAT ──────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str     # user | assistant
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_context: Optional[dict] = {}   # bmi, goal, diet prefs etc


class ChatResponse(BaseModel):
    reply: str
    suggestions: List[str]   # quick reply chips
    model_used: str


# ── ANALYTICS ─────────────────────────────────────────────────────

class WorkoutSession(BaseModel):
    user_id: str
    exercise: str
    reps: int
    sets: int
    form_score: float
    duration_secs: int
    calories_burned: float


class ProgressResponse(BaseModel):
    weight_history: List[dict]
    bmi_history: List[dict]
    workout_frequency: List[dict]
    calories_trend: List[dict]
    form_score_trend: List[dict]
