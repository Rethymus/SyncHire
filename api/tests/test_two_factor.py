"""
Two-Factor Authentication Tests

Comprehensive tests for TOTP generation, verification, and backup codes.
"""

import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.two_factor_service import TwoFactorService
from app.models.user import User
from app.core.errors import ValidationError, DatabaseError


class TestTwoFactorService:
    """Test suite for TwoFactorService"""

    def test_generate_totp_secret(self):
        """Test TOTP secret generation"""
        secret = TwoFactorService.generate_totp_secret()

        # Secret should be a non-empty string
        assert secret is not None
        assert len(secret) > 0
        assert isinstance(secret, str)

        # Secret should be base32 encoded (only uppercase letters and digits 2-7)
        valid_chars = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567")
        assert all(c in valid_chars for c in secret)

        # Secret should be 16 bytes encoded (typically 26-32 characters in base32)
        assert 16 <= len(secret) <= 32

    def test_generate_backup_codes(self):
        """Test backup codes generation"""
        codes = TwoFactorService.generate_backup_codes(count=10)

        # Should generate exactly 10 codes
        assert len(codes) == 10

        # Each code should be unique
        assert len(set(codes)) == 10

        # Each code should be formatted as XXXX-XXXX
        for code in codes:
            assert "-" in code
            parts = code.split("-")
            assert len(parts) == 2
            assert len(parts[0]) == 4
            assert len(parts[1]) == 4

            # Should only contain uppercase letters and digits
            assert all(c.isupper() or c.isdigit() for c in code.replace("-", ""))

    def test_generate_qr_code_uri(self):
        """Test QR code URI generation"""
        email = "test@example.com"
        secret = "JBSWY3DPEHPK3PXP"
        issuer = "SyncHire"

        uri = TwoFactorService.generate_qr_code_uri(email, secret, issuer)

        # URI should start with otpauth://totp/
        assert uri.startswith("otpauth://totp/")

        # URI should contain issuer (email might be URL-encoded)
        assert issuer in uri

        # URI should contain the secret
        assert secret in uri

        # URI should contain email (check for both encoded and unencoded versions)
        assert email in uri or email.replace("@", "%40") in uri

    def test_generate_qr_code_base64(self):
        """Test QR code base64 generation"""
        uri = "otpauth://totp/test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SyncHire"

        qr_base64 = TwoFactorService.generate_qr_code_base64(uri)

        # Should return a non-empty string
        assert qr_base64 is not None
        assert len(qr_base64) > 0

        # Should be valid base64
        import base64
        try:
            decoded = base64.b64decode(qr_base64)
            assert len(decoded) > 0
        except Exception as e:
            pytest.fail(f"Invalid base64 encoding: {e}")

    def test_verify_totp_valid_code(self):
        """Test TOTP verification with valid code"""
        secret = "JBSWY3DPEHPK3PXP"

        # Generate a valid TOTP code
        import pyotp
        totp = pyotp.TOTP(secret)
        valid_code = totp.now()

        # Verification should succeed
        assert TwoFactorService.verify_totp(secret, valid_code) is True

    def test_verify_totp_invalid_code(self):
        """Test TOTP verification with invalid code"""
        secret = "JBSWY3DPEHPK3PXP"
        invalid_code = "000000"

        # Verification should fail
        assert TwoFactorService.verify_totp(secret, invalid_code) is False

    def test_verify_totp_with_time_window(self):
        """Test TOTP verification with time window"""
        secret = "JBSWY3DPEHPK3PXP"

        # Generate a valid TOTP code
        import pyotp
        totp = pyotp.TOTP(secret)
        valid_code = totp.now()

        # Should verify with default time window
        assert TwoFactorService.verify_totp(secret, valid_code, valid_window=1) is True

        # Should verify with larger time window
        assert TwoFactorService.verify_totp(secret, valid_code, valid_window=2) is True

    def test_verify_backup_code_valid(self):
        """Test backup code verification"""
        # Create a mock user to avoid SQLAlchemy relationship issues
        user = Mock(spec=User)
        user.backup_codes = ["ABCD-1234", "EFGH-5678", "IJKL-9012"]

        # Verify valid backup code
        assert TwoFactorService.verify_backup_code(user, "ABCD-1234") is True

        # Code should be removed from user's backup codes
        assert "ABCD-1234" not in user.backup_codes
        assert len(user.backup_codes) == 2

    def test_verify_backup_code_case_insensitive(self):
        """Test backup code verification is case insensitive"""
        user = Mock(spec=User)
        user.backup_codes = ["ABCD-1234", "EFGH-5678"]

        # Should work with lowercase
        assert TwoFactorService.verify_backup_code(user, "abcd-1234") is True

        # Should work with mixed case
        assert TwoFactorService.verify_backup_code(user, "efgh-5678") is True

    def test_verify_backup_code_invalid(self):
        """Test backup code verification with invalid code"""
        user = Mock(spec=User)
        user.backup_codes = ["ABCD-1234", "EFGH-5678"]

        # Verify invalid backup code
        assert TwoFactorService.verify_backup_code(user, "INVALID-0000") is False

        # Codes should remain unchanged
        assert len(user.backup_codes) == 2

    def test_verify_backup_code_empty_list(self):
        """Test backup code verification with no backup codes"""
        user = Mock(spec=User)
        user.backup_codes = None

        # Should return False
        assert TwoFactorService.verify_backup_code(user, "ABCD-1234") is False

        user.backup_codes = []
        assert TwoFactorService.verify_backup_code(user, "ABCD-1234") is False

    @pytest.mark.asyncio
    async def test_setup_two_factor_success(self, db_session):
        """Test successful 2FA setup"""
        user = Mock(spec=User)
        user.id = "test-user-id"
        user.two_factor_secret = "JBSWY3DPEHPK3PXP"
        user.two_factor_enabled = False
        user.backup_codes = None
        user.two_factor_enabled_at = None

        # Generate a valid TOTP code
        import pyotp
        totp = pyotp.TOTP(user.two_factor_secret)
        valid_code = totp.now()

        # Setup 2FA
        success, message, backup_codes = await TwoFactorService.setup_two_factor(
            db_session, user, valid_code
        )

        # Should succeed
        assert success is True
        assert "successfully" in message.lower()
        assert len(backup_codes) == 10

        # User should be updated
        assert user.two_factor_enabled is True
        assert user.backup_codes is not None
        assert len(user.backup_codes) == 10
        assert user.two_factor_enabled_at is not None

    @pytest.mark.asyncio
    async def test_setup_two_factor_invalid_code(self, db_session):
        """Test 2FA setup with invalid code"""
        user = Mock(spec=User)
        user.id = "test-user-id"
        user.two_factor_secret = "JBSWY3DPEHPK3PXP"

        # Should raise ValidationError
        with pytest.raises(ValidationError):
            await TwoFactorService.setup_two_factor(
                db_session, user, "000000"
            )

    @pytest.mark.asyncio
    async def test_setup_two_factor_no_secret(self, db_session):
        """Test 2FA setup without initiating first"""
        user = Mock(spec=User)
        user.id = "test-user-id"
        user.two_factor_secret = None

        # Should raise ValidationError
        with pytest.raises(ValidationError) as exc_info:
            await TwoFactorService.setup_two_factor(
                db_session, user, "123456"
            )

        assert "not initiated" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_initiate_two_factor_setup(self, db_session):
        """Test 2FA setup initiation"""
        user = Mock(spec=User)
        user.id = "test-user-id"
        user.email = "test@example.com"
        user.two_factor_secret = None
        user.two_factor_enabled = False

        secret, qr_code = await TwoFactorService.initiate_two_factor_setup(
            db_session, user
        )

        # Should generate secret and QR code
        assert secret is not None
        assert len(secret) > 0
        assert qr_code is not None
        assert len(qr_code) > 0

        # User should have secret set but 2FA not enabled yet
        assert user.two_factor_secret == secret
        assert user.two_factor_enabled is False

    @pytest.mark.asyncio
    async def test_disable_two_factor_success(self, db_session):
        """Test successful 2FA disable"""
        user = Mock(spec=User)
        user.id = "test-user-id"
        user.two_factor_enabled = True
        user.two_factor_secret = "JBSWY3DPEHPK3PXP"
        user.backup_codes = ["ABCD-1234", "EFGH-5678"]
        user.two_factor_enabled_at = datetime.utcnow()

        # Generate a valid TOTP code
        import pyotp
        totp = pyotp.TOTP(user.two_factor_secret)
        valid_code = totp.now()

        # Disable 2FA
        result = await TwoFactorService.disable_two_factor(
            db_session, user, valid_code
        )

        # Should succeed
        assert result is True

        # User should be updated
        assert user.two_factor_enabled is False
        assert user.two_factor_secret is None
        assert user.backup_codes is None
        assert user.two_factor_enabled_at is None

    @pytest.mark.asyncio
    async def test_disable_two_factor_invalid_code(self, db_session):
        """Test 2FA disable with invalid code"""
        user = Mock(spec=User)
        user.id = "test-user-id"
        user.two_factor_enabled = True
        user.two_factor_secret = "JBSWY3DPEHPK3PXP"

        # Should raise ValidationError
        with pytest.raises(ValidationError):
            await TwoFactorService.disable_two_factor(
                db_session, user, "000000"
            )

    @pytest.mark.asyncio
    async def test_verify_two_factor_totp_success(self, db_session):
        """Test 2FA verification with TOTP code"""
        user = Mock(spec=User)
        user.id = "test-user-id"
        user.two_factor_enabled = True
        user.two_factor_secret = "JBSWY3DPEHPK3PXP"
        user.backup_codes = None

        # Generate a valid TOTP code
        import pyotp
        totp = pyotp.TOTP(user.two_factor_secret)
        valid_code = totp.now()

        # Should succeed
        result = await TwoFactorService.verify_two_factor(
            db_session, user, valid_code
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_verify_two_factor_backup_code_success(self, db_session):
        """Test 2FA verification with backup code"""
        user = Mock(spec=User)
        user.id = "test-user-id"
        user.two_factor_enabled = True
        user.two_factor_secret = "JBSWY3DPEHPK3PXP"
        user.backup_codes = ["ABCD-1234", "EFGH-5678"]

        # Should succeed
        result = await TwoFactorService.verify_two_factor(
            db_session, user, "ABCD-1234"
        )
        assert result is True

        # Backup code should be removed
        assert "ABCD-1234" not in user.backup_codes
        assert len(user.backup_codes) == 1

    @pytest.mark.asyncio
    async def test_verify_two_factor_not_enabled(self, db_session):
        """Test 2FA verification when not enabled"""
        user = Mock(spec=User)
        user.id = "test-user-id"
        user.two_factor_enabled = False

        # Should raise ValidationError
        with pytest.raises(ValidationError) as exc_info:
            await TwoFactorService.verify_two_factor(
                db_session, user, "123456"
            )

        assert "not enabled" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_verify_two_factor_invalid_code(self, db_session):
        """Test 2FA verification with invalid code"""
        user = Mock(spec=User)
        user.id = "test-user-id"
        user.two_factor_enabled = True
        user.two_factor_secret = "JBSWY3DPEHPK3PXP"
        user.backup_codes = None

        # Should raise ValidationError
        with pytest.raises(ValidationError):
            await TwoFactorService.verify_two_factor(
                db_session, user, "000000"
            )


@pytest.fixture
def db_session():
    """Create a mock database session"""
    session = Mock(spec=AsyncSession)

    async def mock_commit():
        pass

    async def mock_rollback():
        pass

    async def mock_refresh(obj):
        pass

    async def mock_add(obj):
        pass

    session.commit = mock_commit
    session.rollback = mock_rollback
    session.refresh = mock_refresh
    session.add = mock_add

    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v"])