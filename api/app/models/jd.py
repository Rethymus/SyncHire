import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column,
    String,
    DateTime,
    Date,
    Text,
    ForeignKey,
    Boolean,
    Numeric,
    Integer,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import relationship
from app.core.database import Base


class JD(Base):
    __tablename__ = "jds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String, nullable=False)
    company = Column(String)
    content = Column(Text, nullable=False)
    parsed_data = Column(Text)  # JSON string
    embedding = Column(Vector(1536))

    # Advanced filtering fields
    salary_min = Column(Numeric(12, 2))
    salary_max = Column(Numeric(12, 2))
    salary_currency = Column(String(3), default="USD")
    salary_period = Column(String(20), default="yearly")

    location_city = Column(String(255))
    location_state = Column(String(255))
    location_country = Column(String(255), default="USA")
    location_remote = Column(Boolean, default=False)
    location_hybrid = Column(Boolean, default=False)
    location_onsite = Column(Boolean, default=True)

    experience_level = Column(String(20))
    employment_type = Column(String(20), default="full-time")
    industry = Column(String(255))
    company_size = Column(String(50))
    company_industry = Column(String(255))

    posted_date = Column(Date)
    application_deadline = Column(Date)

    # Search analytics fields
    search_tsvector = Column(Vector)  # Will be tsvector in database

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="jds")
