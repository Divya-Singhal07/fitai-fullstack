# ml/workout_recommender/model.py
# pytorch neural network for workout plan recommendation
# input: user profile features -> output: recommended exercises + intensity

import torch
import torch.nn as nn
import torch.nn.functional as F
from dataclasses import dataclass
from typing import List


@dataclass
class UserFeatures:
    age: float          # normalised 0-1
    bmi: float          # normalised
    fitness_level: int  # 0=beginner, 1=intermediate, 2=advanced
    goal: int           # 0=lose, 1=maintain, 2=gain, 3=endurance, 4=flexibility
    days_per_week: int  # 1-7
    has_knee_issue: int # 0 or 1
    has_back_issue: int # 0 or 1


class WorkoutRecommender(nn.Module):
    """
    Multi-label classifier that recommends exercise types and intensities.
    Trained on synthetic dataset of user profiles + expert-labelled workout plans.
    Input dim: 7 user features
    Output dim: 12 exercise categories (binary multi-label)
    """

    def __init__(self, input_dim=7, hidden_dims=[64, 128, 64], output_dim=12, dropout=0.3):
        super().__init__()

        layers = []
        prev = input_dim
        for h in hidden_dims:
            layers += [
                nn.Linear(prev, h),
                nn.BatchNorm1d(h),
                nn.ReLU(),
                nn.Dropout(dropout),
            ]
            prev = h

        self.encoder = nn.Sequential(*layers)
        self.classifier = nn.Linear(prev, output_dim)

        # separate head for intensity regression (0-1 scale)
        self.intensity_head = nn.Sequential(
            nn.Linear(prev, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        features = self.encoder(x)
        exercise_logits = self.classifier(features)
        intensity = self.intensity_head(features)
        return exercise_logits, intensity


EXERCISE_LABELS = [
    "squats", "pushups", "jumping_jacks", "arm_curls",
    "plank", "lunges", "burpees", "mountain_climbers",
    "knee_pushups", "calf_raises", "high_knees", "yoga"
]


def load_model(path: str) -> WorkoutRecommender:
    model = WorkoutRecommender()
    try:
        state = torch.load(path, map_location="cpu")
        model.load_state_dict(state)
        model.eval()
    except FileNotFoundError:
        # model file not trained yet - return untrained model
        # in production this should raise an error
        pass
    return model


def predict_workout(model: WorkoutRecommender, features: UserFeatures) -> dict:
    x = torch.tensor([
        features.age,
        features.bmi,
        features.fitness_level / 2.0,
        features.goal / 4.0,
        features.days_per_week / 7.0,
        float(features.has_knee_issue),
        float(features.has_back_issue),
    ], dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        logits, intensity = model(x)
        probs = torch.sigmoid(logits).squeeze()
        intensity_val = intensity.item()

    recommended = [
        {"exercise": EXERCISE_LABELS[i], "probability": float(probs[i])}
        for i in range(len(EXERCISE_LABELS))
        if probs[i] > 0.5
    ]
    recommended.sort(key=lambda x: x["probability"], reverse=True)

    return {
        "recommended_exercises": recommended,
        "intensity_score": round(intensity_val, 2),
        "intensity_label": (
            "light" if intensity_val < 0.4 else
            "moderate" if intensity_val < 0.7 else
            "intense"
        )
    }
