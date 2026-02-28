# services/cv_service.py
# OpenCV + MediaPipe pose estimation and analysis

import cv2
import mediapipe as mp
import numpy as np
import base64
from typing import Optional
import math

from services.ml_service import form_scorer


mp_pose     = mp.solutions.pose
mp_drawing  = mp.solutions.drawing_utils
mp_styles   = mp.solutions.drawing_styles


def _angle_between(a, b, c) -> float:
    """Calculate angle at point b given three (x,y) points."""
    ba = np.array([a[0] - b[0], a[1] - b[1]])
    bc = np.array([c[0] - b[0], c[1] - b[1]])
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return math.degrees(math.acos(np.clip(cosine, -1.0, 1.0)))


def decode_image(base64_str: str) -> np.ndarray:
    """Decode a base64 image string to an OpenCV BGR array."""
    # strip data URI prefix if present
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    img_bytes = base64.b64decode(base64_str)
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def encode_image(frame: np.ndarray) -> str:
    """Encode an OpenCV frame to base64 JPEG for sending back to frontend."""
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return base64.b64encode(buf).decode("utf-8")


def extract_landmarks(results) -> Optional[dict]:
    """Convert MediaPipe landmark results to a plain dict."""
    if not results.pose_landmarks:
        return None
    lm = results.pose_landmarks.landmark
    return {
        idx: {"x": l.x, "y": l.y, "z": l.z, "visibility": l.visibility}
        for idx, l in enumerate(lm)
    }


def compute_joint_angles(landmarks: dict) -> dict:
    """Derive key joint angles from MediaPipe landmark positions."""
    def lm(idx):
        p = landmarks[idx]
        return (p["x"], p["y"])

    angles = {}
    try:
        # knee angle (left) — landmarks 23=hip, 25=knee, 27=ankle
        angles["knee_angle"] = _angle_between(lm(23), lm(25), lm(27))
        # hip angle — 11=shoulder, 23=hip, 25=knee
        angles["hip_angle"]  = _angle_between(lm(11), lm(23), lm(25))
        # elbow angle (left) — 11=shoulder, 13=elbow, 15=wrist
        angles["elbow_angle"] = _angle_between(lm(11), lm(13), lm(15))
        # back / torso angle — 11=shoulder, 23=hip, 25=knee
        angles["back_angle"] = _angle_between(lm(11), lm(23), lm(25))
        # body alignment — 11=shoulder, 23=hip, 27=ankle
        angles["body_angle"]  = _angle_between(lm(11), lm(23), lm(27))
    except (KeyError, ZeroDivisionError):
        pass

    return angles


def draw_annotations(frame: np.ndarray, results, score: float, feedback: list) -> np.ndarray:
    """Draw skeleton, score overlay and feedback on the frame."""
    # draw landmarks
    mp_drawing.draw_landmarks(
        frame,
        results.pose_landmarks,
        mp_pose.POSE_CONNECTIONS,
        landmark_drawing_spec=mp_styles.get_default_pose_landmarks_style(),
    )

    # score badge top-left
    color = (0, 220, 100) if score >= 80 else (0, 200, 255) if score >= 60 else (0, 80, 220)
    cv2.rectangle(frame, (10, 10), (220, 60), (10, 25, 41), -1)
    cv2.putText(frame, f"Form Score: {score:.0f}/100", (18, 42),
                cv2.FONT_HERSHEY_SIMPLEX, 0.75, color, 2)

    # feedback lines bottom of frame
    h = frame.shape[0]
    for i, line in enumerate(feedback[:3]):
        # strip emoji for cv2
        clean = line.encode("ascii", "ignore").decode()
        cv2.putText(frame, clean, (10, h - 20 - i * 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 230, 255), 1)
    return frame


async def analyse_frame(base64_image: str, exercise: str) -> dict:
    """
    Main analysis pipeline:
      1. Decode image
      2. Run MediaPipe Pose
      3. Compute joint angles
      4. Score form with ML model
      5. Annotate frame
      6. Return results
    """
    frame = decode_image(base64_image)
    rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    with mp_pose.Pose(
        static_image_mode=True,
        model_complexity=1,
        enable_segmentation=False,
        min_detection_confidence=0.5,
    ) as pose:
        results = pose.process(rgb)

    landmarks = extract_landmarks(results)
    if not landmarks:
        return {
            "detected": False,
            "score": 0,
            "feedback": ["🔍 No pose detected — make sure your full body is visible"],
            "corrections": [],
            "keypoints": {},
            "annotated_image": None,
        }

    angles = compute_joint_angles(landmarks)
    score, feedback = form_scorer.score(exercise, angles)

    corrections = [f for f in feedback if "⚠️" in f or "💡" in f]

    annotated = draw_annotations(frame.copy(), results, score, feedback)
    annotated_b64 = encode_image(annotated)

    grade = "A" if score >= 90 else "B" if score >= 75 else "C" if score >= 60 else "D"

    return {
        "detected": True,
        "score": round(score, 1),
        "form_grade": grade,
        "feedback": feedback,
        "corrections": corrections,
        "keypoints": landmarks,
        "joint_angles": angles,
        "annotated_image": annotated_b64,
    }
