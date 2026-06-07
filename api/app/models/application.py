import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    resume_id = Column(
        UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False
    )
    jd_id = Column(
        UUID(as_uuid=True), ForeignKey("jds.id", ondelete="CASCADE"), nullable=False
    )
    match_score = Column(Float)
    match_details = Column(Text)  # JSON string
    optimized_resume = Column(Text)  # JSON string
    status = Column(
        String, default="pending"
    )  # pending, optimized, applied, interview, offer, rejected
    notes = Column(Text)
    tags = Column(JSON, default=list)  # Array of tags for categorization
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="applications")
    resume = relationship("Resume")
    jd = relationship("JD", backref="applications")
    status_history = relationship(
        "ApplicationStatusHistory",
        back_populates="application",
        order_by="ApplicationStatusHistory.changed_at.desc()",
        cascade="all, delete-orphan",
    )
    interviews = relationship(
        "Interview",
        back_populates="application",
        order_by="Interview.scheduled_date.desc()",
        cascade="all, delete-orphan",
    )
