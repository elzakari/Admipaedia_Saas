from flask import Blueprint

from .routes import (buy_admission_form, discard_application,
                     get_all_applications, get_application_details,
                     get_my_applications, review_application,
                     save_admission_draft, submit_admission_form)

admissions_bp = Blueprint("admissions", __name__)

admissions_bp.route("/all", methods=["GET"])(get_all_applications)
admissions_bp.route("/my-applications", methods=["GET"])(get_my_applications)
admissions_bp.route("/buy-form", methods=["POST"])(buy_admission_form)
admissions_bp.route("/application/<int:id>", methods=["GET"])(get_application_details)
admissions_bp.route("/application/<int:id>/submit", methods=["POST"])(
    submit_admission_form
)
admissions_bp.route("/application/<int:id>", methods=["PUT"])(save_admission_draft)
admissions_bp.route("/application/<int:id>", methods=["DELETE"])(discard_application)
admissions_bp.route("/application/<int:id>/review", methods=["POST"])(
    review_application
)
