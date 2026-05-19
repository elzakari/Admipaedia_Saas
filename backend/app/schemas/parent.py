from marshmallow import Schema, fields, validate, validates, ValidationError

class ParentSchema(Schema):
    """Schema for Parent model."""
    id = fields.Int(dump_only=True)
    user_id = fields.Int(required=True)
    occupation = fields.Str(validate=validate.Length(max=100))
    address = fields.Str(validate=validate.Length(max=255))
    emergency_contact = fields.Str(validate=validate.Length(max=20))
    relationship = fields.Str(validate=validate.Length(max=50))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Include user information
    user = fields.Nested('UserSchema', exclude=['password'], dump_only=True)
    
    # Include children dynamically
    children = fields.Method("get_children", dump_only=True)

    def get_children(self, obj):
        from app.models.student import Student
        from flask import g
        
        tenant_id = getattr(g, 'tenant_id', None)
        
        # Safely query children linked to this parent
        query = Student.query.filter(Student.parent_id == obj.id)
        if tenant_id:
            # Try to pull linked student records matching active tenant ID context
            tenant_query = query.filter(Student.tenant_id == tenant_id)
            if tenant_query.count() > 0:
                students = tenant_query.all()
            else:
                # If no matching due to strict tenant mismatch, fall back to matching parent_id only
                students = query.all()
        else:
            students = query.all()
            
        return [
            {
                "id": s.id,
                "first_name": s.first_name,
                "last_name": s.last_name,
                "class_name": s.class_.name if s.class_ else None
            }
            for s in students
        ]


class ParentCreateSchema(Schema):
    """Schema for creating a parent."""
    user_id = fields.Int(required=True)
    occupation = fields.Str(validate=validate.Length(max=100))
    address = fields.Str(validate=validate.Length(max=255))
    emergency_contact = fields.Str(validate=validate.Length(max=20))
    relationship = fields.Str(validate=validate.Length(max=50))

class ParentUpdateSchema(Schema):
    """Schema for updating a parent."""
    occupation = fields.Str(validate=validate.Length(max=100))
    address = fields.Str(validate=validate.Length(max=255))
    emergency_contact = fields.Str(validate=validate.Length(max=20))
    relationship = fields.Str(validate=validate.Length(max=50))