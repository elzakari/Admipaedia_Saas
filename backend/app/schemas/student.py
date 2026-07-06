from marshmallow import Schema, fields, validate, validates, ValidationError, pre_load
from datetime import datetime
from app.schemas.educational_level import GradeLevelMinimalSchema
from flask import has_app_context


def _extract_parent_name_parts_from_user(user):
    profile = getattr(user, 'profile', None) if user else None
    first_name = (
        getattr(profile, 'first_name', None)
        or getattr(user, 'first_name', None)
        or ''
    )
    last_name = (
        getattr(profile, 'last_name', None)
        or getattr(user, 'last_name', None)
        or ''
    )

    if first_name or last_name:
        return str(first_name).strip(), str(last_name).strip()

    full_name = ''
    if user and hasattr(user, 'get_full_name'):
        full_name = (user.get_full_name() or '').strip()
    if not full_name and user:
        full_name = (getattr(user, 'username', '') or '').strip()
    if not full_name:
        return '', ''

    parts = [part for part in full_name.split() if part]
    if len(parts) == 1:
        return parts[0], ''
    return parts[0], ' '.join(parts[1:])


def _resolve_student_parent_identity(obj):
    if isinstance(obj, dict):
        return {
            'name': (
                obj.get('parent_name')
                or obj.get('guardian_name')
                or obj.get('father_name')
                or obj.get('mother_name')
                or ''
            ),
            'email': (
                obj.get('parent_email')
                or obj.get('father_email')
                or obj.get('mother_email')
            ),
            'phone': (
                obj.get('parent_phone')
                or obj.get('guardian_contact')
                or obj.get('father_contact')
                or obj.get('mother_contact')
            ),
        }

    parent = getattr(obj, 'parent', None)
    if parent:
        user = getattr(parent, 'user', None)
        first_name, last_name = _extract_parent_name_parts_from_user(user)
        full_name = ' '.join(part for part in [first_name, last_name] if part).strip()
        if not full_name:
            full_name = (
                getattr(parent, 'display_name', None)
                or getattr(parent, 'full_name', None)
                or ''
            )

        parent_email = getattr(user, 'email', None) if user else None
        parent_phone = getattr(parent, 'emergency_contact', None)
        if not parent_phone and user:
            parent_phone = (
                getattr(user, 'phone', None)
                or getattr(user, 'telephone', None)
            )

        if full_name or parent_email or parent_phone:
            return {
                'name': full_name,
                'email': parent_email,
                'phone': parent_phone,
            }

    return {
        'name': getattr(obj, 'guardian_name', None)
        or getattr(obj, 'father_name', None)
        or getattr(obj, 'mother_name', None)
        or '',
        'email': getattr(obj, 'father_email', None) or getattr(obj, 'mother_email', None),
        'phone': getattr(obj, 'guardian_contact', None)
        or getattr(obj, 'father_contact', None)
        or getattr(obj, 'mother_contact', None),
    }


def _resolve_student_class_name(obj):
    if isinstance(obj, dict):
        return (
            obj.get('class_display_name')
            or obj.get('class_name')
            or (
                f"{obj.get('class_name')} {obj.get('section')}".strip()
                if obj.get('class_name') and obj.get('section')
                else None
            )
            or obj.get('grade_level_name')
            or ''
        )

    class_record = getattr(obj, 'class_', None)
    if class_record:
        display_name = getattr(class_record, 'display_name', None)
        if display_name:
            return display_name
        if getattr(class_record, 'name', None):
            return class_record.name
    return getattr(obj, 'grade_level_name', None) or ''


def _resolve_student_profile_picture(obj):
    raw_value = None
    if isinstance(obj, dict):
        raw_value = (
            obj.get('profile_picture')
            or obj.get('profile_picture_url')
            or obj.get('profile_image')
            or obj.get('profileImage')
        )
    else:
        raw_value = getattr(obj, 'profile_picture', None)

    if not raw_value:
        return None

    picture = str(raw_value).strip()
    if not picture:
        return None

    if picture.startswith(('http://', 'https://', '/api/', '/uploads/')):
        return picture

    normalized = picture.replace('\\', '/')
    if normalized.startswith('uploads/profile_pictures/'):
        filename = normalized.split('uploads/profile_pictures/', 1)[1]
        return f'/api/v1/enhanced-students/profile-picture/{filename}'

    return picture

