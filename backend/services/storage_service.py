# services/storage_service.py
# AWS S3 for media files + Firebase for realtime sync

import os
import boto3
import firebase_admin
from firebase_admin import credentials, db as firebase_db
from botocore.exceptions import ClientError
import uuid
from datetime import datetime

# ── AWS S3 ────────────────────────────────────────────────────────

_s3_client = None


def get_s3():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION", "us-east-1"),
        )
    return _s3_client


BUCKET = os.getenv("AWS_BUCKET_NAME", "fitai-media")


async def upload_posture_image(user_id: str, image_bytes: bytes, exercise: str) -> str:
    """Upload a posture analysis frame to S3, return the public URL."""
    s3 = get_s3()
    key = f"posture/{user_id}/{exercise}/{uuid.uuid4()}.jpg"
    try:
        s3.put_object(
            Bucket=BUCKET,
            Key=key,
            Body=image_bytes,
            ContentType="image/jpeg",
        )
        url = f"https://{BUCKET}.s3.amazonaws.com/{key}"
        return url
    except ClientError as e:
        print(f"S3 upload failed: {e}")
        return ""


async def upload_workout_video(user_id: str, video_bytes: bytes) -> str:
    """Upload a workout session video clip to S3."""
    s3 = get_s3()
    key = f"videos/{user_id}/{uuid.uuid4()}.mp4"
    try:
        s3.put_object(Bucket=BUCKET, Key=key, Body=video_bytes, ContentType="video/mp4")
        return f"https://{BUCKET}.s3.amazonaws.com/{key}"
    except ClientError as e:
        print(f"S3 video upload failed: {e}")
        return ""


def get_presigned_url(key: str, expires: int = 3600) -> str:
    """Generate a temporary signed URL for private S3 objects."""
    s3 = get_s3()
    try:
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": key},
            ExpiresIn=expires,
        )
    except ClientError:
        return ""


# ── Firebase Realtime Database ────────────────────────────────────

_firebase_init = False


def init_firebase():
    global _firebase_init
    if _firebase_init:
        return
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-key.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            "databaseURL": os.getenv("FIREBASE_DATABASE_URL", "")
        })
        _firebase_init = True
    else:
        print("⚠️  Firebase credentials not found — realtime sync disabled")


def push_live_session(user_id: str, data: dict):
    """Push live workout session data to Firebase for realtime UI updates."""
    if not _firebase_init:
        return
    ref = firebase_db.reference(f"live_sessions/{user_id}")
    ref.set({**data, "updated_at": datetime.utcnow().isoformat()})


def push_form_score(user_id: str, exercise: str, score: float):
    """Push form score update in realtime so the UI can show live feedback."""
    if not _firebase_init:
        return
    ref = firebase_db.reference(f"form_scores/{user_id}/{exercise}")
    ref.push({"score": score, "ts": datetime.utcnow().isoformat()})


def get_live_session(user_id: str) -> dict:
    if not _firebase_init:
        return {}
    ref = firebase_db.reference(f"live_sessions/{user_id}")
    return ref.get() or {}
