from app.models.user import User
from app.models.resume import Resume
from app.models.jd import JD
from app.models.application import Application
from app.models.application_status_history import ApplicationStatusHistory
from app.models.notification import Notification
from app.models.search import SearchHistory, SavedSearch, SearchAnalytics
from app.models.interview import Interview, InterviewReminder, InterviewEvent
from app.models.audit_log import AuditLog, DataRetentionLog, ConsentLog
from app.models.task import Task

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
    "Interview",
    "InterviewReminder",
    "InterviewEvent",
    "AuditLog",
    "DataRetentionLog",
    "ConsentLog",
    "Task",
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
User.interviews = relationship(
    "Interview", back_populates="user", cascade="all, delete-orphan"
)
User.interview_reminders = relationship(
    "InterviewReminder", back_populates="user", cascade="all, delete-orphan"
)
User.interview_events = relationship(
    "InterviewEvent", back_populates="user", cascade="all, delete-orphan"
)
User.tasks = relationship(
    "Task", back_populates="user", cascade="all, delete-orphan"
)
