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
