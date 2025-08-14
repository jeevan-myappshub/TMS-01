from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config.config import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS
from datetime import datetime, timedelta
from sqlalchemy import or_
from utils.session_manager import get_session
from utils.helpers import safe_close  # <-- import safe_close from helpers.py
from models.employee import Employee
from models.department import Department
from models.designation import Designation
from models.dailylogs import DailyLog
from models.dailylogchanges import DailyLogChange
from models.project import Project
from sqlalchemy.exc import IntegrityError
import re
from pytz import timezone
from utils.custom_responses import create_error_response
from utils.exceptions_handlers import handle_exceptions
from utils.helpers import get_total_hours
from utils.helpers import  safe_close, get_total_hours, parse_time, validate_time


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS
db = SQLAlchemy(app)

# ---------------- Employee Profile with Department & Designation ----------------
@app.route("/api/employees/profile-with-hierarchy", methods=["GET"])
def get_employee_profile_with_hierarchy():
    email = request.args.get('email')
    session = get_session()
    try:
        emp = session.query(Employee).filter(Employee.email.ilike(email)).first()
        if not emp:
            return jsonify({'error': 'Employee not found.'}), 404

        # Manager hierarchy
        hierarchy = []
        current = emp
        while current.manager:
            manager = current.manager
            hierarchy.append({
                'id': manager.id,
                'employee_name': manager.employee_name,
                'email': manager.email,
                'reports_to': manager.reports_to_id,
                'designation': manager.designation.as_dict() if manager.designation else None
            })
            current = manager

        # Department info
        department = emp.department.as_dict() if emp.department else None
        designation = emp.designation.as_dict() if emp.designation else None

        return jsonify({
            'employee': emp.as_dict(),
            'manager_hierarchy': hierarchy,
            'department': department,
            'designation': designation
        }), 200
    finally:
        safe_close(session)

# ---------------- Project List ----------------
@app.route("/api/projects", methods=["GET"])
def list_projects():
    session = get_session()
    try:
        projects = session.query(Project).all()
        return jsonify([p.as_dict() for p in projects]), 200
    finally:
        safe_close(session)


@app.route("/api/employees/with-details", methods=["GET"])
def get_employees_with_details():
    session = get_session()
    try:
        # Get query parameters for search and filtering
        search = request.args.get("search")
        department_id = request.args.get("department_id")
        designation_id = request.args.get("designation_id")
        manager_id = request.args.get("manager_id")

        # Build query with filters
        query = session.query(Employee)
        
        # Apply search across employee_name and email if search parameter is provided
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Employee.employee_name.ilike(search_term),
                    Employee.email.ilike(search_term),
                )
            )

        # Apply specific filters
        if department_id:
            query = query.filter(Employee.department_id == int(department_id))
        if designation_id:
            query = query.filter(Employee.designation_id == int(designation_id))
        if manager_id:
            query = query.filter(Employee.reports_to_id == int(manager_id))

        employees = query.all()
        result = []
        for emp in employees:
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
            result.append({
                "id": emp.id,
                "employee_name": emp.employee_name,
                "email": emp.email,
                "department": emp.department.as_dict() if emp.department else None,
                "designation": emp.designation.as_dict() if emp.designation else None,
                "reports_to": emp.reports_to_id,
                "manager_hierarchy": hierarchy,
            })
        return jsonify(result), 200
    finally:
        safe_close(session)


