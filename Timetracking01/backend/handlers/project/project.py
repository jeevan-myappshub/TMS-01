from models.project import Project
from utils.helpers import safe_close
from flask import Flask, jsonify
from utils.session_manager import get_session
from datetime import datetime
from flask import request
from models.employeeproject import EmployeeProject
from models.managerproject import ManagerProjectAssignment 



def list_projects():
    session = get_session()
    try:
        projects = session.query(Project).all()
        return jsonify([p.as_dict() for p in projects]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

def list_projects_for_user():
    session = get_session()
    try:
        # Get user_id from query parameters
        user_id = request.args.get("user_id", type=int)
        if not user_id:
            return jsonify({"error": "Missing 'user_id' in query parameters"}), 400

        # Projects where the user is a manager
        manager_projects = (
            session.query(Project)
            .join(ManagerProjectAssignment, Project.id == ManagerProjectAssignment.project_id)
            .filter(ManagerProjectAssignment.manager_id == user_id)
            .all()
        )

        # Projects where the user is an employee in a manager assignment
        manager_employee_projects = (
            session.query(Project)
            .join(ManagerProjectAssignment, Project.id == ManagerProjectAssignment.project_id)
            .filter(ManagerProjectAssignment.employee_id == user_id)
            .all()
        )

        # Projects where the user is in employee_projects
        employee_projects = (
            session.query(Project)
            .join(EmployeeProject, Project.id == EmployeeProject.project_id)
            .filter(EmployeeProject.employee_id == user_id)
            .all()
        )

        # Remove duplicates by project ID
        all_projects = {p.id: p for p in manager_projects + manager_employee_projects + employee_projects}

        return jsonify([p.as_dict() for p in all_projects.values()]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)

# def add_project():
#     session = get_session()
#     try:
#         data = request.get_json()

#         # Validate input
#         if not data or 'name' not in data:
#             return jsonify({'error': 'Project name is required'}), 400

#         # Check for duplicate project name
#         existing = session.query(Project).filter_by(name=data['name']).first()
#         if existing:
#             return jsonify({'error': 'Project with this name already exists'}), 409

#         # Create new Project object
#         new_project = Project(
#             name=data['name'],
#             description=data.get('description', '')
#         )

#         session.add(new_project)
#         session.commit()

#         return jsonify({'message': 'Project added successfully', 'project': new_project.as_dict()}), 201

#     except Exception as e:
#         session.rollback()
#         return jsonify({'error': str(e)}), 500

#     finally:
#         safe_close(session)


def add_project():
    session = get_session()
    try:
        data = request.get_json()

        # Validate input
        if not data or 'name' not in data:
            return jsonify({'error': 'Project name is required'}), 400

        # Check for duplicate project name
        existing = session.query(Project).filter_by(name=data['name']).first()
        if existing:
            return jsonify({'error': 'Project with this name already exists'}), 409

        # Create new Project object
        new_project = Project(
            name=data['name'],
            description=data.get('description', '')
        )
        session.add(new_project)
        session.flush()  # Get project ID without committing

        # Assign manager if provided
        manager_id = data.get('manager_id')
        if manager_id:
            manager_assignment = EmployeeProject(
                employee_id=manager_id,
                project_id=new_project.id
            )
            session.add(manager_assignment)

        session.commit()

        return jsonify({
            'message': 'Project added successfully',
            'project': new_project.as_dict()
        }), 201

    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        safe_close(session)