from typing import Dict
from http import HTTPStatus
from flask import jsonify, make_response

def create_response(status: HTTPStatus, body: Dict):
    response = make_response(jsonify(body), status.value)
    response.headers["Content-Type"] = "application/json"
    return response

def create_error_response(error: str, message: str, status_code: HTTPStatus):
    return create_response(status_code, {
        "error": error,
        "message": message,
        "code" : status_code
    })
