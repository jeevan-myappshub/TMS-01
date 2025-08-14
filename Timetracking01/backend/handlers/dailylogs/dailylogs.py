from utils.session_manager import get_session 
from utils.helpers import safe_close 
from models.dailylogs import DailyLog 
from models.dailylogchanges import DailyLogChange
from models.employee import Employee
from flask import Flask, jsonify, request
from datetime import datetime,timedelta 
from pytz import timezone 
from utils.helpers import get_total_hours, parse_time, validate_time
from sqlalchemy.exc import IntegrityError
from models.project import Project






def get_daily_logs_by_employeee():
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
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)


def get_latest_seven_days_daily_logs(employee_id):
    session = get_session()
    try:
        today = datetime.now(timezone('Asia/Kolkata')).date()
        seven_days_ago = today - timedelta(days=6)
        logs = (
            session.query(DailyLog)
            .filter(
                DailyLog.employee_id == employee_id,
                DailyLog.log_date >= seven_days_ago,
                DailyLog.log_date <= today
            )
            .order_by(DailyLog.log_date.desc())
            .all()
        )
        if not session.get(Employee, employee_id):
            return jsonify({"error": "Employee not found"}), 404
        return jsonify([log.as_dict() for log in logs]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)


# def save_daily_logs():
#     data = request.get_json()
#     if not isinstance(data, list):
#         return jsonify({"error": "Input must be a list of logs"}), 400
#     session = get_session()
#     try:
#         for log_data in data:
#             log_id = log_data.get("id")
#             employee_id = log_data.get("employee_id")
#             log_date = log_data.get("log_date")
#             project_id = log_data.get("project_id")
#             start_time = log_data.get("start_time")
#             end_time = log_data.get("end_time")
#             task_description = log_data.get("task_description")
#             status_review = log_data.get("status_review", "Pending")
#             reviewer_id = log_data.get("reviewer_id")
#             if not all([employee_id, log_date, project_id, start_time, end_time, task_description]):
#                 return jsonify({"error": "Missing required fields"}), 400
#             if not validate_time(start_time) or not validate_time(end_time):
#                 return jsonify({"error": "Invalid time format for start_time or end_time. Use HH:MM."}), 400
#             try:
#                 log_date = datetime.strptime(log_date, "%Y-%m-%d").date()
#                 start_time_obj = parse_time(start_time)
#                 end_time_obj = parse_time(end_time)
#                 total_hours_float = get_total_hours(start_time_obj, end_time_obj)
#             except ValueError as e:
#                 return jsonify({"error": f"Invalid date or time format: {str(e)}"}), 400
#             if total_hours_float <= 0:
#                 return jsonify({"error": "End time must be after start time"}), 400
#             employee = session.get(Employee, employee_id)
#             if not employee:
#                 return jsonify({"error": f"Employee with id {employee_id} not found"}), 404
#             project = session.get(Project, project_id)
#             if not project:
#                 return jsonify({"error": f"Project with id {project_id} not found"}), 404
#             if reviewer_id:
#                 reviewer = session.get(Employee, reviewer_id)
#                 if not reviewer:
#                     return jsonify({"error": f"Reviewer with id {reviewer_id} not found"}), 404
#             existing_logs = session.query(DailyLog).filter(
#                 DailyLog.employee_id == employee_id,
#                 DailyLog.log_date == log_date,
#                 DailyLog.id != log_id if log_id else True
#             ).all()
#             for existing_log in existing_logs:
#                 existing_start = existing_log.start_time
#                 existing_end = existing_log.end_time
#                 if start_time_obj < existing_end and end_time_obj > existing_start:
#                     return jsonify({"error": f"Time range overlaps with existing log ID {existing_log.id}"}), 400
#             if log_id and str(log_id).lower() != "null":
#                 log = session.get(DailyLog, log_id)
#                 if not log or log.employee_id != employee_id:
#                     return jsonify({"error": f"Log with id {log_id} not found or does not belong to employee"}), 404
#                 old_description = log.task_description
#                 log.project_id = project_id
#                 log.log_date = log_date
#                 log.start_time = start_time_obj
#                 log.end_time = end_time_obj
#                 log.total_hours = total_hours_float
#                 log.task_description = task_description
#                 log.status_review = status_review
#                 log.reviewer_id = reviewer_id
#                 if old_description != task_description:
#                     change = DailyLogChange(
#                         daily_log_id=log.id,
#                         project_id=project_id,
#                         new_description=task_description,
#                         status_review=status_review,
#                         reviewer_id=reviewer_id,
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
#                     task_description=task_description,
#                     status_review=status_review,
#                     reviewer_id=reviewer_id
#                 )
#                 session.add(log)
#                 session.flush()
#                 change = DailyLogChange(
#                     daily_log_id=log.id,
#                     project_id=project_id,
#                     new_description=task_description,
#                     status_review=status_review,
#                     reviewer_id=reviewer_id,
#                     changed_at=datetime.utcnow()
#                 )
#                 session.add(change)
#         session.commit()
#         return jsonify({"message": "Logs saved successfully"}), 201
#     except IntegrityError as e:
#         session.rollback()
#         return jsonify({"error": "Integrity error (possible duplicate or invalid foreign key)"}), 400
#     except Exception as e:
#         session.rollback()
#         return jsonify({"error": str(e)}), 500
#     finally:
#         safe_close(session)


