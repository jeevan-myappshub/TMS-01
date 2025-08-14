from flask import Flask,request,jsonify 
from flask_sqlalchemy import SQLAlchemy 
from flask_cors import CORS 
from sqlalchemy import or_ , and_
from sqlalchemy.exc import IntegrityError
import re 
from datetime import datetime,timedelta,date 
from pytz import timezone 
from config.config import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS
from models.employee import Employee
from models.department import Department
from models.designation import Designation
from models.dailylogs import DailyLog
from models.dailylogchanges import DailyLogChange
from models.project import Project
from utils.helpers import safe_close, get_total_hours, parse_time
from models.base import Base
from utils.helpers import validate_time
from utils.session_manager import get_session
from models.employeeproject import EmployeeProject
from models.managerproject import ManagerProjectAssignment



from handlers.employee.employee import get_employee_profile_with_hierarchy, get_employees_with_details, add_employee, get_dashboard_init,update_reviewer_for_employee
from handlers.dailylogchanges.dailylogchanges import get_daily_log_changes
from handlers.dailylogs.dailylogs import get_daily_logs_by_employeee, get_latest_seven_days_daily_logs,get_logs_by_reviewer,save_daily_logs,update_log_review_status,get_todays_logs
from handlers.department.department import get_departments, add_department, update_department, delete_department
from handlers.designation.designation import fetch_designations, add_designation, update_designation, delete_designation
# from handlers.project.project import list_projects,add_project

# ,get_logs_by_reviewer

from handlers.admin_dashboard.admin import analytics_timesheet
from handlers.project.project import list_projects_for_user,add_project ,list_projects



app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS
db = SQLAlchemy(app)

# Endpoints


# employee and dashboard endpoints   

@app.route("/api/employees/profile-with-hierarchy", methods=["GET"])
def hirarchy():
    return get_employee_profile_with_hierarchy()

@app.route("/api/dashboard/init", methods=["GET"])
def dashboard_init():
    return get_dashboard_init()

@app.route("/api/employees/with-details", methods=["GET"])
def list_employees_with_details():
    return get_employees_with_details()

@app.route("/api/employees", methods=["POST"])
def create_employee():
    return add_employee()

@app.route("/api/employees/update-reviewer/<int:employee_id>", methods=["PUT"])
def update_employee_reviewer(employee_id):
    return update_reviewer_for_employee(employee_id)

@app.route("/api/employees",methods=["GET"])
def get_employees():
    """
    Returns a list of employees with their details.
    """
    session = get_session()
    try:
        employees = session.query(Employee).all()
        return jsonify([emp.as_dict() for emp in employees]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)



#daily log changes endpoints 

@app.route("/api/daily-logs/<int:log_id>/changes", methods=["GET"])
def daily_log_changes(log_id):
    return get_daily_log_changes(log_id)


# department endpoints 

@app.route("/api/departments/<int:dept_id>", methods=["DELETE"])
def delete_dept(dept_id):
    return delete_department(dept_id)
@app.route("/api/departments/<int:dept_id>", methods=["PUT"])
def update_dept(dept_id):
    return update_department(dept_id)
@app.route("/api/departments", methods=["POST"])
def create_department():
    return add_department()
@app.route("/api/departments", methods=["GET"])
def list_departments():
    return get_departments()



#  designation endpoints 

@app.route("/api/designations", methods=["GET"])
def get_designations():
    return fetch_designations()

@app.route("/api/designations", methods=["POST"])
def add_designationn():
    return add_designation()

@app.route("/api/designations/<int:des_id>", methods=["PUT"])
def update_designation(des_id):
    return update_designation(des_id)
@app.route("/api/designations/<int:des_id>", methods=["DELETE"])
def delete_designation(des_id):
    return delete_designation(des_id)



# project endpoints
@app.route("/api/projectss", methods=["GET"])
def list_project_by_id():
    return list_projects_for_user()

# project endpoints
@app.route("/api/projects", methods=["GET"])
def list_project():
    return list_projects()

@app.route('/api/projects', methods=['POST'])
def handle_add_project():
    return add_project()


# Daily Logs Endpoints

@app.route("/api/daily-logs/by-employee", methods=["GET"])
def get_daily_logs_by_employee():
    return get_daily_logs_by_employeee()

@app.route("/api/daily-logs/latest-seven-days/<int:employee_id>", methods=["GET"])
def get_latest_seven_days_logs(employee_id):
    return get_latest_seven_days_daily_logs(employee_id)

# @app.route("/api/daily-logs/save", methods=["POST"])
# def save_daily_logs():
#     return save_daily_logs()

# @app.route("/api/daily-logs/today/<int:employee_id>", methods=["GET"])
# def get_todays_logs(employee_id):
#     return get_todays_logs(employee_id)





@app.route("/api/daily-logs/review", methods=["POST"])
def review_daily_log():
    return update_log_review_status()

