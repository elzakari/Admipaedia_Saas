from flask import Blueprint

student_bp = Blueprint('student', __name__)

from app.api.v1.student.routes import *
