from utils.helpers import safe_close
from flask import request, jsonify
from models.department import Department
from utils.session_manager import get_session
from sqlalchemy.exc import IntegrityError



def get_departments():
    session = get_session()
    try:
        departments = session.query(Department).all()
        return jsonify([d.as_dict() for d in departments]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)


def add_department():
    session = get_session()
    try:
        data = request.get_json()
        name = data.get("name")
        if not name or not isinstance(name, str) or not name.strip():
            return jsonify({"error": "Department name is required and must be a non-empty string"}), 400
        if session.query(Department).filter_by(name=name.strip()).first():
            return jsonify({"error": "Department already exists"}), 400
        new_dept = Department(name=name.strip())
        session.add(new_dept)
        session.commit()
        return jsonify(new_dept.as_dict()), 201
    except IntegrityError:
        session.rollback()
        return jsonify({"error": "Integrity error (possible duplicate)"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)


def update_department(dept_id):
    session =get_session()
    try:
        data = request.get_json()
        name = data.get("name")
        if not name or not isinstance(name, str) or not name.strip():
            return jsonify({"error": "Department name is required and must be a non-empty string"}), 400
        dept = session.get(Department, dept_id)
        if not dept:
            return jsonify({"error": "Department not found"}), 404
        if session.query(Department).filter(Department.name == name.strip(), Department.id != dept_id).first():
            return jsonify({"error": "Department name already exists"}), 400
        dept.name = name.strip()
        session.commit()
        return jsonify(dept.as_dict()), 200
    except IntegrityError:
        session.rollback()
        return jsonify({"error": "Integrity error (possible duplicate)"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)

def delete_department(dept_id):
    session = get_session()
    try:
        dept = session.get(Department, dept_id)
        if not dept:
            return jsonify({"error": "Department not found"}), 404
        session.delete(dept)
        session.commit()
        return jsonify({"message": "Department deleted successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)