@app.route("/api/daily-logs/by-reviewer", methods=["GET"])
def daily_logs_by_reviewer():
    """
    Query Parameters:
      - reviewer_id: int (required)
      - start_date: string (YYYY-MM-DD, optional)
      - end_date: string (YYYY-MM-DD, optional)
      - project_id: int (optional)
      - status_review: string (optional)
    Returns:
      {
        "logs": [...],
        "projects": [...]
      }
    """
    reviewer_id = request.args.get("reviewer_id", type=int)
    if not reviewer_id:
        return jsonify({"error": "reviewer_id is required"}), 400

    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    project_id = request.args.get("project_id", type=int)
    status_review = request.args.get("status_review")

    session = get_session()
    try:
        query = session.query(DailyLog).filter(DailyLog.reviewer_id == reviewer_id)
        if start_date:
            query = query.filter(DailyLog.log_date >= start_date)
        if end_date:
            query = query.filter(DailyLog.log_date <= end_date)
        if project_id:
            query = query.filter(DailyLog.project_id == project_id)
        if status_review and status_review != "all":
            query = query.filter(DailyLog.status_review == status_review)

        logs = query.order_by(DailyLog.log_date.desc()).all()

        # Build unique projects from logs
        project_ids = {log.project_id for log in logs if log.project_id}
        projects = session.query(Project).filter(Project.id.in_(project_ids)).all()
        projects_data = [proj.as_dict() for proj in projects]

        return jsonify({
            "logs": [log.as_dict() for log in logs],
            "projects": projects_data
        }), 200
    finally:
        safe_close(session)


# @app.route("/api/daily-logs/by-reviewer", methods=["GET"])
# def daily_logs_by_reviewer():
#     return get_reviewer_logs()

# def get_logs_by_reviewer():
#     """
#     Query Parameters:
#       - reviewer_id: int (required)
#       - start_date: string (YYYY-MM-DD, optional)
#       - end_date: string (YYYY-MM-DD, optional)
#       - project_id: int (optional)
#       - status_review: string (optional, e.g., 'Pending', 'Approved', 'Rejected', 'all')
#     Example:
#       /api/daily-logs/by-reviewer?reviewer_id=1&start_date=2025-07-01&end_date=2025-07-07&project_id=3&status_review=Pending
#     """
#     reviewer_id = request.args.get("reviewer_id", type=int)
#     if not reviewer_id:
#         return jsonify({"error": "reviewer_id is required"}), 400

#     start_date = request.args.get("start_date")
#     end_date = request.args.get("end_date")
#     project_id = request.args.get("project_id", type=int)
#     status_review = request.args.get("status_review")

#     session = get_session()
#     try:
#         query = session.query(DailyLog).filter(DailyLog.reviewer_id == reviewer_id)

#         if start_date:
#             query = query.filter(DailyLog.log_date >= start_date)
#         if end_date:
#             query = query.filter(DailyLog.log_date <= end_date)
#         if project_id:
#             query = query.filter(DailyLog.project_id == project_id)
#         if status_review and status_review != "all":
#             query = query.filter(
#                 DailyLog.status_review == status_review if status_review != "Pending" else DailyLog.status_review.is_(None)
#             )

#         logs = query.order_by(DailyLog.log_date.desc()).all()
#         log_data = [log.as_dict() for log in logs]

#         # Get related projects
#         project_ids = list(set(log.project_id for log in logs if log.project_id))
#         projects = session.query(Project).filter(Project.id.in_(project_ids)).all() if project_ids else []
#         project_data = [proj.as_dict() for proj in projects]

#         return jsonify({"logs": log_data, "projects": project_data}), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
#     finally:
#         safe_close(session)

@app.route("/api/employees/<int:employee_id>/details", methods=["GET"])
def get_employee_details(employee_id):
    session = get_session()
    try:
        emp = session.query(Employee).filter_by(id=employee_id).first()
        if not emp:
            return jsonify({"error": "Employee not found"}), 404

        # Build manager hierarchy
        hierarchy = []
        current = emp
        visited = set()
        while current.reports_to_id and current.reports_to_id not in visited:
            visited.add(current.reports_to_id)
            manager = session.query(Employee).filter_by(id=current.reports_to_id).first()
            if not manager:
                break
            hierarchy.append({
                "id": manager.id,
                "employee_name": manager.employee_name,
                "email": manager.email,
                "designation": manager.designation.as_dict() if manager.designation else None,
                "department": manager.department.as_dict() if manager.department else None,
            })
            current = manager

        # Get related projects (from daily logs)
        project_ids = (
            session.query(DailyLog.project_id)
            .filter(DailyLog.employee_id == employee_id, DailyLog.project_id.isnot(None))
            .distinct()
            .all()
        )
        project_ids = [pid[0] for pid in project_ids]
        projects = (
            session.query(Project)
            .filter(Project.id.in_(project_ids))
            .all()
        )
        project_data = [proj.as_dict() for proj in projects]

        return jsonify({
            "id": emp.id,
            "employee_name": emp.employee_name,
            "email": emp.email,
            "department": emp.department.as_dict() if emp.department else None,
            "designation": emp.designation.as_dict() if emp.designation else None,
            "reports_to": emp.reports_to_id,
            "manager_hierarchy": hierarchy,
            "projects": project_data,  # <-- Only related projects
        }), 200
    finally:
        safe_close(session)


