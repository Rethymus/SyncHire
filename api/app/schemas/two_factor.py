"""
Two-Factor Authentication Schemas

Pydantic models for 2FA requests and responses
"""

from pydantic import BaseModel, Field
from typing import List, Optional
import uuid


class TwoFactorSetupInitiate(BaseModel):
    """Request to initiate 2FA setup"""

    pass  # No additional fields needed, uses authenticated user


class TwoFactorSetupInitiateResponse(BaseModel):
    """Response with QR code for 2FA setup"""

    secret: str = Field(..., description="TOTP secret key")
    qr_code: str = Field(..., description="Base64-encoded QR code image")
    message: str = Field(
        default="Scan the QR code with your authenticator app and verify with a code",
        description="Setup instructions",
    )


class TwoFactorSetupVerify(BaseModel):
    """Request to verify and enable 2FA"""

    totp_code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern="^[0-9]{6}$",
        description="6-digit TOTP code from authenticator app",
    )


class TwoFactorSetupCompleteResponse(BaseModel):
    """Response after successful 2FA setup"""

    success: bool = Field(..., description="Whether setup was successful")
    message: str = Field(..., description="Success message")
    backup_codes: List[str] = Field(..., description="Backup codes for recovery")
    warning: str = Field(
        default="Save these backup codes securely. They won't be shown again.",
        description="Warning about backup codes",
    )


class TwoFactorDisable(BaseModel):
    """Request to disable 2FA"""

    totp_code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern="^[0-9]{6}$",
        description="6-digit TOTP code to verify disable request",
    )


class TwoFactorVerify(BaseModel):
    """Request to verify 2FA code"""

    code: str = Field(
        ...,
        min_length=6,
        max_length=11,  # Allows for 6-digit TOTP or 8+1+4 digit backup codes (XXXX-XXXX)
        description="6-digit TOTP code or backup code",
    )


class TwoFactorVerifyResponse(BaseModel):
    """Response after 2FA verification"""

    success: bool = Field(..., description="Whether verification was successful")
    message: str = Field(..., description="Verification message")
    backup_code_used: bool = Field(
        default=False, description="Whether a backup code was used"
    )
    remaining_backup_codes: Optional[int] = Field(
        default=None,
        description="Number of remaining backup codes if backup code was used",
    )


class UserTwoFactorStatus(BaseModel):
    """User 2FA status information"""

    two_factor_enabled: bool = Field(..., description="Whether 2FA is enabled")
    has_backup_codes: bool = Field(
        ..., description="Whether user has unused backup codes"
    )
    backup_codes_count: Optional[int] = Field(
        default=None, description="Number of remaining backup codes"
    )
    two_factor_enabled_at: Optional[str] = Field(
        default=None, description="When 2FA was enabled"
    )


class LoginWithTwoFactor(BaseModel):
    """Login request with 2FA support"""

    email: str
    password: str
    totp_code: Optional[str] = Field(
        default=None,
        min_length=6,
        max_length=6,
        pattern="^[0-9]{6}$",
        description="6-digit TOTP code (required if 2FA enabled)",
    )
    backup_code: Optional[str] = Field(
        default=None,
        min_length=9,
        max_length=11,
        description="Backup code (alternative to TOTP code)",
    )