@app.route("/api/employees", methods=["POST"])
def add_employee():
    session = get_session()
    try:
        data = request.get_json()
        name = data.get("employee_name")
        email = data.get("email")
        reports_to_id = data.get("reports_to_id")
        designation_id = data.get("designation_id")
        department_id = data.get("department_id")

        # Validate required fields
        if not name or not email or not designation_id or not department_id:
            return jsonify({"error": "Missing required fields"}), 400

        # Email format validation
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return jsonify({"error": "Invalid email format"}), 400

        # Check if email already exists
        if session.query(Employee).filter_by(email=email).first():
            return jsonify({"error": "Email already exists"}), 400

        # Validate designation and department existence
        designation = session.get(Designation, designation_id)
        if not designation:
            return jsonify({"error": "Invalid designation_id"}), 400

        # Ensure designation belongs to the selected department
        if designation.department_id != department_id:
            return jsonify({"error": "Designation does not belong to the selected department"}), 400

        department = session.get(Department, department_id)
        if not department:
            return jsonify({"error": "Invalid department_id"}), 400

        # If manager (reports_to) is provided, check if they exist; allow null explicitly
        if reports_to_id is not None:
            if not session.get(Employee, reports_to_id):
                return jsonify({"error": "Invalid reports_to ID"}), 400

        # Create and add the employee
        new_emp = Employee(
            employee_name=name.strip(),
            email=email.strip(),
            reports_to_id=reports_to_id,
            designation_id=designation_id,
            department_id=department_id
        )
        session.add(new_emp)
        session.commit()

        return jsonify({"message": "Employee added successfully"}), 201

    except IntegrityError:
        session.rollback()
        return jsonify({"error": "Integrity error (possible foreign key constraint or duplicate)"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)

# 6. Get change history for a daily log
@app.route("/api/daily-logs/<int:log_id>/changes", methods=["GET"])
def get_daily_log_changes(log_id):
    session = get_session()
    try:
        changes = session.query(DailyLogChange).filter_by(daily_log_id=log_id).order_by(DailyLogChange.changed_at.desc()).all()
        return jsonify([
            {
                "id": c.id,
                "project_id": c.project_id,
                "new_description": c.new_description,
                "changed_at": c.changed_at.strftime("%Y-%m-%d %H:%M:%S"),
            }
            for c in changes
        ]), 200
    finally:
        safe_close(session)



# --- Department CRUD ---

@app.route("/api/departments", methods=["GET"])
def get_departments():
    session = get_session()
    try:
        departments = session.query(Department).all()
        return jsonify([d.as_dict() for d in departments]), 200
    finally:
        safe_close(session)


# Department Endpoints
@app.route('/api/departments', methods=['POST'])
def add_department():
    session = get_session()
    try:
        data = request.get_json()
        name = data.get('name')
        if not name:
            return jsonify({'error': 'Department name is required'}), 400
        if session.query(Department).filter_by(name=name.strip()).first():
            return jsonify({'error': 'Department already exists'}), 400
        new_dept = Department(name=name.strip())
        session.add(new_dept)
        session.commit()
        return jsonify({'id': new_dept.id, 'name': new_dept.name}), 201
    except IntegrityError:
        session.rollback()
        return jsonify({'error': 'Integrity error (possible duplicate)'}), 400
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)


@app.route("/api/departments/<int:dept_id>", methods=["PUT"])
def update_department(dept_id):
    session = get_session()
    try:
        data = request.get_json()
        name = data.get("name")
        dept = session.query(Department).get(dept_id)
        if not dept:
            return jsonify({"error": "Department not found"}), 404
        dept.name = name
        session.commit()
        return jsonify(dept.as_dict()), 200
    finally:
        safe_close(session)

@app.route("/api/departments/<int:dept_id>", methods=["DELETE"])
def delete_department(dept_id):
    session = get_session()
    try:
        dept = session.query(Department).get(dept_id)
        if not dept:
            return jsonify({"error": "Department not found"}), 404
        session.delete(dept)
        session.commit()
        return jsonify({"message": "Department deleted"}), 200
    finally:
        safe_close(session)

# --- Designation CRUD ---

@app.route("/api/designations", methods=["GET"])
def get_designations():
    session = get_session()
    try:
        department_id = request.args.get("department_id", type=int)
        query = session.query(Designation)
        # Filter designations by department_id if provided
        if department_id:
            query = query.filter_by(department_id=department_id)

        designations = query.all()
        result = [
            {"id": des.id, "title": des.title, "department_id": des.department_id}
            for des in designations
        ]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)


