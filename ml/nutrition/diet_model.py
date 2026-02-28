# ml/nutrition/diet_model.py
# scikit-learn random forest for diet plan recommendation
# simpler than pytorch for this tabular data use-case

import numpy as np
import joblib
import logging
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

DIET_TYPES = ["balanced", "high_protein", "keto", "vegan", "low_carb", "mediterranean"]


def build_diet_pipeline() -> Pipeline:
    """builds the sklearn pipeline - trained offline, loaded at inference"""
    return Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", RandomForestClassifier(
            n_estimators=100,
            max_depth=8,
            random_state=42,
            class_weight="balanced",
        ))
    ])


def build_calorie_pipeline() -> Pipeline:
    """gradient boosting for calorie target regression"""
    return Pipeline([
        ("scaler", StandardScaler()),
        ("regressor", GradientBoostingRegressor(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.05,
            random_state=42,
        ))
    ])


def features_from_profile(profile: dict) -> np.ndarray:
    """
    Convert user profile dict to feature vector.
    Features: [age, bmi, gender_enc, goal_enc, activity_lvl, diet_pref_enc]
    """
    gender_map = {"male": 0, "female": 1, "other": 2}
    goal_map   = {"lose": 0, "maintain": 1, "gain": 2}
    pref_map   = {"balanced": 0, "vegan": 1, "keto": 2, "high_protein": 3, "gluten_free": 4}

    return np.array([[
        float(profile.get("age", 25)),
        float(profile.get("bmi", 22)),
        gender_map.get(profile.get("gender", "male"), 0),
        goal_map.get(profile.get("goal", "maintain"), 1),
        float(profile.get("activity_lvl", 1.55)),
        pref_map.get(profile.get("diet_pref", "balanced"), 0),
    ]])


class DietRecommender:
    def __init__(self, model_path: str = None):
        self.clf = build_diet_pipeline()
        self.reg = build_calorie_pipeline()
        self._fitted = False

        if model_path:
            try:
                saved = joblib.load(model_path)
                self.clf = saved["clf"]
                self.reg = saved["reg"]
                self._fitted = True
                logger.info("Diet model loaded from disk")
            except FileNotFoundError:
                logger.warning("Diet model file not found — using rule-based fallback")

    def predict(self, profile: dict) -> dict:
        if not self._fitted:
            return self._rule_based_fallback(profile)

        X = features_from_profile(profile)
        diet_type = DIET_TYPES[self.clf.predict(X)[0]]
        cal_target = float(self.reg.predict(X)[0])

        return {
            "recommended_diet": diet_type,
            "calorie_target": round(cal_target),
            "confidence": float(max(self.clf.predict_proba(X)[0])),
        }

    def _rule_based_fallback(self, profile: dict) -> dict:
        """simple rules when model isn't trained yet"""
        goal = profile.get("goal", "maintain")
        pref = profile.get("diet_pref", "balanced")
        bmi  = profile.get("bmi", 22.0)
        act  = profile.get("activity_lvl", 1.55)

        # rough tdee
        tdee = profile.get("tdee", 2000)
        delta = {"lose": -400, "maintain": 0, "gain": 350}.get(goal, 0)

        return {
            "recommended_diet": pref if pref != "balanced" else (
                "high_protein" if goal == "gain" else
                "low_carb" if goal == "lose" else
                "balanced"
            ),
            "calorie_target": round(tdee + delta),
            "confidence": 0.75,  # rule-based so not a real probability
        }

    def save(self, path: str):
        joblib.dump({"clf": self.clf, "reg": self.reg}, path)