def get_todays_logs(employee_id):
    session = get_session()
    try:
        today = datetime.now(timezone("Asia/Kolkata")).date()
        logs = session.query(DailyLog).filter_by(employee_id=employee_id, log_date=today).all()
        if not session.get(Employee, employee_id):
            return jsonify({"error": "Employee not found"}), 404
        response = [
            {
                **log.as_dict(),
                "changes": [c.as_dict() for c in session.query(DailyLogChange).filter_by(daily_log_id=log.id).all()]
            }
            for log in logs
        ]
        return jsonify(response), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)



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



# def update_log_review_status():
#     data = request.get_json()
#     log_id = data.get("log_id")
#     reviewer_id = data.get("reviewer_id")
#     status_review = data.get("status_review")  # "Approved" or "Rejected"
#     rejection_reason = data.get("rejection_reason", "")

#     if not all([log_id, reviewer_id, status_review]):
#         return jsonify({"error": "log_id, reviewer_id, and status_review are required"}), 400

#     session = get_session()
#     try:
#         log = session.query(DailyLog).filter_by(id=log_id, reviewer_id=reviewer_id).first()
#         if not log:
#             return jsonify({"error": "Log not found or reviewer mismatch"}), 404

#         log.status_review = status_review
#         log.rejection_reason = rejection_reason if status_review == "Rejected" else None
#         session.commit()
#         return jsonify({"message": "Review status updated", "log": log.as_dict()}), 200
#     except Exception as e:
#         session.rollback()
#         return jsonify({"error": str(e)}), 500
#     finally:
#         safe_close(session)

# def get_logs_by_reviewer():
#     reviewer_id = request.args.get("reviewer_id", type=int)
#     if not reviewer_id:
#         return jsonify({"error": "reviewer_id is required"}), 400
#     session = get_session()
#     try:
#         logs = session.query(DailyLog).filter(DailyLog.reviewer_id == reviewer_id).order_by(DailyLog.log_date.desc()).all()
#         return jsonify([log.as_dict() for log in logs]), 200
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
#     finally:
#         safe_close(session)


