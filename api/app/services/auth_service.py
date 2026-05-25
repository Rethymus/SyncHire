from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash, verify_password
from app.core.errors import (
    ValidationError,
    ConflictError,
    DatabaseError,
    handle_database_error,
)
import logging

logger = logging.getLogger(__name__)


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, user_data: UserCreate) -> User:
        """
        Register a new user with comprehensive error handling

        Args:
            db: Database session
            user_data: User registration data

        Returns:
            Created user object

        Raises:
            ValidationError: If input data is invalid
            ConflictError: If email already exists
            DatabaseError: If database operation fails
        """
        try:
            # Check if user already exists
            result = await db.execute(select(User).where(User.email == user_data.email))
            existing_user = result.scalar_one_or_none()

            if existing_user:
                logger.warning(
                    f"Registration attempt with existing email: {user_data.email}"
                )
                raise ConflictError(
                    message="Email already registered",
                    details={"email": user_data.email},
                )

            # Validate password strength (basic validation)
            if len(user_data.password) < 8:
                raise ValidationError(
                    message="Password must be at least 8 characters long",
                    field="password",
                )

            # Hash password
            try:
                hashed_password = get_password_hash(user_data.password)
            except Exception as e:
                logger.error(f"Password hashing failed: {str(e)}")
                raise ValidationError(
                    message="Failed to process password",
                    details={"error": "Password hashing failed"},
                )

            # Create user
            db_user = User(
                email=user_data.email,
                full_name=user_data.full_name,
                hashed_password=hashed_password,
            )

            # Save to database with transaction handling
            try:
                db.add(db_user)
                await db.commit()
                await db.refresh(db_user)
                logger.info(f"New user registered: {db_user.id}")
            except Exception as e:
                await db.rollback()
                handle_database_error(e, "user registration")

            return db_user

        except (ConflictError, ValidationError):
            # Re-raise our custom errors
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during registration: {str(e)}", exc_info=True
            )
            raise DatabaseError(
                message="Registration failed due to an unexpected error",
                details={"error": str(e)},
            )

    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
        """
        Authenticate user with comprehensive error handling

        Args:
            db: Database session
            email: User email
            password: User password

        Returns:
            User object if authentication successful, None otherwise

        Note:
            Returns None instead of raising exception for security reasons
            (prevents email enumeration)
        """
        try:
            # Query user by email
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()

            # Check if user exists and password matches
            if not user:
                logger.warning(
                    f"Authentication attempt with non-existent email: {email}"
                )
                return None

            if not user.is_active:
                logger.warning(f"Authentication attempt for disabled user: {user.id}")
                raise ValidationError(
                    message="User account is disabled",
                    details={"user_id": str(user.id)},
                )

            # Verify password
            try:
                if not verify_password(password, user.hashed_password):
                    logger.warning(f"Failed authentication attempt for user: {user.id}")
                    return None
            except Exception as e:
                logger.error(
                    f"Password verification error for user {user.id}: {str(e)}"
                )
                return None

            logger.info(f"Successful authentication for user: {user.id}")
            return user

        except ValidationError:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error during authentication: {str(e)}", exc_info=True
            )
            # Return None instead of raising exception for security
            return None