# @app.route("/api/daily-logs/filter/<int:employee_id>", methods=["GET"])
# def filter_daily_logs(employee_id):
#     """
#     Query Parameters:
#       - start_date: string (YYYY-MM-DD, optional)
#       - end_date: string (YYYY-MM-DD, optional)
#       - project_id: int (optional)
#       - status_review: string (optional, e.g., 'Pending', 'Approved', 'Rejected', 'all')
#     Example:
#       /api/daily-logs/filter/12?start_date=2025-07-01&end_date=2025-07-07&project_id=3&status_review=Pending
#     """
#     session = get_session()
#     try:
#         start_date = request.args.get("start_date")
#         end_date = request.args.get("end_date")
#         project_id = request.args.get("project_id", type=int)
#         status_review = request.args.get("status_review")

#         query = session.query(DailyLog).filter(DailyLog.employee_id == employee_id, DailyLog.reviewer_id == request.args.get("reviewer_id", type=int))

#         if start_date:
#             query = query.filter(DailyLog.log_date >= start_date)
#         if end_date:
#             query = query.filter(DailyLog.log_date <= end_date)
#         if project_id:
#             query = query.filter(DailyLog.project_id == project_id)
#         if status_review and status_review != "all":
#             query = query.filter(
#                 DailyLog.status_review == status_review if status_review != "Pending" else DailyLog.status_review.is_(None)
#             )

#         logs = query.order_by(DailyLog.log_date.desc()).all()
#         log_data = [log.as_dict() for log in logs]

#         # Get related projects
#         project_ids = list(set(log.project_id for log in logs if log.project_id))
#         projects = session.query(Project).filter(Project.id.in_(project_ids)).all() if project_ids else []
#         project_data = [proj.as_dict() for proj in projects]

#         return jsonify({"logs": log_data, "projects": project_data}), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
#     finally:
#         safe_close(session)


# @app.route("/api/daily-logs/by-reviewer", methods=["GET"])
# def get_logs_by_reviewer():
#     """
#     Query Parameters:
#       - reviewer_id: int (required)
#       - start_date: string (YYYY-MM-DD, optional)
#       - end_date: string (YYYY-MM-DD, optional)
#       - project_id: int (optional)
#       - status_review: string (optional, e.g., 'Pending', 'Approved', 'Rejected')
#     Example:
#       /api/daily-logs/by-reviewer?reviewer_id=1
#     """
#     session = get_session()
#     try:
#         reviewer_id = request.args.get("reviewer_id", type=int)
#         start_date = request.args.get("start_date")
#         end_date = request.args.get("end_date")
#         project_id = request.args.get("project_id", type=int)
#         status_review = request.args.get("status_review")

#         if not reviewer_id:
#             return jsonify({"error": "reviewer_id is required"}), 400

#         query = session.query(DailyLog).filter_by(reviewer_id=reviewer_id)
#         if start_date:
#             query = query.filter(DailyLog.log_date >= start_date)
#         if end_date:
#             query = query.filter(DailyLog.log_date <= end_date)
#         if project_id:
#             query = query.filter(DailyLog.project_id == project_id)
#         if status_review and status_review != "all":
#             query = query.filter(
#                 DailyLog.status_review == status_review if status_review != "Pending" else DailyLog.status_review.is_(None)
#             )

#         logs = query.order_by(DailyLog.log_date.desc()).all()
#         log_data = [log.as_dict() for log in logs]

#         # Get related projects
#         project_ids = list(set(log.project_id for log in logs if log.project_id))
#         projects = session.query(Project).filter(Project.id.in_(project_ids)).all() if project_ids else []
#         project_data = [proj.as_dict() for proj in projects]

#         return jsonify({"logs": log_data, "projects": project_data}), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
#     finally:
#         safe_close(session)

# Run the app


def get_manager_hierarchy(employee, session, hierarchy=None):
    if hierarchy is None:
        hierarchy = []
    if employee.reports_to_id:
        manager = session.query(Employee).filter_by(id=employee.reports_to_id).first()
        if manager:
            hierarchy.append({
                'id': manager.id,
                'employee_name': manager.employee_name,
                'email': manager.email,
                'designation': {'title': manager.designation.title} if manager.designation else None
            })
            get_manager_hierarchy(manager, session, hierarchy)
    return hierarchy