@app.route("/api/designations", methods=["POST"])
def add_designation():
    session = get_session()
    try:
        data = request.get_json()
        title = data.get("title")
        department_id = data.get("department_id")
        if not title or not isinstance(title, str) or not title.strip():
            return jsonify({"error": "Designation title is required and must be a non-empty string"}), 400
        if not department_id:
            return jsonify({"error": "department_id is required"}), 400

        # Check if department exists
        department = session.query(Department).get(department_id)
        if not department:
            return jsonify({"error": "Department not found"}), 400

        # Check if designation already exists for this department
        existing_des = session.query(Designation).filter_by(
            title=title.strip(), department_id=department_id
        ).first()
        if existing_des:
            return jsonify({"error": f"Designation '{title.strip()}' already exists in this department"}), 400

        new_des = Designation(title=title.strip(), department_id=department_id)
        session.add(new_des)
        session.commit()
        return jsonify({"id": new_des.id, "title": new_des.title, "department_id": new_des.department_id}), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)

@app.route("/api/designations/<int:des_id>", methods=["PUT"])
def update_designation(des_id):
    session = get_session()
    try:
        data = request.get_json()
        title = data.get("title")
        des = session.query(Designation).get(des_id)
        if not des:
            return jsonify({"error": "Designation not found"}), 404
        des.title = title
        session.commit()
        return jsonify(des.as_dict()), 200 
    finally:
        safe_close(session)

@app.route("/api/designations/<int:des_id>", methods=["DELETE"])
def delete_designation(des_id):
    session = get_session()
    try:
        des = session.query(Designation).get(des_id)
        if not des:
            return jsonify({"error": "Designation not found"}), 404
        session.delete(des)
        session.commit()
        return jsonify({"message": "Designation deleted"}), 200
    finally:
        safe_close(session)

# @app.route("/api/admin/dashboard-data", methods=["GET"])
# def get_admin_dashboard_data():
#     session = get_session()
#     try:
#         # Get query parameters for search and filtering
#         search = request.args.get("search")
#         department_id = request.args.get("department_id")
#         designation_id = request.args.get("designation_id")
#         manager_id = request.args.get("manager_id")

#         # Build query with filters (same as /api/employees/with-details)
#         query = session.query(Employee)
#         if search:
#             search_term = f"%{search}%"
#             query = query.filter(
#                 or_(
#                     Employee.employee_name.ilike(search_term),
#                     Employee.email.ilike(search_term),
#                 )
#             )
#         if department_id:
#             query = query.filter(Employee.department_id == int(department_id))
#         if designation_id:
#             query = query.filter(Employee.designation_id == int(designation_id))

#         employees = query.all()
#         emp_result = []
#         for emp in employees:
#             # Build manager hierarchy
#             hierarchy = []
#             current = emp
#             visited = set()
#             while current.reports_to_id and current.reports_to_id not in visited:
#                 visited.add(current.reports_to_id)
#                 manager = session.query(Employee).filter_by(id=current.reports_to_id).first()
#                 if not manager:
#                     break
#                 hierarchy.append({
#                     "id": manager.id,
#                     "employee_name": manager.employee_name,
#                     "email": manager.email,
#                     "designation": manager.designation.as_dict() if manager.designation else None,
#                     "department": manager.department.as_dict() if manager.department else None,
#                 })
#                 current = manager
#             emp_result.append({
#                 "id": emp.id,
#                 "employee_name": emp.employee_name,
#                 "email": emp.email,
#                 "department": emp.department.as_dict() if emp.department else None,
#                 "designation": emp.designation.as_dict() if emp.designation else None,
#                 "reports_to": emp.reports_to_id,
#                 "manager_hierarchy": hierarchy,
#             })

#         # Departments
#         departments = [d.as_dict() for d in session.query(Department).all()]

#         # Designations
#         designations = [
#             {"id": des.id, "title": des.title, "department_id": des.department_id}
#             for des in session.query(Designation).all()
#         ]

