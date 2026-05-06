from marshmallow import Schema, fields, validate, validates, ValidationError
import re
from marshmallow import Schema, fields, validate, post_dump

class RoleSchema(Schema):
    """Schema for Role model."""
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    description = fields.Str()

class UserSchema(Schema):
    """Schema for User model."""
    id = fields.Str(dump_only=True)
    username = fields.Str(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    password = fields.Str(load_only=True, required=True, validate=validate.Length(min=8))
    first_name = fields.Str()
    last_name = fields.Str()
    phone = fields.Str()
    status = fields.Str()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    last_login = fields.DateTime(dump_only=True)
    roles = fields.List(fields.Nested(RoleSchema), dump_only=True)
    
    @post_dump
    def add_full_name(self, data, **kwargs):
        """Add full_name to serialized data."""
        if data.get('first_name') and data.get('last_name'):
            data['full_name'] = f"{data['first_name']} {data['last_name']}"
        return data
    
    @validates('username')
    def validate_username(self, value):
        """Validate username format."""
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise ValidationError('Username can only contain letters, numbers, and underscores')
    
    @validates('password')
    def validate_password(self, value):
        """Validate password strength."""
        if not re.search(r'[A-Z]', value):
            raise ValidationError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', value):
            raise ValidationError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', value):
            raise ValidationError('Password must contain at least one number')

class UserLoginSchema(Schema):
    """Schema for user login."""
    username = fields.String(required=False)
    email = fields.String(required=False)
    password = fields.String(required=True, validate=validate.Length(min=8, max=100))
    
    @validates('username')
    def validate_username_or_email(self, value, **kwargs):
        # Ensure either username or email is provided
        if not value and not kwargs.get('data', {}).get('email'):
            raise ValidationError('Either username or email must be provided.')

class UserUpdateSchema(Schema):
    """Schema for user update."""
    first_name = fields.String(validate=validate.Length(min=2, max=64))
    last_name = fields.String(validate=validate.Length(min=2, max=64))
    email = fields.Email()
    password = fields.String(validate=validate.Length(min=8), load_only=True)


class UserSchema(Schema):
    """Schema for serializing and deserializing User objects"""
    id = fields.UUID(dump_only=True)
    username = fields.String(required=True, validate=validate.Length(min=3, max=50))
    email = fields.Email(required=True)
    phone = fields.String(validate=validate.Length(max=20))
    role = fields.String(validate=validate.OneOf(['admin', 'teacher', 'student', 'parent', 'user']))
    status = fields.String(dump_only=True)
    last_login = fields.DateTime(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    
    # Fields for registration/update
    password = fields.String(load_only=True, validate=validate.Length(min=8), required=False)
    confirm_password = fields.String(load_only=True, required=False)
    
    @validates('password')
    def validate_password(self, value):
        """Validate password strength"""
        if len(value) < 8:
            raise ValidationError("Password must be at least 8 characters long")
        
        if not re.search(r'[A-Z]', value):
            raise ValidationError("Password must contain at least one uppercase letter")
            
        if not re.search(r'[a-z]', value):
            raise ValidationError("Password must contain at least one lowercase letter")
            
        if not re.search(r'[0-9]', value):
            raise ValidationError("Password must contain at least one number")
    
    @validates('confirm_password')
    def validate_confirm_password(self, value):
        """Validate that passwords match"""
        if 'password' in self.data and value != self.data['password']:
            raise ValidationError("Passwords do not match")


class LoginSchema(Schema):
    """Schema for login requests"""
    email = fields.Email(required=True)
    password = fields.String(required=True)


class PasswordResetRequestSchema(Schema):
    """Schema for password reset requests"""
    email = fields.Email(required=True)


class PasswordResetSchema(Schema):
    """Schema for password reset"""
    token = fields.String(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    confirm_password = fields.String(required=True)
    
    @validates('confirm_password')
    def validate_confirm_password(self, value):
        if 'password' in self.data and value != self.data['password']:
            raise ValidationError("Passwords do not match")


class ChangePasswordSchema(Schema):
    """Schema for changing password"""
    current_password = fields.String(required=True)
    new_password = fields.String(required=True, validate=validate.Length(min=8))
    confirm_password = fields.String(required=True)
    
    @validates('new_password')
    def validate_new_password(self, value):
        """Validate password strength"""
        if len(value) < 8:
            raise ValidationError("Password must be at least 8 characters long")
        
        if not re.search(r'[A-Z]', value):
            raise ValidationError("Password must contain at least one uppercase letter")
            
        if not re.search(r'[a-z]', value):
            raise ValidationError("Password must contain at least one lowercase letter")
            
        if not re.search(r'[0-9]', value):
            raise ValidationError("Password must contain at least one number")
    
    @validates('confirm_password')
    def validate_confirm_password(self, value):
        if 'new_password' in self.data and value != self.data['new_password']:
            raise ValidationError("Passwords do not match")