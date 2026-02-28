# services/s3_storage.py  –  AWS S3 helpers for posture snapshots & media

import boto3
import os
from botocore.exceptions import ClientError
import uuid

s3 = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION", "us-east-1"),
)

BUCKET = os.getenv("S3_BUCKET", "fitai-media")


def upload_posture_frame(image_bytes: bytes, user_id: str) -> str:
    """Upload a posture analysis frame and return the public URL."""
    key = f"posture/{user_id}/{uuid.uuid4()}.jpg"
    try:
        s3.put_object(
            Bucket=BUCKET,
            Key=key,
            Body=image_bytes,
            ContentType="image/jpeg",
            # keeping these private - presigned URLs for access
        )
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": key},
            ExpiresIn=3600,
        )
        return url
    except ClientError as e:
        print(f"S3 upload error: {e}")
        raise


def upload_user_avatar(image_bytes: bytes, user_id: str) -> str:
    key = f"avatars/{user_id}/profile.jpg"
    s3.put_object(Bucket=BUCKET, Key=key, Body=image_bytes, ContentType="image/jpeg")
    return f"https://{BUCKET}.s3.amazonaws.com/{key}"
