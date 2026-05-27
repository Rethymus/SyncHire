"""
Secure File Upload Validation and Processing

Implements comprehensive file upload security:
- File type validation
- Content inspection
- Virus scanning integration
- File size limits
- Secure file storage
"""

import os
import magic
import hashlib
import tempfile
from typing import Optional, Tuple, List
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
import logging

from app.core.config import get_settings
from app.core.errors import ValidationError

logger = logging.getLogger(__name__)
settings = get_settings()


class FileSecurityValidator:
    """
    Comprehensive file upload security validation
    """

    # Allowed file extensions for uploads
    ALLOWED_EXTENSIONS = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".txt": "text/plain",
        ".rtf": "application/rtf",
        ".odt": "application/vnd.oasis.opendocument.text",
    }

    # Maximum file sizes (in bytes)
    MAX_FILE_SIZES = {
        "default": 10 * 1024 * 1024,  # 10MB
        ".pdf": 10 * 1024 * 1024,  # 10MB
        ".doc": 5 * 1024 * 1024,  # 5MB
        ".docx": 5 * 1024 * 1024,  # 5MB
        ".txt": 1 * 1024 * 1024,  # 1MB
        ".rtf": 5 * 1024 * 1024,  # 5MB
        ".odt": 5 * 1024 * 1024,  # 5MB
    }

    # Dangerous file signatures to block
    MALICIOUS_SIGNATURES = [
        b"MZ",  # Windows executable
        b"PK\x03\x04",  # JAR/APK (can be malicious)
        b"\x1f\x8b",  # GZIP (can contain malicious content)
        b"BZh",  # BZIP2
        b"\x7f\x45\x4c\x46",  # ELF executable
        b"\xca\xfe\xba\xbe",  # Mach-O binary
        b"\xfe\xed\xfa",  # Mach-O binary (alternative)
    ]

    # Content types that should never be allowed
    FORBIDDEN_CONTENT_TYPES = {
        "application/x-executable",
        "application/x-dosexec",
        "application/x-msdownload",
        "application/x-msdos-program",
        "application/x-sh",
        "application/x-shellscript",
        "application/x-python",
        "application/javascript",
        "application/x-javascript",
        "text/javascript",
    }

    @classmethod
    def validate_file_upload(
        cls,
        file: UploadFile,
        max_size: Optional[int] = None,
        allowed_extensions: Optional[set] = None
    ) -> Tuple[bool, List[str]]:
        """
        Validate uploaded file for security issues

        Args:
            file: UploadFile object
            max_size: Maximum file size in bytes
            allowed_extensions: Set of allowed file extensions

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        try:
            # Check filename
            if not file.filename:
                errors.append("No filename provided")
                return False, errors

            # Check file extension
            file_ext = Path(file.filename).suffix.lower()

            if allowed_extensions is None:
                allowed_extensions = cls.ALLOWED_EXTENSIONS.keys()

            if file_ext not in allowed_extensions:
                errors.append(
                    f"File type '{file_ext}' is not allowed. "
                    f"Allowed types: {', '.join(allowed_extensions)}"
                )

            # Check file size
            max_allowed_size = max_size or cls.MAX_FILE_SIZES.get(file_ext, cls.MAX_FILE_SIZES["default"])

            # Read file content for validation
            content = file.file.read()

            if len(content) > max_allowed_size:
                max_mb = max_allowed_size / (1024 * 1024)
                errors.append(f"File size exceeds maximum allowed size of {max_mb:.1f}MB")

            # Reset file pointer
            file.file.seek(0)

            # Validate content type
            content_type = cls._detect_content_type(content)

            if content_type in cls.FORBIDDEN_CONTENT_TYPES:
                errors.append(f"File content type '{content_type}' is not allowed")

            # Check for malicious signatures
            if cls._has_malicious_signature(content):
                errors.append("File contains potentially malicious content")

            # Verify content type matches extension
            expected_content_type = cls.ALLOWED_EXTENSIONS.get(file_ext)
            if expected_content_type and not content_type.startswith(expected_content_type.split('/')[0]):
                # Allow broader content type categories (e.g., application/* for .docx)
                if not (content_type.startswith("application/") or content_type.startswith("text/")):
                    errors.append(
                        f"File content does not match extension. "
                        f"Expected: {expected_content_type}, Got: {content_type}"
                    )

            # Additional validation for text files
            if file_ext == ".txt":
                if not cls._validate_text_file(content):
                    errors.append("Text file contains invalid characters")

            is_valid = len(errors) == 0
            return is_valid, errors

        except Exception as e:
            logger.error(f"Error validating file upload: {str(e)}", exc_info=True)
            errors.append(f"File validation failed: {str(e)}")
            return False, errors

    @classmethod
    def _detect_content_type(cls, content: bytes) -> str:
        """
        Detect file content type using magic bytes

        Args:
            content: File content as bytes

        Returns:
            MIME type string
        """
        try:
            # Use python-magic library for content detection
            mime = magic.Magic(mime=True)
            content_type = mime.from_buffer(content)
            return content_type
        except Exception as e:
            logger.error(f"Error detecting content type: {str(e)}")
            return "application/octet-stream"

    @classmethod
    def _has_malicious_signature(cls, content: bytes) -> bool:
        """
        Check if file has malicious signature

        Args:
            content: File content as bytes

        Returns:
            True if malicious signature is detected
        """
        try:
            # Check for known malicious signatures
            for signature in cls.MALICIOUS_SIGNATURES:
                if content.startswith(signature):
                    return True

            # Check for suspicious patterns
            suspicious_patterns = [
                b"<script",
                b"javascript:",
                b"vbscript:",
                b"onerror=",
                b"onload=",
                b"<?php",
                b"<%",
                b"#!/",
            ]

            content_lower = content.lower()
            for pattern in suspicious_patterns:
                if pattern in content_lower:
                    return True

            return False

        except Exception as e:
            logger.error(f"Error checking malicious signature: {str(e)}")
            return False

    @classmethod
    def _validate_text_file(cls, content: bytes) -> bool:
        """
        Validate text file content

        Args:
            content: File content as bytes

        Returns:
            True if content is valid text
        """
        try:
            # Try to decode as UTF-8
            content.decode('utf-8')
            return True
        except UnicodeDecodeError:
            try:
                # Try other common encodings
                content.decode('latin-1')
                return True
            except UnicodeDecodeError:
                return False

    @classmethod
    async def secure_save_file(
        cls,
        file: UploadFile,
        upload_dir: str,
        user_id: str
    ) -> Tuple[str, str]:
        """
        Securely save uploaded file

        Args:
            file: UploadFile object
            upload_dir: Directory to save file
            user_id: User ID for file organization

        Returns:
            Tuple of (file_path, file_hash)

        Raises:
            ValidationError: If file validation fails
        """
        try:
            # Validate file first
            is_valid, errors = cls.validate_file_upload(file)

            if not is_valid:
                raise ValidationError(
                    message="File validation failed",
                    details={"errors": errors},
                )

            # Create user-specific upload directory
            user_upload_dir = os.path.join(upload_dir, user_id)
            os.makedirs(user_upload_dir, exist_ok=True)

            # Generate secure filename
            file_ext = Path(file.filename).suffix.lower()
            safe_filename = cls._generate_secure_filename(file_ext)

            # Create file path
            file_path = os.path.join(user_upload_dir, safe_filename)

            # Read file content
            content = await file.read()

            # Calculate file hash
            file_hash = hashlib.sha256(content).hexdigest()

            # Save file
            with open(file_path, 'wb') as f:
                f.write(content)

            # Set secure permissions
            os.chmod(file_path, 0o600)  # Read/write for owner only

            logger.info(f"File saved securely: {file_path} (hash: {file_hash})")

            return file_path, file_hash

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error saving file: {str(e)}", exc_info=True)
            raise ValidationError(
                message="Failed to save file",
                details={"error": str(e)},
            )

    @classmethod
    def _generate_secure_filename(cls, file_ext: str) -> str:
        """
        Generate secure filename

        Args:
            file_ext: File extension

        Returns:
            Secure filename
        """
        import secrets
        import time

        # Generate random filename with timestamp
        timestamp = int(time.time())
        random_part = secrets.token_hex(8)
        return f"{timestamp}_{random_part}{file_ext}"

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """
        Sanitize filename to prevent path traversal attacks

        Args:
            filename: Original filename

        Returns:
            Sanitized filename
        """
        # Remove path components
        filename = os.path.basename(filename)

        # Remove dangerous characters
        dangerous_chars = ['..', '/', '\\', '\x00']
        for char in dangerous_chars:
            filename = filename.replace(char, '')

        # Limit filename length
        name, ext = os.path.splitext(filename)
        if len(name) > 100:
            name = name[:100]

        return f"{name}{ext}"


class FileContentScanner:
    """
    File content scanner for malware detection
    (Integration with antivirus/ClamAV can be added here)
    """

    @classmethod
    async def scan_for_malware(cls, file_path: str) -> Tuple[bool, List[str]]:
        """
        Scan file for malware using ClamAV or similar

        Args:
            file_path: Path to file to scan

        Returns:
            Tuple of (is_clean, list_of_threats)
        """
        try:
            # Placeholder for ClamAV integration
            # In production, integrate with ClamAV or similar service

            # For now, perform basic checks
            threats = []

            with open(file_path, 'rb') as f:
                content = f.read()

                # Check for suspicious patterns
                if FileSecurityValidator._has_malicious_signature(content):
                    threats.append("Suspicious file signature detected")

                # Check for embedded scripts
                if b'<script' in content.lower():
                    threats.append("Embedded script detected")

                # Check for suspicious URLs
                import re
                url_pattern = rb'https?://[^\s<>"]+|[^\s<>"]+\.com[^\s<>"]*'
                urls = re.findall(url_pattern, content)
                if len(urls) > 10:  # Arbitrary threshold
                    threats.append("Excessive URLs detected")

            is_clean = len(threats) == 0
            return is_clean, threats

        except Exception as e:
            logger.error(f"Error scanning file: {str(e)}")
            # Fail open - allow file if scanning fails
            return True, []


class SecureFileStorage:
    """
    Secure file storage management
    """

    @classmethod
    def get_user_storage_path(cls, user_id: str) -> str:
        """
        Get user-specific storage path

        Args:
            user_id: User ID

        Returns:
            Storage path for user
        """
        base_storage = getattr(settings, 'UPLOAD_DIR', '/tmp/uploads')
        user_storage = os.path.join(base_storage, user_id)
        os.makedirs(user_storage, exist_ok=True)
        return user_storage

    @classmethod
    def secure_delete_file(cls, file_path: str) -> bool:
        """
        Securely delete file (overwrite before deletion)

        Args:
            file_path: Path to file to delete

        Returns:
            True if deletion successful
        """
        try:
            if not os.path.exists(file_path):
                return False

            # Overwrite file with random data
            file_size = os.path.getsize(file_path)
            with open(file_path, 'wb') as f:
                # Overwrite with random data
                f.write(os.urandom(file_size))
                f.flush()
                os.fsync(f.fileno())

            # Delete file
            os.remove(file_path)

            logger.info(f"File securely deleted: {file_path}")
            return True

        except Exception as e:
            logger.error(f"Error securely deleting file: {str(e)}")
            return False

    @classmethod
    def get_file_hash(cls, file_path: str) -> Optional[str]:
        """
        Calculate SHA256 hash of file

        Args:
            file_path: Path to file

        Returns:
            File hash or None if error
        """
        try:
            sha256_hash = hashlib.sha256()

            with open(file_path, 'rb') as f:
                # Read file in chunks
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)

            return sha256_hash.hexdigest()

        except Exception as e:
            logger.error(f"Error calculating file hash: {str(e)}")
            return None