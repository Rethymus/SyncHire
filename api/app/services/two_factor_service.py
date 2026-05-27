"""
Two-Factor Authentication (2FA) Service

Handles TOTP generation, verification, backup codes, and QR code generation.
Compatible with Google Authenticator, Authy, and other TOTP apps.
"""

import pyotp
import qrcode
import io
import base64
import secrets
import string
from datetime import datetime
from typing import Tuple, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.core.errors import ValidationError, DatabaseError
import logging

logger = logging.getLogger(__name__)


class TwoFactorService:
    """Service for managing two-factor authentication"""

    @staticmethod
    def generate_totp_secret() -> str:
        """
        Generate a secure TOTP secret key

        Returns:
            Base32-encoded secret key (16 bytes)
        """
        return pyotp.random_base32()

    @staticmethod
    def generate_backup_codes(count: int = 10) -> List[str]:
        """
        Generate secure backup codes for 2FA recovery

        Args:
            count: Number of backup codes to generate (default: 10)

        Returns:
            List of backup codes
        """
        codes = []
        for _ in range(count):
            # Generate 8-character code with uppercase letters and digits
            code = "".join(
                secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8)
            )
            # Format as XXXX-XXXX for better readability
            codes.append(f"{code[:4]}-{code[4:]}")
        return codes

    @staticmethod
    def generate_qr_code_uri(email: str, secret: str, issuer: str = "SyncHire") -> str:
        """
        Generate QR code URI for TOTP setup

        Args:
            email: User email
            secret: TOTP secret key
            issuer: Application name (default: SyncHire)

        Returns:
            otpauth:// URI for QR code generation
        """
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=issuer)

    @staticmethod
    def generate_qr_code_base64(uri: str) -> str:
        """
        Generate QR code as base64-encoded image

        Args:
            uri: otpauth:// URI

        Returns:
            Base64-encoded PNG image
        """
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()

        return img_str

    @staticmethod
    def verify_totp(secret: str, token: str, valid_window: int = 1) -> bool:
        """
        Verify TOTP token against secret

        Args:
            secret: TOTP secret key
            token: 6-digit TOTP code
            valid_window: Time window for valid codes (default: 1, allows ±1 step)

        Returns:
            True if token is valid, False otherwise
        """
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(token, valid_window=valid_window)
        except Exception as e:
            logger.error(f"TOTP verification error: {str(e)}")
            return False

    @staticmethod
    def verify_backup_code(user: User, code: str) -> bool:
        """
        Verify backup code and mark it as used

        Args:
            user: User object
            code: Backup code to verify

        Returns:
            True if code is valid, False otherwise
        """
        if not user.backup_codes:
            return False

        # Normalize code for comparison
        normalized_code = code.strip().upper()

        # Check if code exists in user's backup codes
        if normalized_code in user.backup_codes:
            # Remove used backup code
            user.backup_codes.remove(normalized_code)
            logger.info(f"Backup code used for user: {user.id}")
            return True

        return False

    @staticmethod
    async def setup_two_factor(
        db: AsyncSession, user: User, totp_code: str
    ) -> Tuple[bool, str, Optional[List[str]]]:
        """
        Setup two-factor authentication for user

        Args:
            db: Database session
            user: User object
            totp_code: TOTP code for verification

        Returns:
            Tuple of (success, message, backup_codes)

        Raises:
            ValidationError: If TOTP code is invalid
            DatabaseError: If database operation fails
        """
        try:
            if not user.two_factor_secret:
                raise ValidationError(
                    message="Two-factor authentication setup not initiated. Please start the setup process first.",
                    field="two_factor_secret",
                )

            # Verify TOTP code
            if not TwoFactorService.verify_totp(user.two_factor_secret, totp_code):
                logger.warning(
                    f"Invalid TOTP code during 2FA setup for user: {user.id}"
                )
                raise ValidationError(
                    message="Invalid authentication code. Please try again.",
                    field="totp_code",
                )

            # Generate backup codes
            backup_codes = TwoFactorService.generate_backup_codes()

            # Update user
            user.two_factor_enabled = True
            user.backup_codes = backup_codes
            user.two_factor_enabled_at = datetime.utcnow()

            # Save to database
            try:
                db.add(user)
                await db.commit()
                await db.refresh(user)
                logger.info(f"Two-factor authentication enabled for user: {user.id}")
            except Exception as e:
                await db.rollback()
                logger.error(f"Database error during 2FA setup: {str(e)}")
                raise DatabaseError(
                    message="Failed to enable two-factor authentication",
                    details={"error": str(e)},
                )

            return True, "Two-factor authentication enabled successfully", backup_codes

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during 2FA setup: {str(e)}", exc_info=True)
            raise DatabaseError(
                message="Failed to setup two-factor authentication",
                details={"error": str(e)},
            )

    @staticmethod
    async def initiate_two_factor_setup(
        db: AsyncSession, user: User
    ) -> Tuple[str, str]:
        """
        Initiate two-factor authentication setup

        Args:
            db: Database session
            user: User object

        Returns:
            Tuple of (secret_key, qr_code_base64)
        """
        try:
            # Generate new TOTP secret
            secret = TwoFactorService.generate_totp_secret()

            # Update user with secret (but don't enable yet)
            user.two_factor_secret = secret

            # Save to database
            try:
                db.add(user)
                await db.commit()
                await db.refresh(user)
            except Exception as e:
                await db.rollback()
                logger.error(f"Database error during 2FA initiation: {str(e)}")
                raise DatabaseError(
                    message="Failed to initiate two-factor authentication setup",
                    details={"error": str(e)},
                )

            # Generate QR code URI
            uri = TwoFactorService.generate_qr_code_uri(user.email, secret)

            # Generate QR code as base64
            qr_code_base64 = TwoFactorService.generate_qr_code_base64(uri)

            logger.info(
                f"Two-factor authentication setup initiated for user: {user.id}"
            )

            return secret, qr_code_base64

        except DatabaseError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during 2FA initiation: {str(e)}", exc_info=True
            )
            raise DatabaseError(
                message="Failed to initiate two-factor authentication setup",
                details={"error": str(e)},
            )

    @staticmethod
    async def disable_two_factor(db: AsyncSession, user: User, totp_code: str) -> bool:
        """
        Disable two-factor authentication for user

        Args:
            db: Database session
            user: User object
            totp_code: TOTP code for verification

        Returns:
            True if disabled successfully

        Raises:
            ValidationError: If TOTP code is invalid
            DatabaseError: If database operation fails
        """
        try:
            if not user.two_factor_enabled:
                raise ValidationError(
                    message="Two-factor authentication is not enabled",
                    field="two_factor_enabled",
                )

            # Verify TOTP code
            if not TwoFactorService.verify_totp(user.two_factor_secret, totp_code):
                logger.warning(
                    f"Invalid TOTP code during 2FA disable for user: {user.id}"
                )
                raise ValidationError(
                    message="Invalid authentication code. Please try again.",
                    field="totp_code",
                )

            # Disable 2FA
            user.two_factor_enabled = False
            user.two_factor_secret = None
            user.backup_codes = None
            user.two_factor_enabled_at = None

            # Save to database
            try:
                db.add(user)
                await db.commit()
                await db.refresh(user)
                logger.info(f"Two-factor authentication disabled for user: {user.id}")
            except Exception as e:
                await db.rollback()
                logger.error(f"Database error during 2FA disable: {str(e)}")
                raise DatabaseError(
                    message="Failed to disable two-factor authentication",
                    details={"error": str(e)},
                )

            return True

        except ValidationError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during 2FA disable: {str(e)}", exc_info=True
            )
            raise DatabaseError(
                message="Failed to disable two-factor authentication",
                details={"error": str(e)},
            )

    @staticmethod
    async def verify_two_factor(db: AsyncSession, user: User, code: str) -> bool:
        """
        Verify two-factor authentication code

        Args:
            db: Database session
            user: User object
            code: TOTP code or backup code

        Returns:
            True if code is valid, False otherwise

        Raises:
            ValidationError: If code is invalid
            DatabaseError: If database operation fails
        """
        try:
            if not user.two_factor_enabled:
                raise ValidationError(
                    message="Two-factor authentication is not enabled for this account",
                    field="two_factor_enabled",
                )

            # Try TOTP verification first
            if TwoFactorService.verify_totp(user.two_factor_secret, code):
                logger.info(f"TOTP verification successful for user: {user.id}")
                return True

            # Try backup code verification
            if TwoFactorService.verify_backup_code(user, code):
                # Save the updated backup codes (remove used one)
                try:
                    db.add(user)
                    await db.commit()
                    logger.info(
                        f"Backup code verification successful for user: {user.id}"
                    )
                except Exception as e:
                    await db.rollback()
                    logger.error(f"Database error updating backup codes: {str(e)}")
                    raise DatabaseError(
                        message="Failed to update backup codes",
                        details={"error": str(e)},
                    )
                return True

            # If neither worked, raise error
            logger.warning(f"Invalid 2FA code for user: {user.id}")
            raise ValidationError(
                message="Invalid authentication code. Please try again.", field="code"
            )

        except ValidationError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during 2FA verification: {str(e)}", exc_info=True
            )
            raise DatabaseError(
                message="Failed to verify two-factor authentication",
                details={"error": str(e)},
            )