#         return jsonify({
#             "employees": emp_result,
#             "departments": departments,
#             "designations": designations
#         }), 200
#     finally:
#         safe_close(session)

@app.route("/api/dashboard/init", methods=["GET"])
def get_dashboard_init():
    session = get_session()
    try:
        # Get query parameters for employee filtering
        search = request.args.get("search")
        department_id = request.args.get("department_id")
        designation_id = request.args.get("designation_id")
        manager_id = request.args.get("manager_id")

        # Build employee query with filters
        employee_query = session.query(Employee)
        if search:
            search_term = f"%{search}%"
            employee_query = employee_query.filter(
                or_(
                    Employee.employee_name.ilike(search_term),
                    Employee.email.ilike(search_term),
                )
            )
        if department_id:
            employee_query = employee_query.filter(Employee.department_id == int(department_id))
        if designation_id:
            employee_query = employee_query.filter(Employee.designation_id == int(designation_id))

        # Fetch employees with manager hierarchy
        employees = employee_query.all()
        employee_data = []
        for emp in employees:
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
            employee_data.append({
                "id": emp.id,
                "employee_name": emp.employee_name,
                "email": emp.email,
                "department": emp.department.as_dict() if emp.department else None,
                "designation": emp.designation.as_dict() if emp.designation else None,
                "reports_to": emp.reports_to_id,
                "manager_hierarchy": hierarchy,
            })

        # Fetch all departments
        departments = session.query(Department).all()
        department_data = [dept.as_dict() for dept in departments]

        # Fetch all designations
        designations = session.query(Designation).all()
        designation_data = [des.as_dict() for des in designations]

        # Fetch all projects
        projects = session.query(Project).all()
        project_data = [proj.as_dict() for proj in projects]

        # Construct response
        response = {
            "employees": employee_data,
            "departments": department_data,
            "designations": designation_data,
            "projects": project_data,
        }
        return jsonify(response), 200
    finally:
        safe_close(session)



# Get Daily Logs by Employee
@app.route("/api/daily-logs/by-employee", methods=["GET"])
def get_daily_logs_by_employee():
    session = get_session()
    try:
        employee_id = request.args.get("employee_id", type=int)
        if not employee_id:
            return jsonify({"error": "employee_id is required"}), 400

        employee = session.get(Employee, employee_id)
        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        daily_logs = session.query(DailyLog).filter_by(employee_id=employee_id).order_by(DailyLog.log_date.desc()).all()
        return jsonify([log.as_dict() for log in daily_logs]), 200
    finally:
        safe_close(session)

# Get Daily Log Changes

from datetime import date, timedelta

@app.route("/api/daily-logs/latest-seven-days/<int:employee_id>", methods=["GET"])
def get_latest_seven_days_daily_logs(employee_id):
    session = get_session()
    try:
        today = date.today()
        seven_days_ago = today - timedelta(days=6)
        logs = (
            session.query(DailyLog)
            .filter(
                DailyLog.log_date >= seven_days_ago,
                DailyLog.employee_id == employee_id
            )
            .order_by(DailyLog.log_date.desc())
            .all()
        )
        return jsonify([log.as_dict() for log in logs]), 200
    finally:
        safe_close(session)


# def get_manager_hierarchy(employee, session, hierarchy=None):
#     if hierarchy is None:
#         hierarchy = []
#     if employee.reports_to_id:
#         manager = session.query(Employee).filter_by(id=employee.reports_to_id).first()
#         if manager:
#             hierarchy.append({
#                 'id': manager.id,
#                 'employee_name': manager.employee_name,
#                 'email': manager.email,
#                 'designation': {'title': manager.designation.title} if manager.designation else None
#             })
#             get_manager_hierarchy(manager, session, hierarchy)
#     return hierarchy

