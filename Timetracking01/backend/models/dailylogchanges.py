from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from models.base import Base
from datetime import datetime

class DailyLogChange(Base):
    __tablename__ = 'daily_log_changes'

    id = Column(Integer, primary_key=True)
    daily_log_id = Column(Integer, ForeignKey('daily_logs.id', ondelete='CASCADE'), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='SET NULL'), nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    new_description = Column(String(255), nullable=False)
    status_review = Column(String(50), nullable=False, default="Pending")  # Status: Pending, Approved, Rejected
    reviewer_id = Column(Integer, ForeignKey('employees.id', ondelete='SET NULL'), nullable=True)  # Tracks who reviewed
    rejection_reason = Column(String(255), nullable=True)  # Reason for rejection, if applicable

    daily_log = relationship("DailyLog", back_populates="daily_log_changes")
    project = relationship("Project", back_populates="daily_log_changes")
    reviewer = relationship("Employee", foreign_keys=[reviewer_id])

    def as_dict(self):
        return {
            "id": self.id,
            "daily_log_id": self.daily_log_id,
            "project_id": self.project_id,
            "changed_at": self.changed_at.isoformat(),
            "new_description": self.new_description,
            "status_review": self.status_review,
            "reviewer_id": self.reviewer_id,
            "reviewer_name": self.reviewer.employee_name if self.reviewer else None,
            "rejection_reason": self.rejection_reason
        }