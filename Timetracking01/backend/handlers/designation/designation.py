from utils.helpers import safe_close
from flask import request, jsonify
from models.department import Department
from utils.session_manager import get_session
from sqlalchemy.exc import IntegrityError
from models.designation import Designation



def fetch_designations():
    session = get_session()
    try:
        department_id = request.args.get("department_id", type=int)
        query = session.query(Designation)
        if department_id:
            query = query.filter_by(department_id=department_id)
        designations = query.all()
        return jsonify([d.as_dict() for d in designations]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)


def add_designation():
    session = get_session()
    try:
        data = request.get_json()

        title = data.get("title")
        department_id = data.get("department_id")

        # Validate title
        if not title or not isinstance(title, str) or not title.strip():
            return jsonify({"error": "Designation title is required and must be a non-empty string"}), 400

        # Validate department_id
        if not department_id:
            return jsonify({"error": "department_id is required"}), 400

        # Check if department exists
        department = session.get(Department, department_id)
        if not department:
            return jsonify({"error": "Department not found"}), 404

        # Check if designation already exists in this department
        existing_des = session.query(Designation).filter_by(
            title=title.strip(), department_id=department_id
        ).first()
        if existing_des:
            return jsonify({"error": f"Designation '{title.strip()}' already exists in this department"}), 400

        # Create new designation
        new_des = Designation(title=title.strip(), department_id=department_id)
        session.add(new_des)
        session.commit()

        return jsonify(new_des.as_dict()), 201

    except IntegrityError:
        session.rollback()
        return jsonify({"error": "Integrity error (possible duplicate or invalid foreign key)"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500
    finally:
        safe_close(session)

def update_designation(des_id):
    session = get_session()
    try:
        data = request.get_json()
        title = data.get("title")
        department_id = data.get("department_id")
        if not title or not isinstance(title, str) or not title.strip():
            return jsonify({"error": "Designation title is required and must be a non-empty string"}), 400
        des = session.get(Designation, des_id)
        if not des:
            return jsonify({"error": "Designation not found"}), 404
        if department_id:
            department = session.get(Department, department_id)
            if not department:
                return jsonify({"error": "Department not found"}), 404
            des.department_id = department_id
        if session.query(Designation).filter(
            Designation.title == title.strip(),
            Designation.department_id == des.department_id,
            Designation.id != des_id
        ).first():
            return jsonify({"error": f"Designation '{title.strip()}' already exists in this department"}), 400
        des.title = title.strip()
        session.commit()
        return jsonify(des.as_dict()), 200
    except IntegrityError:
        session.rollback()
        return jsonify({"error": "Integrity error (possible duplicate or invalid foreign key)"}), 400
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)


def delete_designation(des_id):
    session = get_session()
    try:
        des = session.get(Designation, des_id)
        if not des:
            return jsonify({"error": "Designation not found"}), 404
        session.delete(des)
        session.commit()
        return jsonify({"message": "Designation deleted successfully"}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)


