import uuid
import asyncio
from typing import Optional, BinaryIO
from pathlib import Path
from botocore.exceptions import ClientError
from app.core.config import get_settings
from app.core.logger import logger

settings = get_settings()


class StorageService:
    """Minio S3-compatible storage service for file uploads."""

    _s3_client = None
    _bucket_name = "synchire-uploads"

    @classmethod
    async def _get_client(cls):
        """Get or create S3 client for Minio."""
        if cls._s3_client is None:
            from aiobotocore.session import get_session

            session = get_session()
            cls._s3_client = session.create_client(
                "s3",
                endpoint_url=f"http://{settings.MINIO_ENDPOINT}",
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY,
                use_ssl=settings.MINIO_USE_SSL,
            )
            # Ensure bucket exists
            await cls._ensure_bucket()
        return cls._s3_client

    @classmethod
    async def _ensure_bucket(cls):
        """Ensure the upload bucket exists."""
        try:
            client = await cls._get_client()
            await client.head_bucket(Bucket=cls._bucket_name)
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "404":
                # Bucket doesn't exist, create it
                await client.create_bucket(Bucket=cls._bucket_name)
                logger.info(LogCategory.STORAGE, f"Created bucket: {cls._bucket_name}")
            else:
                logger.error(LogCategory.STORAGE, f"Error checking bucket: {e}")

    @classmethod
    async def upload_file(
        cls,
        file_content: bytes,
        file_name: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """
        Upload a file to Minio storage.

        Args:
            file_content: File content as bytes
            file_name: Original file name
            content_type: MIME type of the file

        Returns:
            str: The S3 key (path) where the file was stored
        """
        try:
            client = await cls._get_client()

            # Generate unique file key
            file_extension = Path(file_name).suffix
            unique_id = uuid.uuid4()
            s3_key = f"{cls._bucket_name}/{unique_id}{file_extension}"

            # Upload file
            await client.put_object(
                Bucket=cls._bucket_name,
                Key=f"{unique_id}{file_extension}",
                Body=file_content,
                ContentType=content_type,
            )

            logger.info(
                LogCategory.STORAGE,
                f"Uploaded file: {file_name} -> {s3_key}",
            )

            return s3_key

        except ClientError as e:
            logger.error(
                LogCategory.STORAGE,
                f"Failed to upload file {file_name}: {e}",
            )
            raise

    @classmethod
    async def download_file(cls, s3_key: str) -> Optional[bytes]:
        """
        Download a file from Minio storage.

        Args:
            s3_key: The S3 key (path) of the file

        Returns:
            bytes: File content or None if not found
        """
        try:
            client = await cls._get_client()

            # Extract object key from full S3 key
            object_key = s3_key.split(f"{cls._bucket_name}/", 1)[1]

            response = await client.get_object(
                Bucket=cls._bucket_name,
                Key=object_key,
            )

            file_content = await response["Body"].read()
            return file_content

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "NoSuchKey":
                logger.warn(
                    LogCategory.STORAGE,
                    f"File not found: {s3_key}",
                )
                return None
            else:
                logger.error(
                    LogCategory.STORAGE,
                    f"Failed to download file {s3_key}: {e}",
                )
                raise

    @classmethod
    async def delete_file(cls, s3_key: str) -> bool:
        """
        Delete a file from Minio storage.

        Args:
            s3_key: The S3 key (path) of the file to delete

        Returns:
            bool: True if deleted successfully, False otherwise
        """
        try:
            client = await cls._get_client()

            # Extract object key from full S3 key
            object_key = s3_key.split(f"{cls._bucket_name}/", 1)[1]

            await client.delete_object(
                Bucket=cls._bucket_name,
                Key=object_key,
            )

            logger.info(
                LogCategory.STORAGE,
                f"Deleted file: {s3_key}",
            )

            return True

        except ClientError as e:
            logger.error(
                LogCategory.STORAGE,
                f"Failed to delete file {s3_key}: {e}",
            )
            return False

    @classmethod
    async def get_presigned_url(
        cls, s3_key: str, expires_in: int = 3600
    ) -> Optional[str]:
        """
        Generate a presigned URL for temporary file access.

        Args:
            s3_key: The S3 key (path) of the file
            expires_in: URL expiration time in seconds (default: 1 hour)

        Returns:
            str: Presigned URL or None if generation failed
        """
        try:
            client = await cls._get_client()

            # Extract object key from full S3 key
            object_key = s3_key.split(f"{cls._bucket_name}/", 1)[1]

            url = await client.generate_presigned_url(
                "get_object",
                Params={"Bucket": cls._bucket_name, "Key": object_key},
                ExpiresIn=expires_in,
            )

            return url

        except ClientError as e:
            logger.error(
                LogCategory.STORAGE,
                f"Failed to generate presigned URL for {s3_key}: {e}",
            )
            return None

    @classmethod
    async def close(cls):
        """Close the S3 client connection."""
        if cls._s3_client is not None:
            await cls._s3_client.close()
            cls._s3_client = None


# Import LogCategory after logger is imported
from app.core.logger import LogCategory