@app.route('/api/employee-info', methods=['GET'])
def get_employee_info():
    email = request.args.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    session = get_session()
    try:
        # Fetch employee
        employee = session.query(Employee).filter_by(email=email).first()
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404

        # Fetch related details
        department = session.query(Department).filter_by(id=employee.department_id).first()
        designation = session.query(Designation).filter_by(id=employee.designation_id).first()
        manager_hierarchy = get_manager_hierarchy(employee, session)
        manager = session.query(Employee).filter_by(id=employee.reports_to_id).first()

        # 🔹 Merge project logic from list_projects_for_user
        user_id = employee.id

        manager_projects = (
            session.query(Project)
            .join(ManagerProjectAssignment, Project.id == ManagerProjectAssignment.project_id)
            .filter(ManagerProjectAssignment.manager_id == user_id)
            .all()
        )

        manager_employee_projects = (
            session.query(Project)
            .join(ManagerProjectAssignment, Project.id == ManagerProjectAssignment.project_id)
            .filter(ManagerProjectAssignment.employee_id == user_id)
            .all()
        )

        employee_projects = (
            session.query(Project)
            .join(EmployeeProject, Project.id == EmployeeProject.project_id)
            .filter(EmployeeProject.employee_id == user_id)
            .all()
        )

        # Remove duplicates by project ID
        all_projects = {p.id: p for p in (manager_projects + manager_employee_projects + employee_projects)}

        response = {
            'employee': {
                'id': employee.id,
                'employee_name': employee.employee_name,
                'email': employee.email,
                'reports_to': manager.employee_name if manager else None
            },
            'department': {'id': department.id, 'name': department.name} if department else None,
            'designation': {'id': designation.id, 'title': designation.title} if designation else None,
            'projects': [p.as_dict() for p in all_projects.values()],
            'manager_hierarchy': manager_hierarchy
        }
        return jsonify(response), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)



# @app.route('/api/employee-info', methods=['GET'])
# def get_employee_info():
#     email = request.args.get('email')
#     if not email:
#         return jsonify({'error': 'Email is required'}), 400

#     session = get_session()
#     try:
#         employee = session.query(Employee).filter_by(email=email).first()
#         if not employee:
#             return jsonify({'error': 'Employee not found'}), 404

#         department = session.query(Department).filter_by(id=employee.department_id).first()
#         designation = session.query(Designation).filter_by(id=employee.designation_id).first()
#         projects = session.query(Project).all()
#         manager_hierarchy = get_manager_hierarchy(employee, session)
#         manager = session.query(Employee).filter_by(id=employee.reports_to_id).first()

#         response = {
#             'employee': {
#                 'id': employee.id,
#                 'employee_name': employee.employee_name,
#                 'email': employee.email,
#                 'reports_to': manager.employee_name if manager else None
#             },
#             'department': {'id': department.id, 'name': department.name} if department else None,
#             'designation': {'id': designation.id, 'title': designation.title} if designation else None,
#             'projects': [{'id': p.id, 'name': p.name} for p in projects],
#             'manager_hierarchy': manager_hierarchy
#         }
#         return jsonify(response), 200
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500
#     finally:
#         safe_close(session)


# @app.route('/api/daily-logs/save', methods=['POST'])
# def save_daily_logs():
#     data = request.get_json()
#     if not isinstance(data, list):
#         return jsonify({'error': 'Input must be a list of logs'}), 400

#     session = get_session()
#     try:
#         for log_data in data:
#             log_id = log_data.get('id')
#             employee_id = log_data.get('employee_id')
#             log_date = log_data.get('log_date')
#             project_id = log_data.get('project_id')
#             start_time = log_data.get('start_time')
#             end_time = log_data.get('end_time')
#             task_description = log_data.get('task_description')

#             if not all([employee_id, log_date, project_id, start_time, end_time, task_description]):
#                 return jsonify({'error': 'Missing required fields'}), 400

#             # Validate time formats
#             if not validate_time(start_time) or not validate_time(end_time):
#                 return jsonify({'error': 'Invalid time format for start_time or end_time. Use HH:MM.'}), 400

#             try:
#                 log_date = datetime.strptime(log_date, '%Y-%m-%d').date()
#                 start_time_obj = parse_time(start_time)
#                 end_time_obj = parse_time(end_time)
#                 total_hours_float = get_total_hours(start_time_obj, end_time_obj)
#             except ValueError as e:
#                 return jsonify({'error': f'Invalid date or time format: {str(e)}'}), 400

#             if total_hours_float <= 0:
#                 return jsonify({'error': 'End time must be after start time'}), 400

#             employee = session.query(Employee).filter_by(id=employee_id).first()
#             if not employee:
#                 return jsonify({'error': f'Employee with id {employee_id} not found'}), 404

#             project = session.query(Project).filter_by(id=project_id).first()
#             if not project:
#                 return jsonify({'error': f'Project with id {project_id} not found'}), 404

#             # Check for overlapping time ranges
#             existing_logs = session.query(DailyLog).filter(
#                 DailyLog.employee_id == employee_id,
#                 DailyLog.log_date == log_date,
#                 DailyLog.id != log_id  # Exclude the current log if updating
#             ).all()
#             for existing_log in existing_logs:
#                 existing_start = existing_log.start_time
#                 existing_end = existing_log.end_time
#                 if start_time_obj < existing_end and end_time_obj > existing_start:
#                     return jsonify({'error': f'Time range overlaps with existing log for project {existing_log.project_id}'}), 400