def update_log_review_status():
    """
    Payload:
      - log_id: int (required)
      - reviewer_id: int (required)
      - status_review: string (required, e.g., 'Approved', 'Rejected')
      - rejection_reason: string (optional, required if status_review='Rejected')
    """
    data = request.get_json()
    log_id = data.get("log_id")
    reviewer_id = data.get("reviewer_id")
    status_review = data.get("status_review")
    rejection_reason = data.get("rejection_reason", "")

    if not all([log_id, reviewer_id, status_review]):
        return jsonify({"error": "log_id, reviewer_id, and status_review are required"}), 400

    session = get_session()
    try:
        log = session.query(DailyLog).filter_by(id=log_id, reviewer_id=reviewer_id).first()
        if not log:
            return jsonify({"error": "Log not found or reviewer mismatch"}), 404

        log.status_review = status_review
        log.rejection_reason = rejection_reason if status_review == "Rejected" else None
        session.commit()
        return jsonify({"message": "Review status updated", "log": log.as_dict()}), 200
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)


def get_logs_by_reviewer():
    """
    Query Parameters:
      - reviewer_email: string (required)
    Example:
      /api/daily-logs/by-reviewer?reviewer_email=reviewer@example.com

    """
    session = get_session()
    try:
        reviewer_id = request.args.get("reviewer_id", type=int)
        reviewer_email = request.args.get("reviewer_email", type=str)

        if not reviewer_id and not reviewer_email:
            return jsonify({"error": "Either reviewer_id or reviewer_email is required"}), 400

        if not reviewer_id and reviewer_email:
            reviewer = session.query(Employee).filter(Employee.email == reviewer_email).first()
            if not reviewer:
                return jsonify({"error": "Reviewer not found"}), 404
            reviewer_id = reviewer.id


        # Query logs where the current reviewer is the given reviewer
        current_logs = session.query(DailyLog).filter(DailyLog.reviewer_id == reviewer_id).all()

        # Query logs where the reviewer was previously assigned (from DailyLogChange)
        previous_logs = (
            session.query(DailyLogChange)
            .filter(DailyLogChange.reviewer_id == reviewer_id)
            .all()
        )

        # Combine current and previous logs
        all_logs = list(set(current_logs + [change.daily_log for change in previous_logs]))

        # Convert logs to dictionary format
        log_data = [log.as_dict() for log in all_logs]

        # Get related projects
        project_ids = list(set(log.project_id for log in all_logs if log.project_id))
        projects = session.query(Project).filter(Project.id.in_(project_ids)).all() if project_ids else []
        project_data = [proj.as_dict() for proj in projects]

        return jsonify({"logs": log_data, "projects": project_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)        

# def get_logs_by_reviewer():
#     """
#     Query Parameters:
#       - reviewer_id: int (required)
#     Example:
#       /api/daily-logs/by-reviewer?reviewer_id=1
#     """
#     reviewer_id = request.args.get("reviewer_id", type=int)
#     if not reviewer_id:
#         return jsonify({"error": "reviewer_id is required"}), 400

#     session = get_session()
#     try:
#         query = session.query(DailyLog).filter(DailyLog.reviewer_id == reviewer_id)
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














# def get_reviewer_logs():
#     try:
#         reviewer_id = request.args.get("reviewer_id", type=int)
#         if not reviewer_id:
#             return jsonify({"error": "Missing reviewer_id"}), 400

#         # Optional filters
#         start_date = request.args.get("start_date")
#         end_date = request.args.get("end_date")
#         project_id = request.args.get("project_id")
#         status_review = request.args.get("status_review")

#         query = DailyLog.query.filter(DailyLog.reviewer_id == reviewer_id)

#         if start_date:
#             query = query.filter(DailyLog.log_date >= datetime.strptime(start_date, "%Y-%m-%d"))
#         if end_date:
#             query = query.filter(DailyLog.log_date <= datetime.strptime(end_date, "%Y-%m-%d"))
#         if project_id and project_id != "all":
#             query = query.filter(DailyLog.project_id == int(project_id))
#         if status_review and status_review != "all":
#             query = query.filter(DailyLog.status_review == status_review)

#         logs = query.order_by(DailyLog.log_date.desc()).all()
#         projects = Project.query.order_by(Project.id.asc()).all()

#         return jsonify({
#             "logs": [log.to_dict() for log in logs],
#             "projects": [project.to_dict() for project in projects]
#         })

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


