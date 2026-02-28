# ml/bmi_diet_model.py  –  scikit-learn + TensorFlow diet recommendation model
# using a simple sklearn pipeline for quick recommendations
# the TF model is for the more complex prediction (calorie needs etc)

import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
import pickle
import os

# ── Scikit-learn: quick rule-based diet category classifier ──────────────────
# trained on synthetic data since we don't have real user data yet
# TODO: retrain on actual user feedback once we have enough

def build_diet_classifier():
    """Build and return a simple diet recommendation pipeline."""
    # features: [bmi, age, activity_level (0-4), goal (0-2)]
    X_train = np.array([
        [17, 25, 1, 2], [18, 30, 2, 2], [22, 28, 3, 1], [24, 35, 2, 1],
        [26, 40, 1, 0], [28, 45, 0, 0], [30, 50, 1, 0], [32, 38, 2, 0],
        [19, 22, 3, 2], [21, 27, 2, 1], [23, 33, 3, 1], [25, 29, 1, 0],
    ])
    # labels: 0=low_cal, 1=balanced, 2=high_protein, 3=bulking
    y_train = [3, 3, 1, 1, 0, 0, 0, 0, 2, 1, 2, 0]

    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(n_estimators=50, random_state=42)),
    ])
    pipe.fit(X_train, y_train)
    return pipe


_diet_model = None

def get_diet_model():
    global _diet_model
    if _diet_model is None:
        model_path = "ml/diet_model.pkl"
        if os.path.exists(model_path):
            with open(model_path, "rb") as f:
                _diet_model = pickle.load(f)
        else:
            _diet_model = build_diet_classifier()
            with open(model_path, "wb") as f:
                pickle.dump(_diet_model, f)
    return _diet_model


DIET_LABELS = {0: "low_calorie", 1: "balanced", 2: "high_protein", 3: "bulking"}

def predict_diet_type(bmi: float, age: int, activity: int, goal: int) -> str:
    model = get_diet_model()
    features = np.array([[bmi, age, activity, goal]])
    pred = model.predict(features)[0]
    return DIET_LABELS.get(pred, "balanced")


# ── TensorFlow: calorie needs regression model ───────────────────────────────
# a small dense network - nothing fancy, just enough to give good estimates

try:
    import tensorflow as tf

    def build_calorie_model():
        model = tf.keras.Sequential([
            tf.keras.layers.Dense(64, activation="relu", input_shape=(5,)),
            tf.keras.layers.Dropout(0.1),
            tf.keras.layers.Dense(32, activation="relu"),
            tf.keras.layers.Dense(1),
        ])
        model.compile(optimizer="adam", loss="mse", metrics=["mae"])
        return model

    # In production this would be loaded from a saved .h5 or SavedModel
    # For now we just have the architecture ready
    calorie_model = build_calorie_model()

except ImportError:
    print("TensorFlow not available, using formula-based calorie calc")
    calorie_model = None


def calc_tdee(weight: float, height: float, age: int, gender: str, activity: float) -> float:
    """Mifflin-St Jeor BMR × activity multiplier."""
    if gender == "female":
        bmr = 10 * weight + 6.25 * height - 5 * age - 161
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    return round(bmr * activity, 0)
