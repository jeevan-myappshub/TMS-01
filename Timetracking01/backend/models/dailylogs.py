from sqlalchemy import Column, Integer, String, ForeignKey, Date, Time, Float
from sqlalchemy.orm import relationship
from models.base import Base

class DailyLog(Base):
    __tablename__ = 'daily_logs'

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.id', ondelete='CASCADE'), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='SET NULL'), nullable=True)
    log_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    total_hours = Column(Float, nullable=False)
    task_description = Column(String(255), nullable=False)
    status_review = Column(String(50), nullable=False, default="Pending")
    reviewer_id = Column(Integer, ForeignKey('employees.id', ondelete='SET NULL'), nullable=True)
    rejection_reason = Column(String(255), nullable=True)

    employee = relationship(
    "Employee",
    back_populates="daily_logs",
    foreign_keys=[employee_id]
)
    project = relationship("Project", back_populates="daily_logs")
    daily_log_changes = relationship("DailyLogChange", back_populates="daily_log", cascade="all, delete-orphan")
    reviewer = relationship("Employee", foreign_keys=[reviewer_id])

    def as_dict(self):
        return {
            "id": self.id,
            "employee_name": self.employee.employee_name if self.employee else None,
            "employee_id": self.employee_id,
            "project_id": self.project_id,
            "project_name": self.project.name if self.project else None,
            "log_date": self.log_date.isoformat(),
            "start_time": self.start_time.strftime('%H:%M'),
            "end_time": self.end_time.strftime('%H:%M'),
            "total_hours": self.total_hours,
            "task_description": self.task_description,
            "status_review": self.status_review,
            "reviewer_id": self.reviewer_id,
            "reviewer_name": self.reviewer.employee_name if self.reviewer else None,
            "rejection_reason": self.rejection_reason
        }


