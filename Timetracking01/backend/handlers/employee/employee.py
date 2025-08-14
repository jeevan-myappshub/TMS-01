from utils.helpers import safe_close 
from flask import request,jsonify 
from models.employee import Employee 
from models.department import Department 
from models.designation import Designation 
from models.project import Project
from models.dailylogs import DailyLog
from utils.session_manager import get_session 
from sqlalchemy.exc import SQLAlchemyError
import re 
import datetime
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError



def get_employee_profile_with_hierarchy():
    email = request.args.get('email')
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    session = get_session()
    try:
        emp = session.query(Employee).filter(Employee.email.ilike(email)).first()
        if not emp:
            return jsonify({'error': 'Employee not found'}), 404
        hierarchy = []
        current = emp
        visited = set()
        while current.manager and current.reports_to_id not in visited:
            manager = current.manager
            visited.add(manager.id)
            hierarchy.append({
                'id': manager.id,
                'employee_name': manager.employee_name,
                'email': manager.email,
                'reports_to': manager.reports_to_id,
                'designation': manager.designation.as_dict() if manager.designation else None,
                'department': manager.department.as_dict() if manager.department else None
            })
            current = manager
        return jsonify({
            'employee': emp.as_dict(),
            'manager_hierarchy': hierarchy,
            'department': emp.department.as_dict() if emp.department else None,
            'designation': emp.designation.as_dict() if emp.designation else None
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)


#  admin dashboard api 
def get_employees_with_details():
    session = get_session()
    try:
        search = request.args.get("search")
        department_id = request.args.get("department_id", type=int)
        designation_id = request.args.get("designation_id", type=int)
        manager_id = request.args.get("manager_id", type=int)
        query = session.query(Employee)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Employee.employee_name.ilike(search_term),
                    Employee.email.ilike(search_term)
                )
            )
        if department_id:
            query = query.filter(Employee.department_id == department_id)
        if designation_id:
            query = query.filter(Employee.designation_id == designation_id)
        if manager_id:
            query = query.filter(Employee.reports_to_id == manager_id)
        employees = query.all()
        result = []
        for emp in employees:
            hierarchy = []
            current = emp
            visited = set()
            while current.reports_to_id and current.reports_to_id not in visited:
                visited.add(current.reports_to_id)
                manager = session.get(Employee, current.reports_to_id)
                if not manager:
                    break
                hierarchy.append({
                    "id": manager.id,
                    "employee_name": manager.employee_name,
                    "email": manager.email,
                    "designation": manager.designation.as_dict() if manager.designation else None,
                    "department": manager.department.as_dict() if manager.department else None
                })
                current = manager
            result.append({
                "id": emp.id,
                "employee_name": emp.employee_name,
                "email": emp.email,
                "department": emp.department.as_dict() if emp.department else None,
                "designation": emp.designation.as_dict() if emp.designation else None,
                "reports_to": emp.reports_to_id,
                "manager_hierarchy": hierarchy
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)


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




def get_dashboard_init():
    session = get_session()
    try:
        search = request.args.get("search")
        department_id = request.args.get("department_id")
        designation_id = request.args.get("designation_id")
        project_id = request.args.get("project_id", type=int)

        # Base query
        employee_query = session.query(Employee)

        # Apply search filter
        if search:
            search_term = f"%{search}%"
            employee_query = employee_query.filter(
                or_(
                    Employee.employee_name.ilike(search_term),
                    Employee.email.ilike(search_term),
                )
            )

        # Apply department filter
        if department_id:
            employee_query = employee_query.filter(Employee.department_id == int(department_id))

        # Apply designation filter
        if designation_id:
            employee_query = employee_query.filter(Employee.designation_id == int(designation_id))

        # Apply project filter via subquery
        if project_id:
            subquery = session.query(DailyLog.employee_id).filter(DailyLog.project_id == project_id).distinct()
            employee_query = employee_query.filter(Employee.id.in_(subquery))

        # Fetch filtered employees
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

        # Other data
        departments = session.query(Department).all()
        department_data = [dept.as_dict() for dept in departments]

        designations = session.query(Designation).all()
        designation_data = [des.as_dict() for des in designations]

        projects = session.query(Project).all()
        project_data = [proj.as_dict() for proj in projects]

        response = {
            "employees": employee_data,
            "departments": department_data,
            "designations": designation_data,
            "projects": project_data,
        }

        return jsonify(response), 200

    finally:
        safe_close(session)




def get_employee_info():
    email = request.args.get("email")
    if not email:
        return jsonify({"error": "Email is required"}), 400
    session = get_session()
    try:
        employee = session.query(Employee).filter_by(email=email).first()
        if not employee:
            return jsonify({"error": "Employee not found"}), 404
        hierarchy = []
        current = employee
        visited = set()
        while current.reports_to_id and current.reports_to_id not in visited:
            visited.add(current.reports_to_id)
            manager = session.get(Employee, current.reports_to_id)
            if not manager:
                break
            hierarchy.append({
                "id": manager.id,
                "employee_name": manager.employee_name,
                "email": manager.email,
                "designation": manager.designation.as_dict() if manager.designation else None,
                "department": manager.department.as_dict() if manager.department else None
            })
            current = manager
        response = {
            "employee": employee.as_dict(),
            "department": employee.department.as_dict() if employee.department else None,
            "designation": employee.designation.as_dict() if employee.designation else None,
            "projects": [p.as_dict() for p in session.query(Project).all()],
            "manager_hierarchy": hierarchy
        }
        return jsonify(response), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)



#  update the reviwer of teh following employee 
def update_reviewer_for_employee(employee_id):
    session = get_session()
    try:
        data = request.get_json()
        reviewer_id = data.get("reviewer_id")

        if not reviewer_id:
            return jsonify({"error": "reviewer_id is required"}), 400

        # Query the employee
        employee = session.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            return jsonify({"error": f"Employee with ID {employee_id} not found"}), 404

        # Prevent self-reporting
        if int(reviewer_id) == int(employee_id):
            return jsonify({"error": "An employee cannot report to themselves"}), 400

        # Query the reviewer
        reviewer = session.query(Employee).filter(Employee.id == reviewer_id).first()
        if not reviewer:
            return jsonify({"error": f"Reviewer with ID {reviewer_id} not found"}), 404

        # Update reports_to_id
        employee.reports_to_id = reviewer_id
        session.commit()

        return jsonify({"message": f"Reviewer for employee ID {employee_id} updated to {reviewer_id}"}), 200

    except SQLAlchemyError as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)
