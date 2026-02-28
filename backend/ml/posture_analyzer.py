# ml/posture_analyzer.py  –  MediaPipe + OpenCV posture analysis
# trickiest part of the project - landmark angles took a while to tune

import cv2
import mediapipe as mp
import numpy as np
import base64

mp_pose = mp.solutions.pose


def decode_b64_image(b64: str) -> np.ndarray:
    if "," in b64:
        b64 = b64.split(",")[1]
    arr = np.frombuffer(base64.b64decode(b64), np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def calc_angle(a, b, c) -> float:
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = abs(np.degrees(radians))
    return 360 - angle if angle > 180 else angle


def analyze_squat(lm_obj) -> dict:
    lm = lm_obj.landmark
    P = mp_pose.PoseLandmark
    hip   = [lm[P.LEFT_HIP.value].x,   lm[P.LEFT_HIP.value].y]
    knee  = [lm[P.LEFT_KNEE.value].x,  lm[P.LEFT_KNEE.value].y]
    ankle = [lm[P.LEFT_ANKLE.value].x, lm[P.LEFT_ANKLE.value].y]
    knee_angle = calc_angle(hip, knee, ankle)

    feedback, score = [], 100
    if knee_angle > 160:
        feedback.append("⬇️ Go lower — aim for thighs parallel to the floor")
        score -= 20
    elif knee_angle < 60:
        feedback.append("⬆️ A bit too deep, watch your heels")
        score -= 10
    if lm[P.LEFT_KNEE.value].x > lm[P.LEFT_HIP.value].x + 0.05:
        feedback.append("⚠️ Left knee caving inward — push it out!")
        score -= 25
    if not feedback:
        feedback.append("✅ Great squat form! Keep it up!")
    return {"exercise": "squat", "knee_angle": round(knee_angle, 1), "score": max(score, 0), "feedback": feedback}


def analyze_pushup(lm_obj) -> dict:
    lm = lm_obj.landmark
    P = mp_pose.PoseLandmark
    shoulder = [lm[P.LEFT_SHOULDER.value].x, lm[P.LEFT_SHOULDER.value].y]
    elbow    = [lm[P.LEFT_ELBOW.value].x,    lm[P.LEFT_ELBOW.value].y]
    wrist    = [lm[P.LEFT_WRIST.value].x,    lm[P.LEFT_WRIST.value].y]
    hip      = [lm[P.LEFT_HIP.value].x,      lm[P.LEFT_HIP.value].y]
    ankle    = [lm[P.LEFT_ANKLE.value].x,    lm[P.LEFT_ANKLE.value].y]

    elbow_angle = calc_angle(shoulder, elbow, wrist)
    body_angle  = calc_angle(shoulder, hip, ankle)
    feedback, score = [], 100

    if elbow_angle < 70:
        feedback.append("⬆️ Push up! You are at the bottom of the rep.")
    elif elbow_angle > 160:
        feedback.append("⬇️ Lower further for a full range of motion")
        score -= 15
    if body_angle < 160:
        feedback.append("📏 Hips sagging — brace your core!")
        score -= 30
    elif body_angle > 200:
        feedback.append("📏 Hips too high — straighten your line")
        score -= 15
    if not feedback:
        feedback.append("✅ Solid push-up form!")
    return {"exercise": "pushup", "elbow_angle": round(elbow_angle,1), "body_angle": round(body_angle,1), "score": max(score,0), "feedback": feedback}


def run_posture_analysis(b64_image: str, exercise: str) -> dict:
    frame = decode_b64_image(b64_image)
    rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    with mp_pose.Pose(min_detection_confidence=0.6) as pose:
        results = pose.process(rgb)
        if not results.pose_landmarks:
            return {"error": "No pose detected. Make sure your full body is in frame.", "score": 0, "feedback": []}
        if exercise == "squat":
            return analyze_squat(results.pose_landmarks)
        elif exercise in ("pushup", "knee_pushup"):
            return analyze_pushup(results.pose_landmarks)
        else:
            return {"exercise": exercise, "score": 85, "feedback": ["✅ Pose detected — specific analysis coming soon."]}
