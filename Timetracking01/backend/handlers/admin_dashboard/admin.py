from flask import request, jsonify
from models.dailylogs import DailyLog
from utils.session_manager  import get_session




# Handler for analytics on timesheets
def analytics_timesheet():
    status = request.args.get("status_review")  # e.g., "approved", "pending", "rejected"
    start_date = request.args.get("start_date") # e.g., "2025-08-01"
    end_date = request.args.get("end_date")     # e.g., "2025-08-31"
    employee_id = request.args.get("employee_id")
    project_id = request.args.get("project_id")

    session = get_session()
    try:
        query = session.query(DailyLog)
        if status:
            query = query.filter(DailyLog.status_review == status)
        if start_date:
            query = query.filter(DailyLog.log_date >= start_date)
        if end_date:
            query = query.filter(DailyLog.log_date <= end_date)
        if employee_id:
            query = query.filter(DailyLog.employee_id == employee_id)
        if project_id:
            query = query.filter(DailyLog.project_id == project_id)

        logs = query.all()
        # Example analytics: count, total hours, group by status, etc.
        total_logs = len(logs)
        total_hours = sum([log.total_hours or 0 for log in logs])
        status_counts = {}
        for log in logs:
            key = log.status_review or "unknown"
            status_counts[key] = status_counts.get(key, 0) + 1

        return jsonify({
            "total_logs": total_logs,
            "total_hours": total_hours,
            "status_counts": status_counts,
            "logs": [log.as_dict() for log in logs],  # Optional: remove if you want only analytics
        })
    finally:
        session.close()
