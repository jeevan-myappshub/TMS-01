from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from models.base import Base

class EmployeeProject(Base):
    __tablename__ = 'employee_projects'
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.id', ondelete='CASCADE'), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)

    __table_args__ = (UniqueConstraint('employee_id', 'project_id', name='_employee_project_uc'),)

    employee = relationship("Employee", back_populates="employee_projects")
    project = relationship("Project", back_populates="employee_projects")