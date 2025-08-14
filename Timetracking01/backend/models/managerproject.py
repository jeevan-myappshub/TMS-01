from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from models.base import Base

class ManagerProjectAssignment(Base):
    __tablename__ = 'manager_project_assignments'
    id = Column(Integer, primary_key=True)
    manager_id = Column(Integer, ForeignKey('employees.id', ondelete='CASCADE'), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    employee_id = Column(Integer, ForeignKey('employees.id', ondelete='CASCADE'), nullable=False)

    __table_args__ = (UniqueConstraint('manager_id', 'project_id', 'employee_id', name='_manager_project_employee_uc'),)

    manager = relationship("Employee", foreign_keys=[manager_id])
    employee = relationship("Employee", foreign_keys=[employee_id])
    project = relationship("Project")

    def as_dict(self):
        return {
            "id": self.id,
            "manager_id": self.manager_id,
            "manager_name": self.manager.employee_name if self.manager else None,
            "project_id": self.project_id,
            "project_name": self.project.name if self.project else None,
            "employee_id": self.employee_id,
            "employee_name": self.employee.employee_name if self.employee else None
        }