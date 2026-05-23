from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.admission import AdmissionApplication
from app.models.parent import Parent
from app.models.user import User
from app.models.finance import Payment
from app.models.system_setting import SystemSetting
from app.models.class_ import Class
from app.schemas.admission import AdmissionApplicationSchema, BuyFormSchema, SubmitFormSchema, SaveDraftSchema, ReviewApplicationSchema
from app.utils.auth_utils import admin_required, parent_required
from datetime import datetime
import uuid

admission_application_schema = AdmissionApplicationSchema()
admission_applications_schema = AdmissionApplicationSchema(many=True)
buy_form_schema = BuyFormSchema()
submit_form_schema = SubmitFormSchema()
save_draft_schema = SaveDraftSchema()
review_application_schema = ReviewApplicationSchema()

@jwt_required()
@admin_required
def get_all_applications():
    """List all applications (admin only)."""
    applications = AdmissionApplication.query.all()
    return jsonify({
        'success': True,
        'data': admission_applications_schema.dump(applications)
    }), 200

@jwt_required()
@parent_required
def get_my_applications():
    """List applications for the logged-in parent."""
    user_id = get_jwt_identity()
    parent = Parent.query.filter_by(user_id=user_id).first()
    if not parent:
        user = User.query.get(user_id)
        if user and user.role == 'parent':
            try:
                parent = Parent(user_id=user_id)
                db.session.add(parent)
                db.session.commit()
            except Exception:
                db.session.rollback()
                parent = Parent.query.filter_by(user_id=user_id).first()
        if not parent:
            return jsonify({'success': True, 'data': []}), 200
        
    applications = AdmissionApplication.query.filter_by(parent_id=parent.id).all()
    return jsonify({
        'success': True,
        'data': admission_applications_schema.dump(applications)
    }), 200

@jwt_required()
def buy_admission_form():
    """Initialize a form purchase for a potential student."""
    user_id = get_jwt_identity()
    parent = Parent.query.filter_by(user_id=user_id).first()
    if not parent:
        user = User.query.get(user_id)
        if not user or user.role != 'parent':
            return jsonify({'success': False, 'message': 'Parent profile not found'}), 404
        parent = Parent(user_id=user_id)
        db.session.add(parent)
        db.session.commit()
        
    try:
        data = buy_form_schema.load(request.json)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    target_class = Class.query.get(data['target_class_id'])
    if not target_class:
      return jsonify({'success': False, 'message': 'Target class not found'}), 400
        
    # Fetch dynamic price and currency from tenant settings / tenant
    from flask import g
    tenant_id = getattr(g, 'tenant_id', None) or (target_class.tenant_id if target_class else None)
    currency = 'GHS'
    admission_price = None

    if tenant_id:
        from app.models.tenant import Tenant
        tenant = Tenant.query.get(tenant_id)
        if tenant:
            currency = getattr(tenant, 'currency', None) or 'GHS'
            store = getattr(tenant, 'settings', None) or {}
            if isinstance(store, dict):
                v = store.get('admission_form_price')
                try:
                    if v is not None and str(v).strip() != '':
                        admission_price = float(v)
                except Exception:
                    pass

    if admission_price is None:
        admission_price = float(SystemSetting.get_value('admission_form_price', '100.00'))
    
    # Simulate payment for now
    # In a real app, this would involve a payment gateway integration
    payment = Payment(
        transaction_id=f"ADM-FORM-{uuid.uuid4().hex[:8].upper()}",
        amount=admission_price,
        currency=currency,
        payment_method='card',
        status='completed',
        paid_at=datetime.utcnow()
    )
    # Note: Payment model currently requires student_id. 
    # For admission form, we might need to update the Payment model or use a placeholder student_id.
    # Since we don't have a student_id yet, let's assume we allow null student_id in Payment or use a system ID.
    # Let's check Payment model again.
    
    application = AdmissionApplication(
        parent_id=parent.id,
        student_first_name=data['student_first_name'],
        student_last_name=data['student_last_name'],
        target_class_id=data['target_class_id'],
        payment_status='paid', # Auto-paid in simulation
        form_purchase_date=datetime.utcnow(),
        status='draft'
    )
    
    db.session.add(application)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Admission form purchased successfully',
        'application_id': application.id
    }), 201

@jwt_required()
def get_application_details(id):
    """Get details of a specific application."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    application = AdmissionApplication.query.get_or_404(id)
    
    # Allow if user is admin or if they are the parent who created the application
    if user.role != 'admin':
        parent = Parent.query.filter_by(user_id=user_id).first()
        if not parent or application.parent_id != parent.id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
    return jsonify({
        'success': True,
        'data': admission_application_schema.dump(application)
    }), 200

@jwt_required()
def submit_admission_form(id):
    """Submit the filled admission form data."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    application = AdmissionApplication.query.get_or_404(id)
    
    # Only parents can submit their own forms
    if user.role != 'parent':
        return jsonify({'success': False, 'message': 'Only parents can submit forms'}), 403
        
    parent = Parent.query.filter_by(user_id=user_id).first()
    if not parent or application.parent_id != parent.id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
    if application.payment_status != 'paid':
        return jsonify({'success': False, 'message': 'Form not paid for'}), 400

    if application.status not in ('draft', 'returned'):
        return jsonify({'success': False, 'message': 'Application is already submitted or processed'}), 400
        
    try:
        data = submit_form_schema.load(request.json)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400
        
    application.form_data = data['form_data']
    application.status = 'submitted'
    application.submission_date = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Admission form submitted successfully'
    }), 200


