# ml/workout_recommender.py  –  PyTorch workout plan recommendation
# using a lightweight collaborative-filtering style model
# honestly could do this with sklearn but wanted to try PyTorch here

import torch
import torch.nn as nn
import numpy as np
from typing import List

# ── Simple embedding model (PyTorch) ────────────────────────────────────────
class WorkoutRecommender(nn.Module):
    """
    Tiny neural net that takes user features and outputs exercise scores.
    Not a real CF model yet - just a placeholder architecture.
    TODO: train on actual workout completion data once we have it.
    """
    def __init__(self, n_exercises: int = 6):
        super().__init__()
        self.fc = nn.Sequential(
            nn.Linear(4, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, n_exercises),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.fc(x)


_recommender = None

def get_recommender():
    global _recommender
    if _recommender is None:
        _recommender = WorkoutRecommender()
        # would normally load saved weights here:
        # _recommender.load_state_dict(torch.load("ml/workout_model.pth"))
        _recommender.eval()
    return _recommender


EXERCISES = ["squats", "pushups", "jumping_jacks", "arm_curls", "knee_pushups", "plank"]


def recommend_exercises(bmi: float, age: int, fitness_level: int, goal: int) -> List[dict]:
    """Return ranked exercise list for the user."""
    model = get_recommender()
    x = torch.tensor([[bmi / 40.0, age / 80.0, fitness_level / 2.0, goal / 3.0]], dtype=torch.float32)
    with torch.no_grad():
        scores = model(x).squeeze().numpy()

    # sort exercises by score (descending)
    ranked = sorted(zip(EXERCISES, scores.tolist()), key=lambda t: t[1], reverse=True)
    return [{"exercise": ex, "score": round(s * 100, 1), "priority": i+1} for i, (ex, s) in enumerate(ranked)]
