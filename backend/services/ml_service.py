# services/ml_service.py
# handles all TensorFlow / PyTorch / scikit-learn logic

import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingRegressor
import joblib
import os

# lazy-load heavy frameworks to keep startup fast
_tf = None
_torch = None


def get_tf():
    global _tf
    if _tf is None:
        import tensorflow as tf
        _tf = tf
    return _tf


def get_torch():
    global _torch
    if _torch is None:
        import torch
        _torch = torch
    return _torch


# ── BMI / Calorie Prediction (scikit-learn) ──────────────────────

class CaloriePredictionModel:
    """
    Gradient Boosting model trained on TDEE data.
    In production you'd load a pre-trained .pkl file from S3.
    Here we fit a small demo model on synthetic data.
    """

    def __init__(self):
        self.model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self._is_fitted = False
        self._train_demo()

    def _train_demo(self):
        # synthetic training data — replace with real dataset in production
        np.random.seed(42)
        n = 500
        heights  = np.random.uniform(150, 200, n)
        weights  = np.random.uniform(50,  120, n)
        ages     = np.random.uniform(18,  70,  n)
        genders  = np.random.randint(0, 2, n)          # 0=female, 1=male
        activity = np.random.uniform(1.2, 1.9, n)

        # Mifflin-St Jeor as ground truth
        bmr = 10*weights + 6.25*heights - 5*ages + np.where(genders==1, 5, -161)
        tdee = bmr * activity + np.random.normal(0, 30, n)

        X = np.column_stack([heights, weights, ages, genders, activity])
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, tdee)
        self._is_fitted = True

    def predict_tdee(self, height, weight, age, gender_is_male, activity):
        X = np.array([[height, weight, age, int(gender_is_male), activity]])
        X_scaled = self.scaler.transform(X)
        return float(self.model.predict(X_scaled)[0])


# ── Exercise Classifier (TensorFlow) ─────────────────────────────

class ExerciseClassifier:
    """
    CNN that classifies exercise type from a pose skeleton image.
    In production: load weights from S3 with tf.keras.models.load_model().
    """

    def __init__(self):
        tf = get_tf()
        # build a lightweight MobileNetV2-based classifier
        base = tf.keras.applications.MobileNetV2(
            input_shape=(224, 224, 3),
            include_top=False,
            weights=None,   # set to "imagenet" when real weights available
        )
        self.model = tf.keras.Sequential([
            base,
            tf.keras.layers.GlobalAveragePooling2D(),
            tf.keras.layers.Dense(128, activation="relu"),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(6, activation="softmax"),  # 6 exercise classes
        ])
        self.class_names = ["squat", "pushup", "jumping_jack", "arm_curl", "knee_pushup", "plank"]

    def predict(self, image_array: np.ndarray) -> dict:
        tf = get_tf()
        img = tf.image.resize(image_array, (224, 224))
        img = tf.keras.applications.mobilenet_v2.preprocess_input(img)
        img = tf.expand_dims(img, 0)
        probs = self.model.predict(img, verbose=0)[0]
        top_idx = int(np.argmax(probs))
        return {
            "exercise": self.class_names[top_idx],
            "confidence": float(probs[top_idx]),
            "all_probs": {name: float(p) for name, p in zip(self.class_names, probs)},
        }


# ── Rep Counter (PyTorch LSTM) ────────────────────────────────────

class RepCounterLSTM:
    """
    LSTM that counts reps from a sequence of joint-angle time series.
    Input: (batch, seq_len, n_joints) — n_joints = 17 MediaPipe landmarks × 2 (x,y)
    """

    def __init__(self):
        torch = get_torch()
        import torch.nn as nn

        class LSTMCounter(nn.Module):
            def __init__(self):
                super().__init__()
                self.lstm = nn.LSTM(input_size=34, hidden_size=128, num_layers=2,
                                    batch_first=True, dropout=0.2)
                self.fc = nn.Linear(128, 1)  # predict rep count

            def forward(self, x):
                out, _ = self.lstm(x)
                return self.fc(out[:, -1, :])

        self.model = LSTMCounter()
        self.model.eval()
        # in production: self.model.load_state_dict(torch.load("rep_counter.pth"))

    def count_reps(self, landmark_sequence: list) -> int:
        """landmark_sequence: list of 34-element arrays (17 landmarks × x,y)"""
        torch = get_torch()
        if len(landmark_sequence) < 10:
            return 0
        x = torch.tensor([landmark_sequence], dtype=torch.float32)
        with torch.no_grad():
            pred = self.model(x)
        return max(0, int(round(pred.item())))


# ── Form Quality Scorer (scikit-learn) ───────────────────────────

class FormScorer:
    """
    Scores exercise form 0-100 from joint angles.
    Uses a Random Forest trained on labelled pose data.
    """

    THRESHOLDS = {
        # exercise: {joint: (ideal_angle, tolerance)}
        "squat": {
            "knee_angle": (90, 15),
            "hip_angle":  (90, 20),
            "back_angle": (45, 15),
        },
        "pushup": {
            "elbow_angle": (90, 15),
            "body_angle":  (180, 10),
        },
        "plank": {
            "body_angle":  (180, 8),
            "hip_angle":   (180, 8),
        },
    }

    def score(self, exercise: str, joint_angles: dict) -> tuple[float, list]:
        thresholds = self.THRESHOLDS.get(exercise, {})
        if not thresholds:
            return 75.0, ["Keep up the good form!"]

        deductions = 0
        feedback = []

        for joint, (ideal, tol) in thresholds.items():
            actual = joint_angles.get(joint)
            if actual is None:
                continue
            diff = abs(actual - ideal)
            if diff > tol * 2:
                deductions += 20
                feedback.append(f"⚠️ {joint.replace('_',' ').title()} is off — aim for ~{ideal}°")
            elif diff > tol:
                deductions += 8
                feedback.append(f"💡 {joint.replace('_',' ').title()} could be a little better")

        score = max(0, 100 - deductions)
        if not feedback:
            feedback.append("✅ Great form! Keep it up.")
        return float(score), feedback


# module-level singletons — initialised on first import
calorie_model   = CaloriePredictionModel()
form_scorer     = FormScorer()
# lazy-init heavy models only when first used:
_exercise_clf   = None
_rep_counter    = None


def get_exercise_classifier():
    global _exercise_clf
    if _exercise_clf is None:
        _exercise_clf = ExerciseClassifier()
    return _exercise_clf


def get_rep_counter():
    global _rep_counter
    if _rep_counter is None:
        _rep_counter = RepCounterLSTM()
    return _rep_counter