# @app.route('/api/employee-data', methods=['GET'])
# def get_employee_data():
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
#         return jsonify(response)
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500
#     finally:
#         safe_close(session)





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
        employee = session.query(Employee).filter_by(email=email).first()
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404

        department = session.query(Department).filter_by(id=employee.department_id).first()
        designation = session.query(Designation).filter_by(id=employee.designation_id).first()
        projects = session.query(Project).all()
        manager_hierarchy = get_manager_hierarchy(employee, session)
        manager = session.query(Employee).filter_by(id=employee.reports_to_id).first()

        response = {
            'employee': {
                'id': employee.id,
                'employee_name': employee.employee_name,
                'email': employee.email,
                'reports_to': manager.employee_name if manager else None
            },
            'department': {'id': department.id, 'name': department.name} if department else None,
            'designation': {'id': designation.id, 'title': designation.title} if designation else None,
            'projects': [{'id': p.id, 'name': p.name} for p in projects],
            'manager_hierarchy': manager_hierarchy
        }
        return jsonify(response), 200
    except Exception as e:
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
            'changes': [{
                'id': change.id,
                'project_id': change.project_id,
                'new_description': change.new_description,
                'changed_at': change.changed_at.isoformat()
            } for change in session.query(DailyLogChange).filter_by(daily_log_id=log.id).all()]
        } for log in logs]
        return jsonify(response), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

def safe_close(session):
    if session:
        session.close()

def validate_time(time_str):
    try:
        datetime.strptime(time_str, '%H:%M')
        return True
    except ValueError:
        return False

def parse_time(time_str):
    return datetime.strptime(time_str, '%H:%M').time()

def get_total_hours(start_time, end_time):
    start_dt = datetime.combine(datetime.today(), start_time)
    end_dt = datetime.combine(datetime.today(), end_time)
    if end_dt < start_dt:
        end_dt += timedelta(days=1)  # Handle overnight shifts
    delta = end_dt - start_dt
    return delta.total_seconds() / 3600  # Convert to hours

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
                    task_description=task_description
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

@app.route('/api/daily-logs/latest-seven-days/<int:employee_id>', methods=['GET'])
def get_latest_seven_days_logs(employee_id):
    session = get_session()
    try:
        today = datetime.now(timezone('Asia/Kolkata')).date()
        seven_days_ago = today - timedelta(days=6)
        logs = session.query(DailyLog).filter(
            DailyLog.employee_id == employee_id,
            DailyLog.log_date >= seven_days_ago,
            DailyLog.log_date <= today
        ).all()
        response = [{
            'id': log.id,
            'project_id': log.project_id,
            'task_description': log.task_description,
            'start_time': log.start_time.strftime('%H:%M') if log.start_time else '',
            'end_time': log.end_time.strftime('%H:%M') if log.end_time else '',
            'total_hours': log.total_hours,
            'log_date': log.log_date.isoformat() if log.log_date else '',
            'changes': [{
                'id': change.id,
                'project_id': change.project_id,
                'new_description': change.new_description,
                'changed_at': change.changed_at.isoformat()
            } for change in session.query(DailyLogChange).filter_by(daily_log_id=log.id).all()]
        } for log in logs]
        return jsonify(response), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

@app.route('/api/daily-logs/<int:log_id>/changes', methods=['GET'])
def get_log_changes(log_id):
    session = get_session()
    try:
        log = session.query(DailyLog).filter_by(id=log_id).first()
        if not log:
            return jsonify({'error': f'Log with id {log_id} not found'}), 404

        changes = session.query(DailyLogChange).filter_by(daily_log_id=log_id).order_by(DailyLogChange.changed_at.asc()).all()
        response = [{
            'id': change.id,
            'log_id': change.daily_log_id,
            'project_id': change.project_id,
            'new_description': change.new_description,
            'changed_at': change.changed_at.isoformat()
        } for change in changes]
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)


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
        result = [log.to_dict() for log in logs]
        return jsonify(result)
    finally:
        session.close()

# ---------------- Run App ----------------
if __name__ == '__main__':
    app.run(debug=True)



