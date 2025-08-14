from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from psycopg2.errors import NotNullViolation, UniqueViolation
import re
import logging
from botocore.exceptions import BotoCoreError, ClientError
from functools import wraps
from utils.custom_responses import create_error_response
from http import HTTPStatus

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handle_exceptions(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        session = kwargs.get("session")  # Get session from function arguments if passed

        try:
            return func(*args, **kwargs)
        
        except IntegrityError as e:
            if session:
                session.rollback()  # Rollback the transaction on integrity errors

            if isinstance(e.orig, NotNullViolation):
                match = re.search(r'null value in column "(.*?)"', str(e.orig))
                missing_column = match.group(1) if match else "unknown field"
                return create_error_response(
                    "Missing Required Field",
                    f"The field '{missing_column}' is required and cannot be null.",
                    HTTPStatus.BAD_REQUEST
                )
            
            if isinstance(e.orig, UniqueViolation):
                match = re.search(r'Key \((.*?)\)=\((.*?)\) already exists', str(e.orig))
                field = match.group(1) if match else "duplicate field"
                return create_error_response(
                    "Duplicate Entry",
                    f"The {field} you provided already exists.",
                    HTTPStatus.BAD_REQUEST
                )

            return create_error_response(
                "Database Integrity Error",
                "A database constraint was violated.",
                HTTPStatus.BAD_REQUEST
            )

        except SQLAlchemyError as e:
            if session:
                session.rollback()  # Rollback the session for general database errors

            logger.error(f"Database error: {e}")  # Log the error
            return create_error_response(
                "Database Error",
                "A database error occurred. Please try again later.",
                HTTPStatus.INTERNAL_SERVER_ERROR
            )

        except ValueError as ve:
            return create_error_response(
                "Invalid Data",
                "The provided data is invalid.",
                HTTPStatus.BAD_REQUEST
            )

        except (BotoCoreError, ClientError) as e:
            logger.error(f"AWS error: {e}")  # Log AWS errors
            return create_error_response(
                "AWS Error",
                "An error occurred while processing your request.",
                HTTPStatus.INTERNAL_SERVER_ERROR
            )

        except Exception as e:
            if session:
                session.rollback()  # Rollback for any unexpected errors

            logger.error(f"Unexpected error: {e}", exc_info=True)  # Log full stack trace
            return create_error_response(
                "Internal Server Error",
                "An unexpected error occurred. Please try again later." + str(e),
                HTTPStatus.INTERNAL_SERVER_ERROR
            )

    return wrapper
