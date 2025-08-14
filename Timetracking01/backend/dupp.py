import random
from datetime import date, timedelta, datetime, time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config.config import SQLALCHEMY_DATABASE_URI
from models.base import Base
from models.project import Project
from models.employee import Employee
from models.department import Department
from models.designation import Designation
from models.dailylogs import DailyLog
from models.dailylogchanges import DailyLogChange


engine = create_engine(SQLALCHEMY_DATABASE_URI)
Session = sessionmaker(bind=engine)
session = Session()
Base.metadata.create_all(engine)

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

def seed_log_changes(daily_logs, projects):
    log_changes = []
    sample_logs = random.sample(daily_logs, k=min(30, len(daily_logs)))
    for log in sample_logs:
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
    return log_changes

def main():
    print("⚙️ Seeding projects, daily logs, and daily log changes...")
    projects = seed_projects()
    employees = session.query(Employee).all()  # Assuming employees are already seeded
    daily_logs = seed_daily_logs(employees, projects)
    seed_log_changes(daily_logs, projects)
    print("✅ Seeding complete.")

if __name__ == "__main__":
    main()
