from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from models.base import Base
from models.employeeproject import EmployeeProject

class Employee(Base):
    __tablename__ = 'employees'

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey('departments.id', ondelete='CASCADE'))
    designation_id = Column(Integer, ForeignKey('designations.id', ondelete='SET NULL'))
    reports_to_id = Column(Integer, ForeignKey('employees.id'), nullable=True)

    department = relationship("Department", back_populates="employees")
    designation = relationship("Designation", back_populates="employees")

    # Self-referencing manager
    manager = relationship("Employee", remote_side=[id], backref="subordinates")

    # CORRECT (specify which FK to use)
    daily_logs = relationship(
        "DailyLog",
        back_populates="employee",
        foreign_keys="DailyLog.employee_id"
    )
    employee_projects = relationship(
        "EmployeeProject",
        back_populates="employee",
        cascade="all, delete-orphan"
    )

    def as_dict(self):
        data = {col.name: getattr(self, col.name) for col in self.__table__.columns}
        if self.manager:
            data['reports_to'] = self.manager.employee_name
        return data