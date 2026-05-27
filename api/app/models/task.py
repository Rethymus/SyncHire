import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class TaskType(str, enum.Enum):
    """Types of async tasks that can be processed."""

    RESUME_OPTIMIZATION = "resume_optimization"
    JD_PARSING = "jd_parsing"
    RESUME_PARSING = "resume_parsing"
    INTERVIEW_PREP = "interview_prep"
    MATCH_ANALYSIS = "match_analysis"


class TaskStatus(str, enum.Enum):
    """Status of task processing."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Task(Base):
    """
    Async task model for resource-intensive AI operations.

    This model supports background processing of expensive operations
    like resume optimization, JD parsing, and interview prep generation.
    """

    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Task identification
    task_type = Column(String, nullable=False, index=True)
    status = Column(
        String, nullable=False, default=TaskStatus.PENDING.value, index=True
    )

    # Task data
    input_data = Column(JSONB, nullable=True)  # Task input parameters
    result_data = Column(JSONB, nullable=True)  # Task execution results

    # Error handling
    error_message = Column(Text, nullable=True)
    error_details = Column(JSONB, nullable=True)

    # Metadata
    priority = Column(String, nullable=True, default="normal")  # high, normal, low
    progress = Column(
        JSONB, nullable=True
    )  # Optional progress tracking for long-running tasks

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="tasks")

    def __repr__(self):
        return f"<Task {self.id} type={self.task_type} status={self.status}>"

    def to_dict(self):
        """Convert task to dictionary for API responses."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "task_type": self.task_type,
            "status": self.status,
            "input_data": self.input_data,
            "result_data": self.result_data,
            "error_message": self.error_message,
            "error_details": self.error_details,
            "priority": self.priority,
            "progress": self.progress,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": (
                self.completed_at.isoformat() if self.completed_at else None
            ),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
