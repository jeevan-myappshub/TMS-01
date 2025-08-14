from datetime import datetime,timedelta,date
import re


def is_valid_email(email):
    """Check if the email is valid using regex.
    """
    pattern = r"^[^@]+@[^@]+\.[^@]+$"
    return bool(re.match(pattern, email))

def get_day_of_week(date_obj):
    """Return the day of the week for a given date object (e.g., 'Monday').
    """
    return date_obj.strftime('%A')


def sanitize_description(desc, max_length=1000):
    """Trim and clean up a description string."""
    if desc is None:
        return ""
    desc = desc.strip()
    return desc[:max_length]

def format_datetime(dt):
    """Format a datetime object as ISO string, or return None."""
    if dt is None:
        return None
    return dt.isoformat()



    
from datetime import timedelta

def calculate_total_hours(morning_in, morning_out, afternoon_in, afternoon_out):
    total = timedelta()
    if morning_in and morning_out:
        total += datetime.combine(date.min, morning_out) - datetime.combine(date.min, morning_in)
    if afternoon_in and afternoon_out:
        total += datetime.combine(date.min, afternoon_out) - datetime.combine(date.min, afternoon_in)
    return total  # <-- Make sure this is a timedelta, not a string

def format_timedelta_to_time(td):
    if not isinstance(td, timedelta):
        return "0:00"
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    return f"{hours}:{minutes:02d}"

    
def validate_time(time_str):
    if not time_str:
        return True  # Allow null/empty
    return bool(re.match(r'^\d{2}:\d{2}$', time_str))



def get_total_hours(start_time, end_time):
    """Return the difference between two time objects as a float (hours)."""
    dt1 = datetime.combine(datetime.today(), start_time)
    dt2 = datetime.combine(datetime.today(), end_time)
    diff = (dt2 - dt1).total_seconds() / 3600
    if diff < 0:
        diff += 24  # handle overnight
    return round(diff, 2)

def parse_time(time_str):
    if not time_str:
        return None
    try:
        return datetime.strptime(time_str, '%H:%M').time()
    except ValueError:
        raise ValueError('Invalid time format. Use HH:MM.')

def validate_time(time_str):
    if not time_str:
        return True  # Allow null/empty
    return bool(re.match(r'^\d{2}:\d{2}$', time_str))

def time_string_to_float(time_str):
    """Convert HH:MM string to float hours (e.g., '4:30' -> 4.5)."""
    if not time_str or not validate_time(time_str):
        return 0.0
    try:
        hours, minutes = map(int, time_str.split(':'))
        return round(hours + minutes / 60, 2)
    except ValueError:
        return 0.0
    
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

# def get_total_hours(start_time, end_time):
#     start_dt = datetime.combine(datetime.today(), start_time)
#     end_dt = datetime.combine(datetime.today(), end_time)
#     if end_dt < start_dt:
#         end_dt += timedelta(days=1)
#     delta = end_dt - start_dt
#     return delta.total_seconds() / 3600