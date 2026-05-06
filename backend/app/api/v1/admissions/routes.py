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
        
    # Fetch dynamic price from settings
    admission_price = float(SystemSetting.get_value('admission_form_price', '100.00'))
    
    # Simulate payment for now
    # In a real app, this would involve a payment gateway integration
    payment = Payment(
        transaction_id=f"ADM-FORM-{uuid.uuid4().hex[:8].upper()}",
        amount=admission_price,
        currency='GHS',
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

    if application.status != 'draft':
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
    application = AdmissionApplication.query.get_or_404(id)

    if application.status == 'draft':
        return jsonify({'success': False, 'message': 'Draft applications cannot be reviewed'}), 400

    try:
        data = review_application_schema.load(request.json)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    next_status = data['status']
    notes = data.get('notes')

    form_data = application.form_data or {}
    review_block = form_data.get('_review', {}) if isinstance(form_data, dict) else {}
    review_block.update({
        'status': next_status,
        'notes': notes,
        'reviewed_at': datetime.utcnow().isoformat()
    })
    if isinstance(form_data, dict):
        form_data['_review'] = review_block
        application.form_data = form_data

    application.status = next_status
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Application updated',
        'data': admission_application_schema.dump(application)
    }), 200