@jwt_required()
def save_admission_draft(id):
    """Save draft form data without submitting (parent only)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    application = AdmissionApplication.query.get_or_404(id)

    if not user or user.role != 'parent':
        return jsonify({'success': False, 'message': 'Only parents can save drafts'}), 403

    parent = Parent.query.filter_by(user_id=user_id).first()
    if not parent or application.parent_id != parent.id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    if application.payment_status != 'paid':
        return jsonify({'success': False, 'message': 'Form not paid for'}), 400

    if application.status not in ('draft', 'returned'):
        return jsonify({'success': False, 'message': 'Cannot edit a submitted application'}), 400

    try:
        data = save_draft_schema.load(request.json)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    application.form_data = data['form_data']
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Draft saved',
        'data': admission_application_schema.dump(application)
    }), 200


@jwt_required()
@admin_required
def review_application(id):
    """Admin review actions: mark under_review/approved/rejected."""
    from app.api.v1.saas.routes import patch_admission_status
    return patch_admission_status(id)

    try:
        data = review_application_schema.load(request.json)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    next_status = data['status']
    notes = data.get('notes')

    form_data = application.form_data or {}
    if isinstance(form_data, str):
        try:
            import json
            form_data = json.loads(form_data)
        except Exception:
            form_data = {}
    if not isinstance(form_data, dict):
        form_data = {}

    review_block = form_data.get('_review', {})
    review_block.update({
        'status': next_status,
        'notes': notes,
        'reviewed_at': datetime.utcnow().isoformat()
    })
    form_data['_review'] = review_block
    application.form_data = form_data
    
    if next_status == 'approved':
        try:
            application.status = next_status
            from flask import g
            tenant_id = (
                getattr(g, 'tenant_id', None) or 
                (application.target_class.tenant_id if application.target_class else None) or 
                (application.parent.tenant_id if application.parent else None)
            )
            if not tenant_id:
                raise ValueError("Could not resolve a valid tenant context for student creation.")
                
            from app.models.student import Student
            from app.models.user import User
            
            # Determine student email
            student_email = form_data.get('student_email') or form_data.get('email') or None
                
            # Create user account for student if not exists
            student_user = None
            raw_token = None
            if student_email:
                student_user = User.query.filter_by(email=student_email).first()
                
            if not student_user:
                if student_email:
                    username = student_email.split('@')[0]
                else:
                    clean_first = "".join(c for c in (application.student_first_name or "") if c.isalnum()).lower()
                    clean_last = "".join(c for c in (application.student_last_name or "") if c.isalnum()).lower()
                    if not clean_first and not clean_last:
                        clean_first = "student"
                    username = f"{clean_first}_{clean_last}"
                
                base_username = username
                counter = 1
                while User.query.filter_by(username=username).first():
                    username = f"{base_username}_{counter}"
                    counter += 1
                
                import secrets
                import hashlib
                from datetime import timedelta
                
                raw_token = secrets.token_urlsafe(32)
                token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
                
                student_user = User(
                    username=username,
                    email=student_email,
                    role='student',
                    status='pending_activation',
                    password_reset_token=token_hash,
                    password_reset_expires=datetime.utcnow() + timedelta(days=7)
                )
                student_user.password_hash = None # permits newly provisioned student profiles to remain password-empty
                db.session.add(student_user)
                db.session.flush() # Flush to get student_user.id
                
            # Resolve gender
            gender = form_data.get('gender')
            if gender:
                gender = str(gender).lower()
                if gender in ('m', 'male'):
                    gender = 'male'
                elif gender in ('f', 'female'):
                    gender = 'female'
                else:
                    gender = 'other'
            else:
                gender = 'female'
                
            # Resolve date of birth (mapping dob / date_of_birth)
            dob_raw = form_data.get('dob') or form_data.get('date_of_birth') or form_data.get('dateOfBirth')
            if not dob_raw:
                raise ValueError("Missing required field: date_of_birth")
                
            if isinstance(dob_raw, str):
                try:
                    date_of_birth = datetime.strptime(dob_raw.split('T')[0], '%Y-%m-%d').date()
                except Exception:
                    raise ValueError(f"Invalid date_of_birth format: {dob_raw}. Expected YYYY-MM-DD.")
            else:
                date_of_birth = dob_raw
                
            # Resolve mapping attributes
            address_val = form_data.get('home_address') or form_data.get('address') or form_data.get('residential_address')
            blood_group_val = form_data.get('blood_group') or form_data.get('bloodGroup')
            phone_val = form_data.get('emergency_contact') or form_data.get('phone_number') or form_data.get('phone') or form_data.get('telephone') or form_data.get('student_phone')
                
            # Build student payload
            student_payload = {
                'tenant_id': tenant_id,
                'user_id': student_user.id,
                'first_name': application.student_first_name or "",
                'last_name': application.student_last_name or "",
                'parent_id': application.parent_id,
                'class_id': application.target_class_id,
                'gender': gender,
                'date_of_birth': date_of_birth,
                'status': 'pending_activation',
                
                # Unpack form_data mapping
                'address': address_val,
                'residential_address': address_val,
                'blood_group': blood_group_val,
                'phone': phone_val,
                
                # Optional fields from form_data
                'middle_name': form_data.get('middle_name') or form_data.get('middleName'),
                'place_of_birth': form_data.get('place_of_birth') or form_data.get('placeOfBirth'),
                'nationality': form_data.get('nationality'),
                'religious_denomination': form_data.get('religious_denomination') or form_data.get('religiousDenomination'),
                'email': student_email,
                'telephone': form_data.get('telephone') or form_data.get('student_phone') or phone_val,
                'whatsapp': form_data.get('whatsapp'),
                'postal_address': form_data.get('postal_address') or address_val,
                'digital_address': form_data.get('digital_address'),
                'city': form_data.get('city'),
                'country': form_data.get('country'),
                'local_landmark': form_data.get('local_landmark'),
                
                # Health fields
                'medical_conditions': form_data.get('medical_conditions') or form_data.get('special_circumstance'),
                'special_circumstance': form_data.get('special_circumstance') or form_data.get('medical_conditions'),
                'allergies': form_data.get('allergies'),
                'medication': form_data.get('medication'),
                'physician_name': form_data.get('physician_name'),
                'physician_phone': form_data.get('physician_phone'),
                
                # Academic fields
                'previous_school': form_data.get('previous_school'),
                'previous_class': form_data.get('previous_class'),
                'previous_team': form_data.get('previous_team'),
                'previous_year': form_data.get('previous_year'),
                
                # Parent/Guardian details
                'father_name': form_data.get('father_name') or form_data.get('fatherName'),
                'father_contact': form_data.get('father_contact') or form_data.get('fatherContact') or form_data.get('father_phone'),
                'father_address': form_data.get('father_address') or form_data.get('fatherAddress'),
                'father_email': form_data.get('father_email') or form_data.get('fatherEmail'),
                'father_profession': form_data.get('father_profession') or form_data.get('fatherProfession'),
                'father_workplace': form_data.get('father_workplace') or form_data.get('fatherWorkplace'),
                
                'mother_name': form_data.get('mother_name') or form_data.get('motherName'),
                'mother_contact': form_data.get('mother_contact') or form_data.get('motherContact') or form_data.get('mother_phone'),
                'mother_address': form_data.get('mother_address') or form_data.get('motherAddress'),
                'mother_email': form_data.get('mother_email') or form_data.get('motherEmail'),
                'mother_profession': form_data.get('mother_profession') or form_data.get('motherProfession'),
                'mother_workplace': form_data.get('mother_workplace') or form_data.get('motherWorkplace'),
                
                'guardian_name': form_data.get('guardian_name') or form_data.get('guardianName'),
                'guardian_contact': form_data.get('guardian_contact') or form_data.get('guardianContact') or form_data.get('guardian_phone'),
            }
            
            from app.services.student_service import StudentService
            student_service = StudentService(db.session)
            
            from app.models.parent import Parent
            parent_obj = None
            if application.parent_id:
                parent_obj = Parent.query.get(application.parent_id)
                
            student, error = student_service.create_student(student_payload, tenant_id=tenant_id)
            if error:
                raise ValueError(error)
                
            if parent_obj and student:
                # Link bidirectional parent-student relationships to avoid orphaned records
                student.parent = parent_obj
                student.parent_id = parent_obj.id
                if student not in parent_obj.children:
                    parent_obj.children.append(student)
                db.session.add(parent_obj)
                db.session.add(student)
                db.session.flush()
                
            # Send activation email using isolated try/except block
            if student_email and raw_token:
                try:
                    from app.services.email_service import send_password_reset_email
                    mail_sent = send_password_reset_email(student_email, raw_token)
                    if not mail_sent:
                        raise Exception("Mail dispatch returned False status")
                except Exception as mail_err:
                    import sys
                    print(f"[MAIL FALLBACK] Resend API failed: {str(mail_err)}. Fallback generated raw token for email {student_email}: {raw_token}", file=sys.stdout)
                    sys.stdout.flush()
                
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f"Student record generation failed: {str(e)}"
            }), 500
    else:
        application.status = next_status

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Application updated',
        'data': admission_application_schema.dump(application)
    }), 200