# Add these fields to StudentSchema, StudentCreateSchema, and StudentUpdateSchema
# Example for StudentSchema:

class StudentSchema(Schema):
    """Schema for serializing and deserializing Student objects"""
    id = fields.Integer(dump_only=True)
    user_id = fields.Integer(required=True)
    admission_number = fields.String(validate=validate.Length(min=3, max=20), allow_none=True)
    
    # Personal Details - Updated name structure
    first_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    middle_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    
    # Legacy fields for backward compatibility
    name = fields.String(validate=validate.Length(max=200), allow_none=True, dump_only=True)
    surname = fields.String(validate=validate.Length(max=100), allow_none=True, dump_only=True)
    
    # Computed fields
    full_name = fields.Method("get_full_name", dump_only=True)
    display_name = fields.Method("get_display_name", dump_only=True)
    
    date_of_birth = fields.Date(required=True)
    place_of_birth = fields.String(validate=validate.Length(max=255), allow_none=True)
    gender = fields.String(required=True, validate=validate.OneOf(['male', 'female', 'other']))
    religious_denomination = fields.String(validate=validate.Length(max=100), allow_none=True)
    nationality = fields.String(validate=validate.Length(max=100), allow_none=True)
    blood_group = fields.String(validate=validate.Length(max=10), allow_none=True)
    
    # Contact Details
    email = fields.Email(allow_none=True)  # Add email field
    phone = fields.String(validate=validate.Length(max=20), allow_none=True)  # Add phone field
    telephone = fields.String(validate=validate.Length(max=20), allow_none=True)
    whatsapp = fields.String(validate=validate.Length(max=20), allow_none=True)
    postal_address = fields.String(validate=validate.Length(max=255), allow_none=True)
    digital_address = fields.String(validate=validate.Length(max=100), allow_none=True)
    city = fields.String(validate=validate.Length(max=100), allow_none=True)
    country = fields.String(validate=validate.Length(max=100), allow_none=True)
    residential_address = fields.String(validate=validate.Length(max=255), allow_none=True)
    local_landmark = fields.String(validate=validate.Length(max=255), allow_none=True)
    
    # Health Details
    medical_conditions = fields.String(allow_none=True)
    special_circumstance = fields.String(allow_none=True)
    allergies = fields.String(allow_none=True)
    medication = fields.String(allow_none=True)
    physician_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    physician_phone = fields.String(validate=validate.Length(max=20), allow_none=True)
    
    # Academic Details
    previous_school = fields.String(validate=validate.Length(max=255), allow_none=True)
    previous_class = fields.String(validate=validate.Length(max=50), allow_none=True)
    previous_team = fields.String(validate=validate.Length(max=100), allow_none=True)
    previous_year = fields.String(validate=validate.Length(max=10), allow_none=True)
    
    # Parent Details
    father_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    father_contact = fields.String(validate=validate.Length(max=20), allow_none=True)
    father_address = fields.String(validate=validate.Length(max=255), allow_none=True)
    father_email = fields.Email(allow_none=True, load_default=None)  # Fix validation for empty strings
    father_profession = fields.String(validate=validate.Length(max=100), allow_none=True)
    father_workplace = fields.String(validate=validate.Length(max=255), allow_none=True)
    
    mother_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    mother_contact = fields.String(validate=validate.Length(max=20), allow_none=True)
    mother_address = fields.String(validate=validate.Length(max=255), allow_none=True)
    mother_profession = fields.String(validate=validate.Length(max=100), allow_none=True)
    mother_workplace = fields.String(validate=validate.Length(max=255), allow_none=True)
    mother_email = fields.Email(allow_none=True, load_default=None)  # Fix validation for empty strings
    
    guardian_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    guardian_contact = fields.String(validate=validate.Length(max=20), allow_none=True)
    
    # Legacy fields
    address = fields.String(validate=validate.Length(max=255), allow_none=True)
    profile_picture = fields.Method("get_profile_picture", deserialize="load_profile_picture")
    profile_picture_locked = fields.Boolean(load_default=False)
    class_id = fields.Integer(allow_none=True)
    parent_id = fields.Integer(allow_none=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    class_name = fields.Method("get_class_name", dump_only=True)
    parent_name = fields.Method("get_parent_name", dump_only=True)
    parent_email = fields.Method("get_parent_email", dump_only=True)
    parent_phone = fields.Method("get_parent_phone", dump_only=True)
    
    grade_level_name = fields.String(dump_only=True)
    grade_level = fields.Method("get_grade_level", dump_only=True)
    
    @validates('date_of_birth')
    def validate_date_of_birth(self, value, **kwargs):
        """Validate that date of birth is not in the future"""
        if value and value > datetime.now().date():
            raise ValidationError("Date of birth cannot be in the future")

    @pre_load
    def handle_empty_strings(self, data, **kwargs):
        """Convert empty strings to None for optional fields, but preserve admission_number"""
        empty_to_none_fields = [
            'father_email', 'mother_email', 'email',
            'name', 'phone', 'surname', 'place_of_birth', 'religious_denomination',
            'nationality', 'blood_group', 'middle_name',
            'telephone', 'whatsapp', 'postal_address', 'digital_address',
            'city', 'country', 'residential_address', 'local_landmark',
            'medical_conditions', 'special_circumstance', 'allergies', 'medication', 
            'physician_name', 'physician_phone', 'previous_school', 'previous_class', 
            'previous_team', 'previous_year', 'father_name', 'father_contact', 
            'father_address', 'father_profession', 'father_workplace', 'mother_name', 
            'mother_contact', 'mother_address', 'mother_profession', 'mother_workplace', 
            'guardian_name', 'guardian_contact', 'address'
        ]
        
        for field in empty_to_none_fields:
            if field in data and data[field] == '':
                data[field] = None
        
        # Special handling for admission_number - remove if empty instead of setting to None
        if 'admission_number' in data and data['admission_number'] == '':
            data.pop('admission_number')
        
        return data

    def get_full_name(self, obj):
        if isinstance(obj, dict):
            return obj.get('full_name')
        if hasattr(obj, 'full_name'):
            return obj.full_name
        return None
    
    def get_display_name(self, obj):
        if isinstance(obj, dict):
            return obj.get('display_name')
        if hasattr(obj, 'display_name'):
            return obj.display_name
        return None

    def get_grade_level(self, obj):
        if isinstance(obj, dict):
            gl = obj.get("grade_level")
            if isinstance(gl, dict):
                return gl
            gl_name = obj.get("grade_level_name")
            if gl_name:
                return {
                    "id": "unassigned",
                    "name": gl_name,
                    "code": None
                }
            return None
            
        if obj.grade_level:
            return {
                "id": str(obj.grade_level.id),
                "name": obj.grade_level.name,
                "code": getattr(obj.grade_level, "code", None)
            }
        elif obj.class_ and obj.class_.grade_level:
            return {
                "id": "unassigned",
                "name": obj.class_.grade_level,
                "code": None
            }
        return None

    def get_class_name(self, obj):
        return _resolve_student_class_name(obj)

    def get_parent_name(self, obj):
        return _resolve_student_parent_identity(obj).get('name')

    def get_parent_email(self, obj):
        return _resolve_student_parent_identity(obj).get('email')

    def get_parent_phone(self, obj):
        return _resolve_student_parent_identity(obj).get('phone')

    def get_profile_picture(self, obj):
        return _resolve_student_profile_picture(obj)

    def load_profile_picture(self, value):
        return value

class StudentCreateSchema(Schema):
    """Schema for creating new students"""
    # Personal Details
    admission_number = fields.String(validate=validate.Length(min=3, max=20), allow_none=True)
    first_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    middle_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    
    # Legacy fields for backward compatibility
    name = fields.String(validate=validate.Length(max=200), allow_none=True)
    surname = fields.String(validate=validate.Length(max=100), allow_none=True)
    
    # Add email and phone fields that are missing
    email = fields.Email(allow_none=True)
    phone = fields.String(validate=validate.Length(max=20), allow_none=True)
    place_of_birth = fields.String(validate=validate.Length(max=255), allow_none=True)
    religious_denomination = fields.String(validate=validate.Length(max=100), allow_none=True)
    nationality = fields.String(validate=validate.Length(max=100), allow_none=True)
    blood_group = fields.String(validate=validate.Length(max=10), allow_none=True)
    
    date_of_birth = fields.Date(required=True)
    gender = fields.String(required=True, validate=validate.OneOf(['male', 'female', 'other']))
    
    # Contact Details
    telephone = fields.String(validate=validate.Length(max=20), allow_none=True)
    whatsapp = fields.String(validate=validate.Length(max=20), allow_none=True)
    postal_address = fields.String(validate=validate.Length(max=255), allow_none=True)
    digital_address = fields.String(validate=validate.Length(max=100), allow_none=True)
    city = fields.String(validate=validate.Length(max=100), allow_none=True)
    country = fields.String(validate=validate.Length(max=100), allow_none=True)
    residential_address = fields.String(validate=validate.Length(max=255), allow_none=True)
    local_landmark = fields.String(validate=validate.Length(max=255), allow_none=True)
    
    # Health Details
    medical_conditions = fields.String(allow_none=True)
    special_circumstance = fields.String(allow_none=True)
    allergies = fields.String(allow_none=True)
    medication = fields.String(allow_none=True)
    physician_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    physician_phone = fields.String(validate=validate.Length(max=20), allow_none=True)
    
    # Academic Details
    previous_school = fields.String(validate=validate.Length(max=255), allow_none=True)
    previous_class = fields.String(validate=validate.Length(max=50), allow_none=True)
    previous_team = fields.String(validate=validate.Length(max=100), allow_none=True)
    previous_year = fields.String(validate=validate.Length(max=10), allow_none=True)
    
    # Parent Details
    father_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    father_contact = fields.String(validate=validate.Length(max=20), allow_none=True)
    father_address = fields.String(validate=validate.Length(max=255), allow_none=True)
    father_email = fields.Email(allow_none=True)
    father_profession = fields.String(validate=validate.Length(max=100), allow_none=True)
    father_workplace = fields.String(validate=validate.Length(max=255), allow_none=True)
    
    mother_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    mother_contact = fields.String(validate=validate.Length(max=20), allow_none=True)
    mother_address = fields.String(validate=validate.Length(max=255), allow_none=True)
    mother_profession = fields.String(validate=validate.Length(max=100), allow_none=True)
    mother_workplace = fields.String(validate=validate.Length(max=255), allow_none=True)
    mother_email = fields.Email(allow_none=True)
    
    guardian_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    guardian_contact = fields.String(validate=validate.Length(max=20), allow_none=True)
    
    # Legacy fields
    address = fields.String(validate=validate.Length(max=255), allow_none=True)
    profile_picture = fields.String(validate=validate.Length(max=255), allow_none=True)
    profile_picture_locked = fields.Boolean(load_default=False)
    class_id = fields.Integer(allow_none=True)
    parent_id = fields.Integer(allow_none=True)
    
    @validates('date_of_birth')
    def validate_date_of_birth(self, value, **kwargs):
        """Validate that date of birth is not in the future"""
        if value and value > datetime.now().date():
            raise ValidationError("Date of birth cannot be in the future")

    @pre_load
    def handle_legacy_fields(self, data, **kwargs):
        """Handle legacy name and surname fields by mapping them to first_name and last_name"""
        # If legacy 'name' field is provided but first_name is not, use name as first_name
        if 'name' in data and data['name'] and 'first_name' not in data:
            data['first_name'] = data['name']
        
        # If legacy 'surname' field is provided but last_name is not, use surname as last_name
        if 'surname' in data and data['surname'] and 'last_name' not in data:
            data['last_name'] = data['surname']
        
        # Convert empty strings to None for optional fields
        empty_to_none_fields = [
            'email', 'phone', 'name', 'surname', 'place_of_birth', 'religious_denomination',
            'nationality', 'blood_group', 'middle_name',
            'telephone', 'whatsapp', 'postal_address', 'digital_address',
            'city', 'country', 'residential_address', 'local_landmark',
            'medical_conditions', 'special_circumstance', 'allergies', 'medication', 
            'physician_name', 'physician_phone', 'previous_school', 'previous_class', 
            'previous_team', 'previous_year', 'father_name', 'father_contact', 
            'father_address', 'father_email', 'father_profession', 'father_workplace', 
            'mother_name', 'mother_contact', 'mother_address', 'mother_profession', 
            'mother_workplace', 'mother_email', 'guardian_name', 'guardian_contact', 'address'
        ]
        
        for field in empty_to_none_fields:
            if field in data and data[field] == '':
                data[field] = None
        
        return data

class StudentUpdateSchema(Schema):
    """Schema for updating an existing student"""
    # Personal Details
    first_name = fields.String(validate=validate.Length(min=1, max=100))
    last_name = fields.String(validate=validate.Length(min=1, max=100))
    middle_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    
    # Legacy fields for backward compatibility
    name = fields.String(validate=validate.Length(max=200), allow_none=True)
    surname = fields.String(validate=validate.Length(max=100), allow_none=True)
    
    admission_number = fields.String(validate=validate.Length(min=3, max=20), allow_none=True)
    date_of_birth = fields.Date()
    place_of_birth = fields.String(validate=validate.Length(max=255), allow_none=True)
    gender = fields.String(validate=validate.OneOf(['male', 'female', 'other']))
    religious_denomination = fields.String(validate=validate.Length(max=100), allow_none=True)
    nationality = fields.String(validate=validate.Length(max=100), allow_none=True)
    blood_group = fields.String(validate=validate.Length(max=10), allow_none=True)
    
    # Contact Details
    email = fields.Email(allow_none=True)
    phone = fields.String(validate=validate.Length(max=20), allow_none=True)
    telephone = fields.String(validate=validate.Length(max=20), allow_none=True)
    whatsapp = fields.String(validate=validate.Length(max=20), allow_none=True)
    postal_address = fields.String(validate=validate.Length(max=255), allow_none=True)
    digital_address = fields.String(validate=validate.Length(max=100), allow_none=True)
    city = fields.String(validate=validate.Length(max=100), allow_none=True)
    country = fields.String(validate=validate.Length(max=100), allow_none=True)
    residential_address = fields.String(validate=validate.Length(max=255), allow_none=True)
    local_landmark = fields.String(validate=validate.Length(max=255), allow_none=True)
    
    # Health Details
    medical_conditions = fields.String(allow_none=True)
    special_circumstance = fields.String(allow_none=True)
    allergies = fields.String(allow_none=True)
    medication = fields.String(allow_none=True)
    physician_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    physician_phone = fields.String(validate=validate.Length(max=20), allow_none=True)
    
    # Academic Details
    previous_school = fields.String(validate=validate.Length(max=255), allow_none=True)
    previous_class = fields.String(validate=validate.Length(max=50), allow_none=True)
    previous_team = fields.String(validate=validate.Length(max=100), allow_none=True)
    previous_year = fields.String(validate=validate.Length(max=10), allow_none=True)
    
    # Parent Details
    father_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    father_contact = fields.String(validate=validate.Length(max=20), allow_none=True)
    father_address = fields.String(validate=validate.Length(max=255), allow_none=True)
    father_email = fields.Email(allow_none=True)
    father_profession = fields.String(validate=validate.Length(max=100), allow_none=True)
    father_workplace = fields.String(validate=validate.Length(max=255), allow_none=True)
    
    mother_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    mother_contact = fields.String(validate=validate.Length(max=20), allow_none=True)
    mother_address = fields.String(validate=validate.Length(max=255), allow_none=True)
    mother_profession = fields.String(validate=validate.Length(max=100), allow_none=True)
    mother_workplace = fields.String(validate=validate.Length(max=255), allow_none=True)
    mother_email = fields.Email(allow_none=True)
    
    guardian_name = fields.String(validate=validate.Length(max=100), allow_none=True)
    guardian_contact = fields.String(validate=validate.Length(max=20), allow_none=True)
    
    # Legacy fields
    address = fields.String(validate=validate.Length(max=255), allow_none=True)
    profile_picture = fields.String(validate=validate.Length(max=255), allow_none=True)
    profile_picture_locked = fields.Boolean(allow_none=True)
    class_id = fields.Integer(allow_none=True)
    parent_id = fields.Integer(allow_none=True)
    
    @validates('date_of_birth')
    def validate_date_of_birth(self, value, **kwargs):
        """Validate that date of birth is not in the future"""
        if value and value > datetime.now().date():
            raise ValidationError("Date of birth cannot be in the future")
            
    @pre_load
    def handle_empty_strings(self, data, **kwargs):
        """Convert empty strings to None for optional fields"""
        empty_to_none_fields = [
            'father_email', 'mother_email', 'email',
            'name', 'phone', 'surname', 'place_of_birth', 'religious_denomination',
            'nationality', 'blood_group', 'middle_name',
            'telephone', 'whatsapp', 'postal_address', 'digital_address',
            'city', 'country', 'residential_address', 'local_landmark',
            'medical_conditions', 'special_circumstance', 'allergies', 'medication', 
            'physician_name', 'physician_phone', 'previous_school', 'previous_class', 
            'previous_team', 'previous_year', 'father_name', 'father_contact', 
            'father_address', 'father_profession', 'father_workplace', 'mother_name', 
            'mother_contact', 'mother_address', 'mother_profession', 'mother_workplace', 
            'guardian_name', 'guardian_contact', 'address'
        ]
        
        for field in empty_to_none_fields:
            if field in data and data[field] == '':
                data[field] = None
        
        # Special handling for admission_number - remove if empty instead of setting to None
        if 'admission_number' in data and data['admission_number'] == '':
            data.pop('admission_number')
        
        return data

class StudentListSchema(Schema):
    """Schema for listing students with minimal information"""
    id = fields.Integer(dump_only=True)
    admission_number = fields.String()
    user_id = fields.Integer()
    gender = fields.String()
    class_id = fields.Integer(allow_none=True)
    
    # Add name fields
    first_name = fields.String()
    last_name = fields.String()
    middle_name = fields.String(allow_none=True)
    display_name = fields.Method('get_display_name')
    full_name = fields.Method('get_full_name')
    
    # Add other essential fields for the student list
    email = fields.Email(allow_none=True)
    phone = fields.String(allow_none=True)
    status = fields.String()
    profile_picture = fields.Method("get_profile_picture", dump_only=True)
    profile_picture_locked = fields.Boolean()
    class_name = fields.Method("get_class_name", dump_only=True)
    parent_name = fields.Method("get_parent_name", dump_only=True)
    parent_email = fields.Method("get_parent_email", dump_only=True)
    parent_phone = fields.Method("get_parent_phone", dump_only=True)
    
    grade_level_name = fields.String(dump_only=True)
    grade_level = fields.Method("get_grade_level", dump_only=True)
    
    # Add computed metrics
    attendance_percentage = fields.Method('get_attendance_percentage')
    performance_average = fields.Method('get_performance_average')
    
    def get_full_name(self, obj):
        """Get the full name of the student"""
        return obj.full_name
    
    def get_display_name(self, obj):
        """Get the display name of the student"""
        return obj.display_name

    def get_profile_picture(self, obj):
        return _resolve_student_profile_picture(obj)

    def get_grade_level(self, obj):
        if isinstance(obj, dict):
            gl = obj.get("grade_level")
            if isinstance(gl, dict):
                return gl
            gl_name = obj.get("grade_level_name")
            if gl_name:
                return {
                    "id": "unassigned",
                    "name": gl_name,
                    "code": None
                }
            return None
            
        if obj.grade_level:
            return {
                "id": str(obj.grade_level.id),
                "name": obj.grade_level.name,
                "code": getattr(obj.grade_level, "code", None)
            }
        elif obj.class_ and obj.class_.grade_level:
            return {
                "id": "unassigned",
                "name": obj.class_.grade_level,
                "code": None
            }
        return None
    
    def get_attendance_percentage(self, obj):
        """Calculate attendance percentage from attendance records"""
        from sqlalchemy import func
        from ..models.attendance import Attendance
        
        if not obj.attendances:
            return 0
        
        total_days = len(obj.attendances)
        if total_days == 0:
            return 0
        
        present_days = len([a for a in obj.attendances if a.status in ['present', 'late']])
        return round((present_days / total_days) * 100, 1)
    
    def get_performance_average(self, obj):
        """Calculate average performance from grades"""
        if not obj.grades:
            return 0
        
        if len(obj.grades) == 0:
            return 0
        
        total_percentage = sum(grade.percentage for grade in obj.grades)
        return round(total_percentage / len(obj.grades), 1)

    def get_class_name(self, obj):
        return _resolve_student_class_name(obj)

    def get_parent_name(self, obj):
        return _resolve_student_parent_identity(obj).get('name')

    def get_parent_email(self, obj):
        return _resolve_student_parent_identity(obj).get('email')

    def get_parent_phone(self, obj):
        return _resolve_student_parent_identity(obj).get('phone')
