from utils.session_manager import get_session 
from utils.helpers import safe_close 
from models.dailylogs import DailyLog 
from models.dailylogchanges import DailyLogChange
from flask import Flask,jsonify,request 




def get_daily_log_changes(log_id):
    session = get_session()
    try:
        log = session.get(DailyLog, log_id)
        if not log:
            return jsonify({"error": f"Daily log with id {log_id} not found"}), 404
        changes = session.query(DailyLogChange).filter_by(daily_log_id=log_id).order_by(DailyLogChange.changed_at.desc()).all()
        return jsonify([c.as_dict() for c in changes]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        safe_close(session)