#             if log_id and log_id != 'null':
#                 log = session.query(DailyLog).filter_by(id=log_id, employee_id=employee_id).first()
#                 if not log:
#                     return jsonify({'error': f'Log with id {log_id} not found'}), 404
#                 old_description = log.task_description
#                 log.project_id = project_id
#                 log.log_date = log_date
#                 log.start_time = start_time_obj
#                 log.end_time = end_time_obj
#                 log.total_hours = total_hours_float
#                 log.task_description = task_description
#                 if old_description != task_description:
#                     change = DailyLogChange(
#                         daily_log_id=log_id,
#                         project_id=project_id,
#                         new_description=task_description,
#                         changed_at=datetime.utcnow()
#                     )
#                     session.add(change)
#             else:
#                 log = DailyLog(
#                     employee_id=employee_id,
#                     log_date=log_date,
#                     project_id=project_id,
#                     start_time=start_time_obj,
#                     end_time=end_time_obj,
#                     total_hours=total_hours_float,
#                     task_description=task_description
#                 )
#                 session.add(log)
#                 session.flush()  # Flush to get the log.id
#                 # Store initial description in daily_log_changes
#                 change = DailyLogChange(
#                     daily_log_id=log.id,
#                     project_id=project_id,
#                     new_description=task_description,
#                     changed_at=datetime.utcnow()
#                 )
#                 session.add(change)

#         session.commit()
#         return jsonify({'message': 'Logs saved successfully'})
#     except Exception as e:
#         session.rollback()
#         return jsonify({'error': str(e)}), 500
#     finally:
#         safe_close(session)



@app.route('/api/daily-logs/save', methods=['POST'])
def save_daily_logs():
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({'error': 'Input must be a list of logs'}), 400

    session = get_session()
    try:
        for log_data in data:
            log_id = log_data.get('id')
            employee_id = log_data.get('employee_id')
            log_date = log_data.get('log_date')
            project_id = log_data.get('project_id')
            start_time = log_data.get('start_time')
            end_time = log_data.get('end_time')
            task_description = log_data.get('task_description')

            if not all([employee_id, log_date, project_id, start_time, end_time, task_description]):
                return jsonify({'error': 'Missing required fields'}), 400

            # Validate time formats
            if not validate_time(start_time) or not validate_time(end_time):
                return jsonify({'error': 'Invalid time format for start_time or end_time. Use HH:MM.'}), 400

            try:
                log_date = datetime.strptime(log_date, '%Y-%m-%d').date()
                start_time_obj = parse_time(start_time)
                end_time_obj = parse_time(end_time)
                total_hours_float = get_total_hours(start_time_obj, end_time_obj)
            except ValueError as e:
                return jsonify({'error': f'Invalid date or time format: {str(e)}'}), 400

            if total_hours_float <= 0:
                return jsonify({'error': 'End time must be after start time'}), 400

            employee = session.query(Employee).filter_by(id=employee_id).first()
            if not employee:
                return jsonify({'error': f'Employee with id {employee_id} not found'}), 404

            project = session.query(Project).filter_by(id=project_id).first()
            if not project:
                return jsonify({'error': f'Project with id {project_id} not found'}), 404

            # Get reviewer_id from employee's manager
            reviewer_id = employee.reports_to_id

            # Check for overlapping time ranges
            existing_logs = session.query(DailyLog).filter(
                DailyLog.employee_id == employee_id,
                DailyLog.log_date == log_date,
                DailyLog.id != log_id  # Exclude the current log if updating
            ).all()
            for existing_log in existing_logs:
                existing_start = existing_log.start_time
                existing_end = existing_log.end_time
                if start_time_obj < existing_end and end_time_obj > existing_start:
                    return jsonify({'error': f'Time range overlaps with existing log for project {existing_log.project_id}'}), 400

            if log_id and log_id != 'null':
                log = session.query(DailyLog).filter_by(id=log_id, employee_id=employee_id).first()
                if not log:
                    return jsonify({'error': f'Log with id {log_id} not found'}), 404
                old_description = log.task_description
                log.project_id = project_id
                log.log_date = log_date
                log.start_time = start_time_obj
                log.end_time = end_time_obj
                log.total_hours = total_hours_float
                log.task_description = task_description
                log.reviewer_id = reviewer_id  # <-- Set reviewer
                if old_description != task_description:
                    change = DailyLogChange(
                        daily_log_id=log_id,
                        project_id=project_id,
                        new_description=task_description,
                        changed_at=datetime.utcnow()
                    )
                    session.add(change)
            else:
                log = DailyLog(
                    employee_id=employee_id,
                    log_date=log_date,
                    project_id=project_id,
                    start_time=start_time_obj,
                    end_time=end_time_obj,
                    total_hours=total_hours_float,
                    task_description=task_description,
                    reviewer_id=reviewer_id  # <-- Set reviewer
                )
                session.add(log)
                session.flush()  # Flush to get the log.id
                # Store initial description in daily_log_changes
                change = DailyLogChange(
                    daily_log_id=log.id,
                    project_id=project_id,
                    new_description=task_description,
                    changed_at=datetime.utcnow()
                )
                session.add(change)

        session.commit()
        return jsonify({'message': 'Logs saved successfully'})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

