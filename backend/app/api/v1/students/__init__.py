from flask import Blueprint

students_bp = Blueprint('students', __name__)

from app.api.v1.students.routes import *