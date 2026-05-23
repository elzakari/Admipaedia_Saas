from marshmallow import Schema, fields, validate

class AdmissionApplicationSchema(Schema):
    """Schema for the AdmissionApplication model"""
    id = fields.Int(dump_only=True)
    parent_id = fields.Int(dump_only=True)
    
    student_first_name = fields.String(validate=validate.Length(max=100))
    student_last_name = fields.String(validate=validate.Length(max=100))
    target_class_id = fields.Int()
    
    payment_status = fields.String(dump_only=True)
    payment_id = fields.Int(dump_only=True)
    form_purchase_date = fields.DateTime(dump_only=True)
    
    status = fields.String(dump_only=True)
    submission_date = fields.DateTime(dump_only=True)
    
    form_data = fields.Dict()
    
    parent_email = fields.Method("get_parent_email", dump_only=True)
    expected_username = fields.Method("get_expected_username", dump_only=True)

    def get_parent_email(self, obj):
        if obj.parent and obj.parent.user:
            return obj.parent.user.email
        return None

    def get_expected_username(self, obj):
        clean_first = "".join(c for c in (obj.student_first_name or "") if c.isalnum()).lower()
        clean_last = "".join(c for c in (obj.student_last_name or "") if c.isalnum()).lower()
        if not clean_first and not clean_last:
            clean_first = "student"
        username = f"{clean_first}.{clean_last}" if clean_last else clean_first
        
        from app.models.user import User
        base_username = username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1
        return username

    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

class BuyFormSchema(Schema):
    """Schema for initializing a form purchase"""
    student_first_name = fields.String(required=True, validate=validate.Length(min=2, max=100))
    student_last_name = fields.String(required=True, validate=validate.Length(min=2, max=100))
    target_class_id = fields.Int(required=True)

class SubmitFormSchema(Schema):
    """Schema for submitting the filled form"""
    form_data = fields.Dict(required=True)


class SaveDraftSchema(Schema):
    """Schema for saving a draft form (without submission)."""
    form_data = fields.Dict(required=True)


class ReviewApplicationSchema(Schema):
    """Schema for admin review actions."""
    status = fields.String(required=True, validate=validate.OneOf(['under_review', 'approved', 'rejected']))
    notes = fields.String(required=False, allow_none=True)
