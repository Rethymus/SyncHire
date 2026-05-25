from app.models.user import User
from app.models.resume import Resume
from app.models.jd import JD
from app.models.application import Application
from app.models.application_status_history import ApplicationStatusHistory
from app.models.notification import Notification
from app.models.search import SearchHistory, SavedSearch, SearchAnalytics

__all__ = [
    "User",
    "Resume",
    "JD",
    "Application",
    "ApplicationStatusHistory",
    "Notification",
    "SearchHistory",
    "SavedSearch",
    "SearchAnalytics",
]

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
User.notifications = relationship(
    "Notification", back_populates="user", cascade="all, delete-orphan"
)
User.search_history = relationship(
    "SearchHistory", back_populates="user", cascade="all, delete-orphan"
)
User.saved_searches = relationship(
    "SavedSearch", back_populates="user", cascade="all, delete-orphan"
)
User.search_analytics = relationship(
    "SearchAnalytics", back_populates="user", cascade="all, delete-orphan"
)
