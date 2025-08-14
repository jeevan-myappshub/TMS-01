import random
from datetime import date, timedelta, datetime, time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config.config import SQLALCHEMY_DATABASE_URI
from models.base import Base
from models.department import Department
from models.designation import Designation
from models.employee import Employee
from models.project import Project
from models.dailylogs import DailyLog
from models.dailylogchanges import DailyLogChange
from models.managerproject import ManagerProjectAssignment
from models.employeeproject import EmployeeProject

engine = create_engine(SQLALCHEMY_DATABASE_URI)
Session = sessionmaker(bind=engine)
session = Session()
Base.metadata.create_all(engine)

# Insert or update departments
def seed_departments():
    department_names = ["Engineering", "HR", "Sales", "Marketing", "Finance"]
    departments = []
    for name in department_names:
        dept = session.query(Department).filter_by(name=name).first()
        if not dept:
            dept = Department(name=name)
            session.add(dept)
        else:
            dept.name = name  # Update name if needed
        departments.append(dept)
    session.commit()
    return session.query(Department).all()

# Insert or update designations
def seed_designations(departments):
    designation_titles = [
        "Manager", "Senior Engineer", "Junior Engineer", "HR Executive", "Sales Executive",
        "Marketing Specialist", "Accountant", "Lead", "Analyst", "Coordinator"
    ]
    designations = []
    for dept in departments:
        used_titles = set()
        for _ in range(2):  # 2 designations per department
            while True:
                title = random.choice(designation_titles)
                if title not in used_titles:
                    used_titles.add(title)
                    break
            des = session.query(Designation).filter_by(title=title, department_id=dept.id).first()
            if not des:
                des = Designation(title=title, department_id=dept.id)
                session.add(des)
            else:
                des.title = title  # Update title if needed
            designations.append(des)
    session.commit()
    return session.query(Designation).all()

# Insert or update employees
def seed_employees(departments, designations):
    employee_names = [
        "Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", "Heidi", "Ivan", "Judy",
        "Karl", "Laura", "Mallory", "Niaj", "Olivia", "Peggy", "Quentin", "Rupert", "Sybil", "Trent",
        "Uma", "Victor", "Wendy", "Xavier", "Yvonne", "Zach", "Aaron", "Beth", "Cathy", "Derek",
        "Ethan", "Fiona", "Gina", "Hank", "Irene", "Jack", "Kim", "Liam", "Mona", "Nate",
        "Oscar", "Paula", "Quinn", "Rita", "Sam", "Tina", "Ursula", "Vince", "Will", "Zoe"
    ]
    employees = []
    for i in range(50):
        name = employee_names[i % len(employee_names)] + f" {i+1}"
        email = f"{name.replace(' ', '.').lower()}@example.com"
        dept = random.choice(departments)
        desigs = [d for d in designations if d.department_id == dept.id]
        designation = random.choice(desigs)
        reports_to_id = None if i == 0 else employees[random.randint(0, i-1)].id
        emp = session.query(Employee).filter_by(email=email).first()
        if not emp:
            emp = Employee(
                employee_name=name,
                email=email,
                department_id=dept.id,
                designation_id=designation.id,
                reports_to_id=reports_to_id
            )
            session.add(emp)
        else:
            emp.employee_name = name
            emp.department_id = dept.id
            emp.designation_id = designation.id
            emp.reports_to_id = reports_to_id
        employees.append(emp)
    session.commit()
    return session.query(Employee).all()

# Insert or update projects
def seed_projects():
    project_names = [f"Project {chr(65 + i)}" for i in range(10)]
    projects = []
    for pn in project_names:
        proj = session.query(Project).filter_by(name=pn).first()
        if not proj:
            proj = Project(name=pn, description=f"Description for {pn}")
            session.add(proj)
        else:
            proj.description = f"Description for {pn}"
        projects.append(proj)
    session.commit()
    return session.query(Project).all()

