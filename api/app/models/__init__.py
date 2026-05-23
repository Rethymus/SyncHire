from app.models.user import User
from app.models.resume import Resume
from app.models.jd import JD
from app.models.application import Application

__all__ = ["User", "Resume", "JD", "Application"]

# Import after all models to establish relationships
from sqlalchemy.orm import relationship

# Add back_populates to User
User.resumes = relationship(
    "Resume", back_populates="user", cascade="all, delete-orphan"
)
User.jds = relationship("JD", back_populates="user", cascade="all, delete-orphan")
User.applications = relationship(
    "Application", back_populates="user", cascade="all, delete-orphan"
)
