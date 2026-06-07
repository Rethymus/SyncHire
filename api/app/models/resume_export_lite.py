"""Resume export records for local-first PDF and artifact tracking."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database_lite import Base


class ResumeExport(Base):
    """Exported artifact linked to a resume variant."""

    __tablename__ = "resume_exports"

    id = Column(UUID, primary_key=True)
    resume_variant_id = Column(UUID, ForeignKey("resume_variants.id"), nullable=False)
    export_format = Column(String(30), default="pdf", nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    checksum = Column(String(128))
    byte_size = Column(Integer)
    status = Column(String(50), default="created", nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    resume_variant = relationship("ResumeVariant", back_populates="exports")

    def __repr__(self):
        return f"<ResumeExport(id={self.id}, format={self.export_format})>"
