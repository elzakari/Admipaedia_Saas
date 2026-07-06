from datetime import datetime
from marshmallow import Schema, fields, validate

class AdmissionApplicationSchema(Schema):
    """Schema for the AdmissionApplication model"""
    id = fields.Int(dump_only=True)
    parent_id = fields.Int(dump_only=True)
    
    student_first_name = fields.String(validate=validate.Length(max=100))
    student_last_name = fields.String(validate=validate.Length(max=100))
    target_class_id = fields.Int()
    target_class_name = fields.Method("get_target_class_name", dump_only=True)
    
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

    def get_target_class_name(self, obj):
        if obj.target_class:
            return obj.target_class.name
        return None

    def get_expected_username(self, obj):
        if not obj.student_first_name:
            return None
        
        # 1. Normalize name inputs
        import unicodedata
        def sanitize(s):
            if not s:
                return ""
            nfkd = unicodedata.normalize('NFKD', s)
            only_ascii = nfkd.encode('ASCII', 'ignore').decode('ASCII')
            return "".join(c for c in only_ascii if c.isalnum()).lower()
            
        clean_first = sanitize(obj.student_first_name)
        clean_last = sanitize(obj.student_last_name)
        last_initial = clean_last[0] if clean_last else "x"
        
        # 2. Get entry year
        current_year = datetime.utcnow().year
        yy = str(current_year)[-2:]
        
        # 3. Resolve tenant_id from target_class
        tenant_id = None
        if obj.target_class:
            tenant_id = obj.target_class.tenant_id
            
        # 4. Resolve next serial sequence (read-only, do not increment)
        if tenant_id:
            from app.models.security import TenantCredentialCounter
            counter = TenantCredentialCounter.query.filter_by(
                tenant_id=str(tenant_id),
                year=current_year
            ).first()
            current_serial = counter.last_value if counter else 0
            next_serial = current_serial + 1
        else:
            next_serial = obj.id or 1
            
        serial_padded = f"{next_serial:06d}"
        
        return f"{clean_first}{last_initial}{yy}{serial_padded}"

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
    student_first_name = fields.String(required=False, validate=validate.Length(min=2, max=100))
    student_last_name = fields.String(required=False, validate=validate.Length(min=2, max=100))
    target_class_id = fields.Int(required=False)
    form_data = fields.Dict(required=False)


class ReviewApplicationSchema(Schema):
    """Schema for admin review actions."""
    status = fields.String(required=True, validate=validate.OneOf(['under_review', 'approved', 'rejected', 'returned']))
    notes = fields.String(required=False, allow_none=True)