@app.route('/api/daily-logs/today/<int:employee_id>', methods=['GET'])
def get_todays_logs(employee_id):
    session = get_session()
    try:
        today = datetime.now(timezone('Asia/Kolkata')).date().strftime('%Y-%m-%d')
        logs = session.query(DailyLog).filter_by(employee_id=employee_id, log_date=today).all()
        response = [{
            'id': log.id,
            'project_id': log.project_id,
            'task_description': log.task_description,
            'start_time': log.start_time.strftime('%H:%M') if log.start_time else '',
            'end_time': log.end_time.strftime('%H:%M') if log.end_time else '',
            'total_hours': log.total_hours,
            'log_date': log.log_date.isoformat() if log.log_date else '',
            'status_review':log.status_review,
            'changes': [{
                'id': change.id,
                'project_id': change.project_id,
                'new_description': change.new_description,
                'changed_at': change.changed_at.isoformat(),
                'status_review':change.status_review
            } for change in session.query(DailyLogChange).filter_by(daily_log_id=log.id).all()]
        } for log in logs]
        return jsonify(response), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)



#THis api is for the admin perspective 



@app.route("/api/daily-logs/filter/<int:employee_id>", methods=["GET"])
def filter_daily_logss(employee_id):
    """
    Filter daily logs based on optional query parameters.

    Query Parameters:
      - start_date: string (YYYY-MM-DD, optional)
      - end_date: string (YYYY-MM-DD, optional)
      - project_id: int (optional)
      - status_review: string (optional, e.g., 'Pending', 'Approved', 'Rejected', 'all')
      - reviewer_id: int (optional)

    Example:
      /api/daily-logs/filter/12?start_date=2025-07-01&end_date=2025-07-07&project_id=3&status_review=Pending&reviewer_id=5
    """
    session = get_session()

    def parse_date(date_str):
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return None

    try:
        start_date = parse_date(request.args.get("start_date"))
        end_date = parse_date(request.args.get("end_date"))
        project_id = request.args.get("project_id", type=int)
        status_review = request.args.get("status_review")
        reviewer_id = request.args.get("reviewer_id", type=int)

        # Base query
        query = session.query(DailyLog).filter(DailyLog.employee_id == employee_id)

        # Optional filters
        if reviewer_id:
            query = query.filter(DailyLog.reviewer_id == reviewer_id)
        if start_date:
            query = query.filter(DailyLog.log_date >= start_date)
        if end_date:
            query = query.filter(DailyLog.log_date <= end_date)
        if project_id:
            query = query.filter(DailyLog.project_id == project_id)
        if status_review and status_review != "all":
            if status_review == "Pending":
                query = query.filter(DailyLog.status_review.is_(None))
            else:
                query = query.filter(DailyLog.status_review == status_review)

        logs = query.order_by(DailyLog.log_date.desc()).all()
        log_data = [log.as_dict() for log in logs]

        # Related projects
        project_ids = list(set(log.project_id for log in logs if log.project_id))
        projects = session.query(Project).filter(Project.id.in_(project_ids)).all() if project_ids else []
        project_data = [proj.as_dict() for proj in projects]

        return jsonify({"logs": log_data, "projects": project_data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        safe_close(session)

@app.route("/api/daily-logs/fi/<int:employee_id>", methods=["GET"])
def filter_daily_logs(employee_id):
    """
    Retrieve daily logs for a specific employee with optional filters for date range, project, and status.
    
    Query Parameters:
        - start_date (str, optional): Start date in YYYY-MM-DD format.
        - end_date (str, optional): End date in YYYY-MM-DD format.
        - project_id (str, optional): ID of the project to filter by.
        - status_review (str, optional): Status to filter by (Pending, Approved, Rejected).
    
    Returns:
        - 200: JSON array of daily logs.
        - 400: Error message for invalid parameters.
        - 404: Error message if no logs found or project inaccessible.
        - 500: Error message for server issues.
    """
    try:
        # Extract query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        project_id = request.args.get('project_id')
        status_review = request.args.get('status_review')

        # Initialize query
        query = db.session.query(DailyLog).filter(DailyLog.employee_id == employee_id)

        # Validate and apply date filters
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(DailyLog.log_date >= start_date)
            except ValueError:
                return jsonify({'error': 'Invalid start_date format. Use YYYY-MM-DD.'}), 400

        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(DailyLog.log_date <= end_date)
            except ValueError:
                return jsonify({'error': 'Invalid end_date format. Use YYYY-MM-DD.'}), 400

        if start_date and end_date and start_date > end_date:
            return jsonify({'error': 'start_date must be before or equal to end_date.'}), 400

        # Apply project filter
        if project_id and project_id != 'all':
            try:
                project_id = int(project_id)
                # Verify project exists and is accessible to employee
                project = db.session.query(Project).filter(
                    and_(
                        Project.id == project_id,
                        Project.employee_id == employee_id  # Adjust based on your model relationships
                    )
                ).first()
                if not project:
                    return jsonify({'error': 'Project not found or not accessible.'}), 404
                query = query.filter(DailyLog.project_id == project_id)
            except ValueError:
                return jsonify({'error': 'Invalid project_id format.'}), 400

        # Apply status filter
        if status_review and status_review != 'all':
            if status_review not in ['Pending', 'Approved', 'Rejected']:
                return jsonify({'error': 'Invalid status_review. Must be Pending, Approved, or Rejected.'}), 400
            query = query.filter(DailyLog.status_review == status_review)

        # Default to last 7 days if no date filters provided
        if not start_date and not end_date:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=6)
            query = query.filter(
                and_(
                    DailyLog.log_date >= start_date,
                    DailyLog.log_date <= end_date
                )
            )

        # Execute query
        logs = query.order_by(DailyLog.log_date.desc(), DailyLog.start_time.asc()).all()

        # Always return an array, even if empty
        logs_data = [{
            'id': log.id,
            'employee_id': log.employee_id,
            'log_date': log.log_date.strftime('%Y-%m-%d'),
            'project_id': log.project_id,
            'start_time': log.start_time.strftime('%H:%M') if log.start_time else None,
            'end_time': log.end_time.strftime('%H:%M') if log.end_time else None,
            'total_hours': float(log.total_hours) if log.total_hours is not None else None,
            'task_description': log.task_description,
            'status_review': log.status_review or 'Pending'
        } for log in logs]

        return jsonify(logs_data), 200

    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@app.route("/api/daily-logs/week/<int:employee_id>", methods=["GET"])
def get_weekly_logs(employee_id):
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    if not start_date or not end_date:
        return jsonify({"error": "Missing start_date or end_date"}), 400

    session = get_session()
    try:
        logs = (
            session.query(DailyLog)
            .filter(
                DailyLog.employee_id == employee_id,
                DailyLog.log_date >= start_date,
                DailyLog.log_date <= end_date,
            )
            .all()
        )
        result = [log.as_dict() for log in logs]
        return jsonify(result)
    finally:
        session.close()


@app.route("/api/analytics/timesheet", methods=["GET"])
def get_timesheet_analytics():
    return analytics_timesheet()



@app.route('/api/manager_project/assign', methods=['POST'])
def assign_employee():
    session = get_session()
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"detail": "Invalid or missing JSON body"}), 400

        manager_id = data.get('manager_id')
        project_id = data.get('project_id')
        employee_id = data.get('employee_id')

        if not all([manager_id, project_id, employee_id]):
            return jsonify({"detail": "Missing required fields"}), 400

        # Check project exists
        project = session.query(Project).filter_by(id=project_id).first()
        if not project:
            return jsonify({"detail": "Project not found"}), 404

        # Check manager is assigned to project (via ManagerProjectAssignment or EmployeeProject)
        manager_assignment = session.query(ManagerProjectAssignment).filter_by(
            manager_id=manager_id, project_id=project_id, employee_id=None
        ).first()
        if not manager_assignment:
            manager_project = session.query(EmployeeProject).filter_by(
                employee_id=manager_id, project_id=project_id
            ).first()
            if not manager_project:
                return jsonify({"detail": "Manager not assigned to this project"}), 403

        # Prevent duplicate in ManagerProjectAssignment
        manager_employee_assignment = session.query(ManagerProjectAssignment).filter_by(
            manager_id=manager_id, project_id=project_id, employee_id=employee_id
        ).first()
        if manager_employee_assignment:
            return jsonify({"detail": "Employee already assigned under this manager for the project"}), 409

        # Only record in ManagerProjectAssignment
        session.add(ManagerProjectAssignment(
            manager_id=manager_id,
            project_id=project_id,
            employee_id=employee_id
        ))

        session.commit()
        return jsonify({"message": "Employee assigned to manager's project successfully"}), 200

    except Exception as e:
        session.rollback()
        return jsonify({"detail": f"Failed to assign employee: {str(e)}"}), 500
    finally:
        safe_close(session)