# Insert daily logs (no update, just add new for demo)
def seed_daily_logs(employees, projects):
    daily_logs = []
    for emp in employees:
        used_dates = set()
        for _ in range(random.randint(1, 3)):
            while True:
                log_date = date.today() - timedelta(days=random.randint(0, 30))
                if log_date not in used_dates:
                    used_dates.add(log_date)
                    break
            project = random.choice(projects)
            start_hour = random.randint(8, 16)
            duration = random.randint(1, 3)
            start_time_obj = time(hour=start_hour)
            end_time_obj = time(hour=min(start_hour + duration, 23))
            total_hours = end_time_obj.hour - start_time_obj.hour
            log = DailyLog(
                employee_id=emp.id,
                project_id=project.id,
                log_date=log_date,
                start_time=start_time_obj,
                end_time=end_time_obj,
                total_hours=total_hours,
                task_description=f"{emp.employee_name} worked on {project.name}"
            )
            session.add(log)
            daily_logs.append(log)
    session.commit()
    return session.query(DailyLog).all()

# Insert daily log changes (no update, just add new for demo)
def seed_log_changes(daily_logs, projects):
    log_changes = []
    for log in random.sample(daily_logs, k=min(30, len(daily_logs))):
        project = random.choice(projects)
        change = DailyLogChange(
            daily_log_id=log.id,
            project_id=project.id,
            changed_at=datetime.utcnow(),
            new_description=f"Updated: {log.task_description} (change)"
        )
        session.add(change)
        log_changes.append(change)
    session.commit()


def seed_employee_projects(employees, projects):
    assignments = []
    for emp in employees:
        # Each employee gets 2 random projects
        assigned_projects = random.sample(projects, k=min(2, len(projects)))
        for proj in assigned_projects:
            existing = session.query(EmployeeProject).filter_by(employee_id=emp.id, project_id=proj.id).first()
            if not existing:
                ep = EmployeeProject(employee_id=emp.id, project_id=proj.id)
                session.add(ep)
                assignments.append(ep)
    session.commit()
    return session.query(EmployeeProject).all()

# Insert or update manager-project-employee assignments
def seed_manager_project_assignments(employees, projects):
    assignments = []
    managers = [e for e in employees if "Manager" in (e.employee_name or "")]
    for proj in projects:
        if managers:
            manager = random.choice(managers)
            # Assign manager to project (employee_id=None)
            existing_mgr = session.query(ManagerProjectAssignment).filter_by(
                manager_id=manager.id, project_id=proj.id, employee_id=None
            ).first()
            if not existing_mgr:
                mgr_assignment = ManagerProjectAssignment(manager_id=manager.id, project_id=proj.id, employee_id=None)
                session.add(mgr_assignment)
                assignments.append(mgr_assignment)
            # Assign 2 random employees to this manager/project
            assigned_emps = random.sample([e for e in employees if e.id != manager.id], k=min(2, len(employees)-1))
            for emp in assigned_emps:
                existing_emp = session.query(ManagerProjectAssignment).filter_by(
                    manager_id=manager.id, project_id=proj.id, employee_id=emp.id
                ).first()
                if not existing_emp:
                    emp_assignment = ManagerProjectAssignment(manager_id=manager.id, project_id=proj.id, employee_id=emp.id)
                    session.add(emp_assignment)
                    assignments.append(emp_assignment)
    session.commit()
    return session.query(ManagerProjectAssignment).all()

def main():
    print("⚙️ Setting up database and seeding data...")
    departments = seed_departments()
    designations = seed_designations(departments)
    employees = seed_employees(departments, designations)
    projects = seed_projects()
    daily_logs = seed_daily_logs(employees, projects)
    seed_log_changes(daily_logs, projects)
    seed_employee_projects(employees, projects)
    seed_manager_project_assignments(employees, projects)
    print("✅ Successfully seeded all tables including employee-project and manager-project assignments!")

if __name__ == "__main__":
    main()