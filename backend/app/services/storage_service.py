# backend/app/services/storage_service.py
# handles file uploads to aws s3 (videos, profile pics)
# firebase used for real-time sync of workout progress data

import boto3
import uuid
import logging
from botocore.exceptions import ClientError
from app.core.config import settings

logger = logging.getLogger(__name__)


class S3Service:
    def __init__(self):
        self.client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY,
            aws_secret_access_key=settings.AWS_SECRET_KEY,
            region_name=settings.AWS_REGION,
        )
        self.bucket = settings.AWS_BUCKET

    async def upload_file(self, file_bytes: bytes, content_type: str, folder: str = "uploads") -> str:
        """
        Upload a file to S3, return the public URL.
        folder can be: 'avatars', 'pose-videos', 'workout-clips'
        """
        ext = content_type.split("/")[-1]
        key = f"{folder}/{uuid.uuid4()}.{ext}"

        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )
            url = f"https://{self.bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
            logger.info(f"Uploaded to S3: {key}")
            return url
        except ClientError as e:
            logger.error(f"S3 upload error: {e}")
            raise

    def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """generate a temporary signed URL for private files"""
        try:
            return self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except ClientError as e:
            logger.error(f"Presigned URL error: {e}")
            raise

    def delete_file(self, key: str):
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except ClientError as e:
            logger.warning(f"S3 delete failed for {key}: {e}")


class FirebaseService:
    """
    Firebase Realtime Database for live workout tracking.
    Stores: active session state, rep counts, live pose scores.
    This is separate from mongo (historical) and postgres (structured).
    """
    def __init__(self):
        self._app = None
        self._db = None
        self._init_firebase()

    def _init_firebase(self):
        try:
            import firebase_admin
            from firebase_admin import credentials, db as firebase_db

            if not firebase_admin._apps:
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS)
                firebase_admin.initialize_app(cred, {
                    "databaseURL": "https://fitai-default-rtdb.firebaseio.com"
                })
            self._db = firebase_db
            logger.info("Firebase initialized")
        except Exception as e:
            logger.warning(f"Firebase init failed: {e}. Live tracking disabled.")

    def update_session(self, user_id: str, data: dict):
        """push live workout data to firebase for real-time frontend updates"""
        if not self._db:
            return
        try:
            ref = self._db.reference(f"sessions/{user_id}/live")
            ref.update(data)
        except Exception as e:
            logger.warning(f"Firebase update failed: {e}")

    def get_session(self, user_id: str) -> dict:
        if not self._db:
            return {}
        try:
            ref = self._db.reference(f"sessions/{user_id}/live")
            return ref.get() or {}
        except Exception as e:
            logger.warning(f"Firebase read failed: {e}")
            return {}


# singletons - init once at startup
s3 = S3Service()
firebase = FirebaseService()