@app.route('/api/manager_projects/<int:manager_id>', methods=['GET'])
def list_manager_assignments(manager_id):
    session = get_session()
    try:
        assignments = session.query(ManagerProjectAssignment).filter_by(
            manager_id=manager_id
        ).all()
        return jsonify([a.as_dict() for a in assignments]), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch manager assignments: {str(e)}"}), 500
    finally:
        safe_close(session)

@app.route('/api/manager_project/remove', methods=['DELETE'])
def remove_employee():
    session = get_session()
    try:
        data = request.get_json(silent=True)
        manager_id = data.get('manager_id')
        project_id = data.get('project_id')
        employee_id = data.get('employee_id')

        if not all([manager_id, project_id, employee_id]):
            return jsonify({"detail": "Missing required fields"}), 400

        # Remove from ManagerProjectAssignment
        assignment = session.query(ManagerProjectAssignment).filter_by(
            manager_id=manager_id,
            project_id=project_id,
            employee_id=employee_id
        ).first()

        if not assignment:
            return jsonify({"detail": "Assignment not found"}), 404

        session.delete(assignment)

        # Also remove from EmployeeProject
        emp_proj_assignment = session.query(EmployeeProject).filter_by(
            employee_id=employee_id,
            project_id=project_id
        ).first()

        if emp_proj_assignment:
            session.delete(emp_proj_assignment)

        session.commit()

        return jsonify({"message": "Employee removed successfully"}), 200

    except Exception as e:
        session.rollback()
        return jsonify({"detail": f"Failed to remove employee: {str(e)}"}), 500
    finally:
        safe_close(session)


