# backend/app/services/pose_service.py
# mediapipe BlazePose + opencv for image processing
# joint angle checks are exercise-specific - defined per exercise below

import cv2
import mediapipe as mp
import numpy as np
import asyncio
import logging
from typing import List

logger = logging.getLogger(__name__)

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils


def _angle(a, b, c) -> float:
    """calculate angle at point b between vectors ba and bc"""
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return float(np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0))))


# ideal angle ranges per exercise - based on biomechanics research
EXERCISE_ANGLES = {
    "squat": {
        "knee_angle":  {"joint": ("hip", "knee", "ankle"),       "ideal": (80, 110), "error": "Bend knees more / don't go too deep"},
        "hip_angle":   {"joint": ("shoulder", "hip", "knee"),    "ideal": (70, 110), "error": "Keep torso more upright"},
        "back_angle":  {"joint": ("ear", "shoulder", "hip"),     "ideal": (160, 180),"error": "Keep your back straight"},
    },
    "pushup": {
        "elbow_angle": {"joint": ("shoulder", "elbow", "wrist"), "ideal": (80, 110), "error": "Lower chest closer to ground"},
        "body_angle":  {"joint": ("shoulder", "hip", "ankle"),   "ideal": (170, 180),"error": "Keep body in a straight line"},
        "shoulder":    {"joint": ("elbow", "shoulder", "hip"),   "ideal": (40, 60),  "error": "Keep elbows at 45 degrees"},
    },
    "curl": {
        "elbow_angle": {"joint": ("shoulder", "elbow", "wrist"), "ideal": (30, 60),  "error": "Curl more / fully contract"},
        "shoulder":    {"joint": ("elbow", "shoulder", "hip"),   "ideal": (0, 30),   "error": "Keep upper arm still — no swinging"},
    },
    "plank": {
        "body_line":   {"joint": ("shoulder", "hip", "ankle"),   "ideal": (170, 180),"error": "Raise / lower hips to form a straight line"},
        "neck":        {"joint": ("ear", "shoulder", "hip"),     "ideal": (165, 180),"error": "Keep neck neutral — don't look up"},
    },
}

# mapping landmark names to mediapipe indices
LM = {
    "nose": 0, "ear": 7, "shoulder": 11, "elbow": 13, "wrist": 15,
    "hip": 23, "knee": 25, "ankle": 27,
    # right side
    "r_shoulder": 12, "r_elbow": 14, "r_wrist": 16,
    "r_hip": 24, "r_knee": 26, "r_ankle": 28,
}


def _get_lm(landmarks, name: str):
    idx = LM.get(name)
    if idx is None:
        return None
    lm = landmarks[idx]
    return (lm.x, lm.y, lm.z)


def _check_exercise(landmarks, exercise: str):
    rules = EXERCISE_ANGLES.get(exercise, {})
    angles = {}
    errors = []
    score = 100.0

    for rule_name, rule in rules.items():
        a_name, b_name, c_name = rule["joint"]
        a = _get_lm(landmarks, a_name)
        b = _get_lm(landmarks, b_name)
        c = _get_lm(landmarks, c_name)

        if a and b and c:
            ang = _angle(a[:2], b[:2], c[:2])
            angles[rule_name] = round(ang, 1)
            lo, hi = rule["ideal"]
            if not (lo <= ang <= hi):
                errors.append(rule["error"])
                # penalise proportionally to how far off they are
                deviation = min(abs(ang - lo), abs(ang - hi))
                score -= min(deviation * 0.5, 20)

    return angles, errors, max(0.0, round(score, 1))


def _analyze_sync(image_bytes: bytes, exercise: str) -> dict:
    """synchronous inner function — runs in thread pool"""
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    with mp_pose.Pose(
        static_image_mode=True,
        model_complexity=1,
        min_detection_confidence=0.5,
    ) as pose:
        result = pose.process(img_rgb)

    if not result.pose_landmarks:
        raise ValueError("No person detected in image. Make sure your full body is visible.")

    lms = result.pose_landmarks.landmark
    angles, errors, score = _check_exercise(lms, exercise)

    # build keypoint list
    keypoints = []
    for name, idx in LM.items():
        lm = lms[idx]
        keypoints.append({
            "name": name,
            "x": round(lm.x, 4),
            "y": round(lm.y, 4),
            "z": round(lm.z, 4),
            "visibility": round(lm.visibility, 4),
        })

    suggestions = []
    if score >= 85:
        suggestions.append("Great form! Keep it up 💪")
    elif score >= 60:
        suggestions.append("Good effort — a few tweaks will perfect your form.")
    else:
        suggestions.append("Focus on the corrections below before adding more reps.")

    if errors:
        suggestions += [f"Fix: {e}" for e in errors[:2]]

    return {
        "exercise": exercise,
        "keypoints": keypoints,
        "angles": angles,
        "errors": errors,
        "score": score,
        "suggestions": suggestions,
        "rep_count": None,  # rep counting needs video stream, not single frame
    }


async def analyze_pose_frame(image_bytes: bytes, exercise: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _analyze_sync, image_bytes, exercise)
