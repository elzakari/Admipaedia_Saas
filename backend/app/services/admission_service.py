import hashlib
import secrets
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload

from app.extensions import bcrypt, db
from app.models.admission import AdmissionApplication
from app.models.class_ import Class
from app.models.parent import Parent
from app.models.student import Student
from app.models.tenant import TenantMembership
from app.models.user import User


class AdmissionService:
    """Service to handle student admission applications."""

    @staticmethod
    def _get_ctx_scope(tenant_id=None, branch_id=None):
        from flask import has_app_context
        if has_app_context():
            from flask import g
            ctx_tenant = tenant_id if tenant_id is not None else getattr(g, "tenant_id", None)
            ctx_branch = branch_id if branch_id is not None else getattr(g, "branch_id", None)
        else:
            ctx_tenant = tenant_id
            ctx_branch = branch_id
        return ctx_tenant, ctx_branch

    @staticmethod
    def _apply_scope(query, tenant_id=None, branch_id=None):
        ctx_tenant, ctx_branch = AdmissionService._get_ctx_scope(tenant_id, branch_id)
        if ctx_tenant is not None:
            query = query.join(Parent, AdmissionApplication.parent_id == Parent.id).filter(
                (Parent.tenant_id == ctx_tenant) | (Parent.tenant_id.is_(None))
            )
        if ctx_branch is not None and hasattr(AdmissionApplication, "branch_id"):
            query = query.filter(
                (AdmissionApplication.branch_id == ctx_branch) | (AdmissionApplication.branch_id.is_(None))
            )
        if ctx_tenant is not None and hasattr(AdmissionApplication, "tenant_id"):
            query = query.filter(
                (AdmissionApplication.tenant_id == ctx_tenant) | (AdmissionApplication.tenant_id.is_(None))
            )
        return query

    @staticmethod
    def get_all_applications(tenant_id=None, branch_id=None, statuses_exclude=None) -> List[AdmissionApplication]:
        query = AdmissionApplication.query.options(
            joinedload(AdmissionApplication.target_class),
            joinedload(AdmissionApplication.parent).joinedload(Parent.user),
        )
        query = AdmissionService._apply_scope(query, tenant_id, branch_id)
        if statuses_exclude:
            query = query.filter(~AdmissionApplication.status.in_(statuses_exclude))
        return query.order_by(
            AdmissionApplication.updated_at.desc(),
            AdmissionApplication.created_at.desc(),
        ).all()

    @staticmethod
    def get_application_by_id(application_id: int, tenant_id=None, branch_id=None) -> Optional[AdmissionApplication]:
        query = AdmissionApplication.query.options(
            joinedload(AdmissionApplication.target_class),
            joinedload(AdmissionApplication.parent).joinedload(Parent.user),
        ).filter(AdmissionApplication.id == int(application_id))
        query = AdmissionService._apply_scope(query, tenant_id, branch_id)
        return query.first()

    @staticmethod
    def create_application(application_data: Dict[str, Any], tenant_id=None, branch_id=None) -> Tuple[Optional[AdmissionApplication], Optional[str]]:
        try:
            application = AdmissionApplication(**application_data)
            from flask import g, has_app_context
            if has_app_context():
                t = getattr(g, "tenant_id", None)
                b = getattr(g, "branch_id", None)
                if t is not None and hasattr(application, "tenant_id"):
                    application.tenant_id = t
                if b is not None and hasattr(application, "branch_id"):
                    application.branch_id = b
            if tenant_id is not None and hasattr(application, "tenant_id") and application.tenant_id is None:
                application.tenant_id = tenant_id
            if branch_id is not None and hasattr(application, "branch_id") and application.branch_id is None:
                application.branch_id = branch_id
            db.session.add(application)
            db.session.commit()
            return application, None
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, f"Database error: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return None, f"Unexpected error: {str(e)}"

    @staticmethod
    def update_application(application_id: int, application_data: Dict[str, Any], tenant_id=None, branch_id=None) -> Tuple[Optional[AdmissionApplication], Optional[str]]:
        try:
            application = AdmissionService.get_application_by_id(application_id, tenant_id, branch_id)
            if not application:
                return None, "Application not found"
            for key, value in application_data.items():
                if hasattr(application, key):
                    setattr(application, key, value)
            application.updated_at = datetime.utcnow()
            db.session.commit()
            return application, None
        except SQLAlchemyError as e:
            db.session.rollback()
            return None, f"Database error: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return None, f"Unexpected error: {str(e)}"

    @staticmethod
    def delete_application(application_id: int, tenant_id=None, branch_id=None) -> Tuple[bool, Optional[str]]:
        try:
            application = AdmissionService.get_application_by_id(application_id, tenant_id, branch_id)
            if not application:
                return False, "Application not found"
            db.session.delete(application)
            db.session.commit()
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Database error: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return False, f"Unexpected error: {str(e)}"

    @staticmethod
    def change_application_status(
        application_id: int, new_status: str, tenant_id=None, branch_id=None
    ) -> Tuple[
        Optional[AdmissionApplication], Optional[Student], Optional[str], Optional[str]
    ]:
        """
        Transition an AdmissionApplication's status.
        If transition is to 'ACCEPTED' or 'accepted', atomically provisions a User,
        Student, TenantMembership, and generates a SHA-256 account-claim token.

        All-or-nothing transactional guarantees are ensured using nested savepoints.
        """
        try:
            ctx_tenant, ctx_branch = AdmissionService._get_ctx_scope(tenant_id, branch_id)
            base_query = AdmissionApplication.query.filter_by(id=application_id).with_for_update()
            if ctx_tenant is not None:
                base_query = base_query.join(Parent, AdmissionApplication.parent_id == Parent.id).filter(
                    (Parent.tenant_id == ctx_tenant) | (Parent.tenant_id.is_(None))
                )
            if ctx_branch is not None and hasattr(AdmissionApplication, "branch_id"):
                base_query = base_query.filter(
                    (AdmissionApplication.branch_id == ctx_branch) | (AdmissionApplication.branch_id.is_(None))
                )
            if ctx_tenant is not None and hasattr(AdmissionApplication, "tenant_id"):
                base_query = base_query.filter(
                    (AdmissionApplication.tenant_id == ctx_tenant) | (AdmissionApplication.tenant_id.is_(None))
                )
            application = base_query.first()
            if not application:
                return None, None, None, "Admission application not found."

            # Normalize status to lowercase
            norm_status = new_status.lower().strip()

            # Start database savepoint
            db.session.begin_nested()

            student = None
            raw_token = None

            # 2. Check if transitioning to accepted
            if norm_status == "accepted":
                if application.status == "accepted":
                    db.session.rollback()
                    # Safely retrieve the already provisioned student record
                    existing_student = Student.query.filter_by(
                        parent_id=application.parent_id,
                        first_name=application.student_first_name,
                        last_name=application.student_last_name,
                    ).first()
                    return application, existing_student, None, None

                # Validate parent
                parent = Parent.query.get(application.parent_id)
                if not parent:
                    db.session.rollback()
                    return None, None, None, "Associated parent account not found."

                # Validate target class
                target_class = (
                    Class.query.get(application.target_class_id)
                    if application.target_class_id
                    else None
                )

                # Deduce tenant and branch IDs
                app_tenant_id = parent.tenant_id
                app_branch_id = target_class.branch_id if target_class else None

                # Generate unique admission number first
                adm_no = Student.generate_admission_number(tenant_id=app_tenant_id)

                # Extrapolate YY and serial_padded from the generated admission number
                yy = adm_no[-8:-6]
                serial_padded = adm_no[-6:]

                # Sanitize student names for username using new alphanumeric pattern
                import unicodedata

                def sanitize_and_clean_accents(s: str) -> str:
                    if not s:
                        return ""
                    nfkd_form = unicodedata.normalize("NFKD", s)
                    only_ascii = nfkd_form.encode("ASCII", "ignore").decode("ASCII")
                    return only_ascii

                clean_first = sanitize_and_clean_accents(
                    application.student_first_name or "student"
                )
                clean_first = "".join(c for c in clean_first if c.isalnum()).lower()

                clean_last = sanitize_and_clean_accents(
                    application.student_last_name or "user"
                )
                clean_last = "".join(c for c in clean_last if c.isalnum()).lower()
                last_initial = clean_last[0] if clean_last else "x"

                safe_username = f"{clean_first}{last_initial}{yy}{serial_padded}"

                # Provision User account for the student
                # Extract email or generate a fallback
                form_data = application.form_data or {}
                student_email = form_data.get("student_email") or form_data.get("email")
                if not student_email:
                    student_email = (
                        f"student_{application.id}_{secrets.token_hex(4)}@example.com"
                    )

                # Ensure unique email
                existing_user = User.query.filter_by(email=student_email).first()
                if existing_user:
                    student_email = (
                        f"student_{application.id}_{secrets.token_hex(6)}@example.com"
                    )

                stub_hash = bcrypt.generate_password_hash(
                    secrets.token_urlsafe(32)
                ).decode("utf-8")
                user = User(
                    username=safe_username,
                    email=student_email,
                    password_hash=stub_hash,
                    role="student",
                    status="pending_activation",
                )
                db.session.add(user)
                db.session.flush()  # Flush to populate user.id

                # Provision TenantMembership for the User
                membership = TenantMembership.query.filter_by(
                    user_id=user.id, tenant_id=app_tenant_id
                ).first()
                if not membership:
                    membership = TenantMembership(
                        tenant_id=app_tenant_id,
                        user_id=user.id,
                        role="student",
                        status="active",
                    )
                    db.session.add(membership)

                # Provision Student record
                # Deduce gender and date_of_birth
                gender = form_data.get("gender", "f")
                dob_val = form_data.get("date_of_birth")

                dob = None
                if dob_val:
                    try:
                        dob = datetime.strptime(
                            str(dob_val).split("T")[0].strip(), "%Y-%m-%d"
                        ).date()
                    except ValueError:
                        pass
                if not dob:
                    dob = date(2015, 1, 1)  # Default fallback DOB

                student = Student(
                    tenant_id=app_tenant_id,
                    branch_id=app_branch_id,
                    user_id=user.id,
                    admission_number=adm_no,
                    first_name=application.student_first_name or "Student",
                    last_name=application.student_last_name or "Name",
                    gender=gender,
                    date_of_birth=dob,
                    parent_id=application.parent_id,
                    class_id=application.target_class_id,
                    status="active",
                )
                db.session.add(student)
                db.session.flush()  # Flush to populate student.id

                # Push setup task record
                from app.models.parent import ParentChildSetupTask

                setup_task = ParentChildSetupTask(
                    tenant_id=app_tenant_id,
                    parent_id=application.parent_id,
                    student_id=student.id,
                    status="pending",
                    task_type="child_setup",
                    title=f"Set up account for {student.first_name} {student.last_name}",
                    description=f"Complete the initial portal setup tasks for your child, {student.first_name}.",
                )
                db.session.add(setup_task)

                # Cryptographically secure SHA-256 account-claim token
                raw_token = secrets.token_urlsafe(48)
                token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
                expires_at = datetime.utcnow() + timedelta(hours=48)

                # Write token hash and expiration to Student and User
                student.invitation_token_hash = token_hash
                student.invitation_expires_at = expires_at

                user.invitation_token_hash = token_hash
                user.invitation_expires_at = expires_at

            # Set the new status
            application.status = norm_status

            # Commit the transaction savepoint
            db.session.commit()
            return application, student, raw_token, None

        except SQLAlchemyError as e:
            db.session.rollback()
            return None, None, None, f"Database error occurred: {str(e)}"
        except Exception as e:
            db.session.rollback()
            return None, None, None, f"Unexpected error occurred: {str(e)}"