@app.route('/api/employee_projects/<int:employee_id>', methods=['GET'])
def get_employee_projects(employee_id):
    session = get_session()
    try:
        # From ManagerProjectAssignment
        manager_assignments = session.query(ManagerProjectAssignment).filter(
            or_(
                ManagerProjectAssignment.employee_id == employee_id,
                ManagerProjectAssignment.manager_id == employee_id
            )
        ).all()

        # From EmployeeProject
        employee_assignments = session.query(EmployeeProject).filter_by(
            employee_id=employee_id
        ).all()

        # Combine project IDs from both tables
        project_ids = {a.project_id for a in manager_assignments} | {e.project_id for e in employee_assignments}

        if not project_ids:
            return jsonify([]), 200

        projects = session.query(Project).filter(Project.id.in_(project_ids)).all()

        result = [{"id": p.id, "name": p.name} for p in projects]
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch projects: {str(e)}"}), 500
    finally:
        safe_close(session)



@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    session = get_session()
    try:
        project = session.query(Project).filter_by(id=project_id).first()
        if not project:
            return jsonify({"error": f"Project with ID {project_id} not found"}), 404
        return jsonify({
            "id": project.id,
            "name": project.name
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch project: {str(e)}"}), 500
    finally:
        safe_close(session)


@app.route('/api/project_employees/<int:project_id>', methods=['GET'])
def get_project_employees(project_id):
    session = get_session()
    try:
        # Fetch employees assigned to the project via EmployeeProject
        employee_projects = session.query(EmployeeProject).filter_by(project_id=project_id).all()
        if not employee_projects:
            return jsonify([]), 200

        # Fetch employee details
        employee_ids = [ep.employee_id for ep in employee_projects]
        employees = session.query(Employee).filter(Employee.id.in_(employee_ids)).all()
        
        result = [
            {
                "employee_id": emp.id,
                "employee_name": emp.employee_name
            }
            for emp in employees
        ]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch project employees: {str(e)}"}), 500
    finally:
        safe_close(session)


@app.route('/api/daily-logs/all-reviewers/<int:employee_id>', methods=['GET'])
def get_all_daily_logs_for_employee(employee_id):
    """
    Returns all daily logs for an employee, regardless of reviewer.
    Optional query params: start_date, end_date, project_id, status_review
    """
    session = get_session()
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        project_id = request.args.get('project_id', type=int)
        status_review = request.args.get('status_review')

        query = session.query(DailyLog).filter(DailyLog.employee_id == employee_id)

        if start_date:
            query = query.filter(DailyLog.log_date >= start_date)
        if end_date:
            query = query.filter(DailyLog.log_date <= end_date)
        if project_id:
            query = query.filter(DailyLog.project_id == project_id)
        if status_review and status_review != "all":
            query = query.filter(DailyLog.status_review == status_review)

        logs = query.order_by(DailyLog.log_date.desc()).all()
        logs_data = [log.as_dict() for log in logs]

        return jsonify({"logs": logs_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)

@app.route('/api/projects/all', methods=['GET'])
def get_all_projects_with_managers_and_members():
    session = get_session()
    try:
        projects = session.query(Project).all()
        result = []

        for project in projects:
            # Get all EmployeeProject entries for this project (managers)
            manager_links = (
                session.query(EmployeeProject)
                .filter(EmployeeProject.project_id == project.id)
                .all()
            )

            managers = []
            team_members = []

            for manager_link in manager_links:
                manager = manager_link.employee
                managers.append({
                    "id": manager.id,
                    "name": manager.employee_name
                })

                # Get all team members assigned to this manager and project
                assignments = (
                    session.query(ManagerProjectAssignment)
                    .filter(
                        ManagerProjectAssignment.project_id == project.id,
                        ManagerProjectAssignment.manager_id == manager.id
                    )
                    .all()
                )
                for assignment in assignments:
                    team_member = assignment.employee
                    team_members.append({
                        "id": team_member.id,
                        "name": team_member.employee_name
                    })

            result.append({
                "project_id": project.id,
                "project_name": project.name,
                "description": project.description,
                "managers": managers,
                "team_members": team_members
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()



if __name__ == '__main__':
    app.run(debug=True)