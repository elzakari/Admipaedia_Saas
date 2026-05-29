import secrets
from werkzeug.security import generate_password_hash
import hashlib
from datetime import datetime, date, timedelta
from typing import Tuple, Optional
from app.extensions import db
from app.models.admission import AdmissionApplication
from app.models.student import Student
from app.models.user import User
from app.models.parent import Parent
from app.models.class_ import Class
from app.models.tenant import TenantMembership
from sqlalchemy.exc import SQLAlchemyError

class AdmissionService:
    """Service to handle student admission applications."""
    
    @staticmethod
    def change_application_status(application_id: int, new_status: str, tenant_id=None) -> Tuple[Optional[AdmissionApplication], Optional[Student], Optional[str], Optional[str]]:
        """
        Transition an AdmissionApplication's status.
        If transition is to 'ACCEPTED' or 'accepted', atomically provisions a User,
        Student, TenantMembership, and generates a SHA-256 account-claim token.
        
        All-or-nothing transactional guarantees are ensured using nested savepoints.
        """
        try:
            # 1. Retrieve application with row-level locking
            application = AdmissionApplication.query.filter_by(id=application_id).with_for_update().first()
            if not application:
                return None, None, None, "Admission application not found."
                
            # If tenant_id provided, ensure parent has the same tenant_id
            if tenant_id and application.parent and application.parent.tenant_id != tenant_id:
                return None, None, None, "Unauthorized access to this application."
                
            # Normalize status to lowercase
            norm_status = new_status.lower().strip()
            
            # Start database savepoint
            db.session.begin_nested()
            
            student = None
            raw_token = None
            
            # 2. Check if transitioning to accepted
            if norm_status == 'accepted':
                if application.status == 'accepted':
                    db.session.rollback()
                    # Safely retrieve the already provisioned student record
                    existing_student = Student.query.filter_by(
                        parent_id=application.parent_id,
                        first_name=application.student_first_name,
                        last_name=application.student_last_name
                    ).first()
                    return application, existing_student, None, None
                    
                # Validate parent
                parent = Parent.query.get(application.parent_id)
                if not parent:
                    db.session.rollback()
                    return None, None, None, "Associated parent account not found."
                    
                # Validate target class
                target_class = Class.query.get(application.target_class_id) if application.target_class_id else None
                
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
                    nfkd_form = unicodedata.normalize('NFKD', s)
                    only_ascii = nfkd_form.encode('ASCII', 'ignore').decode('ASCII')
                    return only_ascii

                clean_first = sanitize_and_clean_accents(application.student_first_name or "student")
                clean_first = "".join(c for c in clean_first if c.isalnum()).lower()
                
                clean_last = sanitize_and_clean_accents(application.student_last_name or "user")
                clean_last = "".join(c for c in clean_last if c.isalnum()).lower()
                last_initial = clean_last[0] if clean_last else "x"
                
                safe_username = f"{clean_first}{last_initial}{yy}{serial_padded}"

                # Provision User account for the student
                # Extract email or generate a fallback
                form_data = application.form_data or {}
                student_email = form_data.get('student_email') or form_data.get('email')
                if not student_email:
                    student_email = f"student_{application.id}_{secrets.token_hex(4)}@example.com"
                    
                # Ensure unique email
                existing_user = User.query.filter_by(email=student_email).first()
                if existing_user:
                    student_email = f"student_{application.id}_{secrets.token_hex(6)}@example.com"
                
                stub_hash = generate_password_hash(secrets.token_urlsafe(32))
                user = User(
                    username=safe_username,
                    email=student_email,
                    password_hash=stub_hash,
                    role='student',
                    status='pending_activation'
                )
                db.session.add(user)
                db.session.flush() # Flush to populate user.id
                
                # Provision TenantMembership for the User
                membership = TenantMembership.query.filter_by(user_id=user.id, tenant_id=app_tenant_id).first()
                if not membership:
                    membership = TenantMembership(
                        tenant_id=app_tenant_id,
                        user_id=user.id,
                        role='student',
                        status='active'
                    )
                    db.session.add(membership)
                
                # Provision Student record
                # Deduce gender and date_of_birth
                gender = form_data.get('gender', 'f')
                dob_val = form_data.get('date_of_birth')
                
                dob = None
                if dob_val:
                    try:
                        dob = datetime.strptime(str(dob_val).split('T')[0].strip(), "%Y-%m-%d").date()
                    except ValueError:
                        pass
                if not dob:
                    dob = date(2015, 1, 1) # Default fallback DOB
                    
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
                    status='active'
                )
                db.session.add(student)
                db.session.flush() # Flush to populate student.id

                # Push setup task record
                from app.models.parent import ParentChildSetupTask
                setup_task = ParentChildSetupTask(
                    tenant_id=app_tenant_id,
                    parent_id=application.parent_id,
                    student_id=student.id,
                    status='pending',
                    task_type='child_setup',
                    title=f"Set up account for {student.first_name} {student.last_name}",
                    description=f"Complete the initial portal setup tasks for your child, {student.first_name}."
                )
                db.session.add(setup_task)
                
                # Cryptographically secure SHA-256 account-claim token
                raw_token = secrets.token_urlsafe(48)
                token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
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
