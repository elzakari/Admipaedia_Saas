from flask import request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1.classes import classes_bp
from app.services.class_service import ClassService
from app.schemas.class_ import ClassSchema, ClassListSchema, ClassCreateSchema, ClassUpdateSchema
from app.utils.auth_utils import admin_required, teacher_required
from app.utils.rbac_decorators import require_permission, require_role
from app.utils.tenant_context import tenant_required
from marshmallow import ValidationError

# Initialize schemas
class_schema = ClassSchema()
class_create_schema = ClassCreateSchema()
class_update_schema = ClassUpdateSchema()
classes_schema = ClassListSchema(many=True)

@classes_bp.route('', methods=['GET'])  # Remove the trailing slash
@jwt_required()
@require_role(['admin', 'teacher', 'parent', 'student'])
@tenant_required
def get_classes():
    """Get all classes with pagination and filtering."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    grade_level = request.args.get('grade_level', type=str)
    academic_year = request.args.get('academic_year', type=str)
    
    paginated_classes = ClassService.get_all_classes(page, per_page, grade_level, academic_year, tenant_id=getattr(g, 'tenant_id', None))
    
    return jsonify({
        'success': True,
        'classes': classes_schema.dump(paginated_classes.items),
        'pagination': {
            'total': paginated_classes.total,
            'pages': paginated_classes.pages,
            'page': paginated_classes.page,
            'per_page': paginated_classes.per_page,
            'next': paginated_classes.next_num,
            'prev': paginated_classes.prev_num
        }
    }), 200

@classes_bp.route('/<int:class_id>', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher', 'parent', 'student'])
@tenant_required
def get_class(class_id):
    """Get a specific class by ID."""
    class_obj = ClassService.get_class_by_id(class_id, tenant_id=getattr(g, 'tenant_id', None))
    
    if not class_obj:
        return jsonify({'success': False, 'message': 'Class not found'}), 404
    
    return jsonify({
        'success': True,
        'class': class_schema.dump(class_obj)
    }), 200

@classes_bp.route('', methods=['POST'])  # Remove the trailing slash
@jwt_required()
@admin_required
@tenant_required
def create_class():
    """Create a new class."""
    try:
        data = class_create_schema.load(request.json)
        
        class_obj, error = ClassService.create_class(data, tenant_id=getattr(g, 'tenant_id', None))
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Class created successfully',
            'class': class_schema.dump(class_obj)
        }), 201
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@classes_bp.route('/<int:class_id>', methods=['PUT'])
@jwt_required()
@admin_required
@tenant_required
def update_class(class_id):
    """Update an existing class."""
    try:
        data = class_update_schema.load(request.json, partial=True)
        
        class_obj, error = ClassService.update_class(class_id, data, tenant_id=getattr(g, 'tenant_id', None))
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Class updated successfully',
            'class': class_schema.dump(class_obj)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@classes_bp.route('/<int:class_id>', methods=['DELETE'])
@jwt_required()
@admin_required
@tenant_required
def delete_class(class_id):
    """Delete a class."""
    # Check for force parameter
    force = request.args.get('force', 'false').lower() == 'true'
    
    existing = ClassService.get_class_by_id(class_id, tenant_id=getattr(g, 'tenant_id', None))
    if not existing:
        return jsonify({'success': False, 'message': 'Class not found'}), 404

    success, error = ClassService.delete_class(class_id, force=force)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
    
    return jsonify({
        'success': True,
        'message': 'Class deleted successfully'
    }), 200

@classes_bp.route('/<int:class_id>/assign-teacher', methods=['PUT'])
@jwt_required()
@admin_required
@require_permission('class.manage_students')
@tenant_required
def assign_teacher(class_id):
    """Assign a teacher to a class."""
    try:
        teacher_id = request.json.get('teacher_id')
        if teacher_id is None:
            return jsonify({'success': False, 'message': 'Teacher ID is required'}), 400
        
        class_obj = ClassService.get_class_by_id(class_id, tenant_id=getattr(g, 'tenant_id', None))
        if not class_obj:
            return jsonify({'success': False, 'message': 'Class not found'}), 404

        from app.models.teacher import Teacher
        teacher = Teacher.query.get(teacher_id)
        if not teacher or getattr(teacher, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return jsonify({'success': False, 'message': 'Teacher not found'}), 404

        class_obj, error = ClassService.assign_teacher(class_id, teacher_id)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Teacher assigned to class successfully',
            'class': class_schema.dump(class_obj)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@classes_bp.route('/teacher/<int:teacher_id>', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
@tenant_required
def get_classes_by_teacher(teacher_id):
    # Scope query dynamically by matching the active authenticated teacher's identifier if they are a teacher
    from app.utils.rbac_decorators import get_current_user
    user = get_current_user()
    if user and getattr(user, 'role', '').lower() == 'teacher':
        teacher_record = TeacherService.get_teacher_by_user_id(user.id)
        if teacher_record:
            teacher_id = teacher_record.id

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    from app.models.teacher import Teacher
    teacher = Teacher.query.get(teacher_id)
    if not teacher or getattr(teacher, 'tenant_id', None) != getattr(g, 'tenant_id', None):
        return jsonify({'success': False, 'message': 'Teacher not found'}), 404

    paginated_classes = ClassService.get_classes_by_teacher_id(teacher_id, page, per_page, tenant_id=getattr(g, 'tenant_id', None))
    
    return jsonify({
        'success': True,
        'classes': classes_schema.dump(paginated_classes.items),
        'pagination': {
            'total': paginated_classes.total,
            'pages': paginated_classes.pages,
            'page': paginated_classes.page,
            'per_page': paginated_classes.per_page,
            'next': paginated_classes.next_num,
            'prev': paginated_classes.prev_num
        }
    }), 200

# Add these imports at the top of the file
from app.schemas.lesson import LessonSchema, LessonCreateSchema, LessonUpdateSchema, LessonListSchema
from app.schemas.announcement import AnnouncementSchema, AnnouncementCreateSchema, AnnouncementUpdateSchema, AnnouncementListSchema
from app.schemas.resource import ResourceSchema, ResourceCreateSchema, ResourceUpdateSchema, ResourceListSchema
from app.schemas.subject import SubjectListSchema
from app.services.lesson_service import LessonService
from app.services.announcement_service import AnnouncementService
from app.services.resource_service import ResourceService
from app.services.subject_service import SubjectService

# Initialize schemas
lesson_schema = LessonSchema()
lessons_schema = LessonListSchema(many=True)
lesson_create_schema = LessonCreateSchema()
lesson_update_schema = LessonUpdateSchema()

announcement_schema = AnnouncementSchema()
announcements_schema = AnnouncementListSchema(many=True)
announcement_create_schema = AnnouncementCreateSchema()
announcement_update_schema = AnnouncementUpdateSchema()

resource_schema = ResourceSchema()
resources_schema = ResourceListSchema(many=True)
resource_create_schema = ResourceCreateSchema()
resource_update_schema = ResourceUpdateSchema()

subjects_schema = SubjectListSchema(many=True)

# Add these routes at the end of the file

# Lesson routes
@classes_bp.route('/<int:class_id>/lessons', methods=['GET'])
@jwt_required()
@require_permission('lesson.read')
def get_class_lessons(class_id):
    """Get lessons for a specific class."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    paginated_lessons = LessonService.get_lessons_by_class(class_id, page, per_page)
    
    if paginated_lessons is None:
        return jsonify({'success': False, 'message': 'Class not found'}), 404
    
    return jsonify({
        'success': True,
        'lessons': lessons_schema.dump(paginated_lessons.items),
        'pagination': {
            'total': paginated_lessons.total,
            'pages': paginated_lessons.pages,
            'page': paginated_lessons.page,
            'per_page': paginated_lessons.per_page,
            'next': paginated_lessons.next_num,
            'prev': paginated_lessons.prev_num
        }
    }), 200

@classes_bp.route('/<int:class_id>/lessons', methods=['POST'])
@jwt_required()
@teacher_required
def create_class_lesson(class_id):
    """Create a new lesson for a class."""
    try:
        data = lesson_create_schema.load(request.json)
        data['class_id'] = class_id
        data['teacher_id'] = get_jwt_identity()
        
        lesson, error = LessonService.create_lesson(data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Lesson created successfully',
            'lesson': lesson_schema.dump(lesson)
        }), 201
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@classes_bp.route('/<int:class_id>/lessons/<int:lesson_id>', methods=['PUT'])
@jwt_required()
@teacher_required
def update_class_lesson(class_id, lesson_id):
    """Update a lesson for a class."""
    try:
        data = lesson_update_schema.load(request.json, partial=True)
        
        lesson, error = LessonService.update_lesson(lesson_id, data, class_id, get_jwt_identity())
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Lesson updated successfully',
            'lesson': lesson_schema.dump(lesson)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@classes_bp.route('/<int:class_id>/lessons/<int:lesson_id>', methods=['DELETE'])
@jwt_required()
@teacher_required
def delete_class_lesson(class_id, lesson_id):
    """Delete a lesson from a class."""
    success, error = LessonService.delete_lesson(lesson_id, class_id, get_jwt_identity())
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
    
    return jsonify({
        'success': True,
        'message': 'Lesson deleted successfully'
    }), 200

# Announcement routes
@classes_bp.route('/<int:class_id>/announcements', methods=['GET'])
@jwt_required()
@require_permission('announcement.read')
def get_class_announcements(class_id):
    """Get announcements for a specific class."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    paginated_announcements = AnnouncementService.get_announcements_by_class(class_id, page, per_page)
    
    if paginated_announcements is None:
        return jsonify({'success': False, 'message': 'Class not found'}), 404
    
    return jsonify({
        'success': True,
        'announcements': announcements_schema.dump(paginated_announcements.items),
        'pagination': {
            'total': paginated_announcements.total,
            'pages': paginated_announcements.pages,
            'page': paginated_announcements.page,
            'per_page': paginated_announcements.per_page,
            'next': paginated_announcements.next_num,
            'prev': paginated_announcements.prev_num
        }
    }), 200

@classes_bp.route('/<int:class_id>/announcements', methods=['POST'])
@jwt_required()
@teacher_required
def create_class_announcement(class_id):
    """Create a new announcement for a class."""
    try:
        user_id = int(get_jwt_identity())
        from app.models.user import User
        from app.models.teacher import Teacher
        from app.models.class_ import ClassTeacherMapping, Class as ClassModel

        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        if user.role == 'teacher':
            is_assigned = ClassTeacherMapping.query.filter_by(class_id=class_id, teacher_id=user_id).first() is not None
            if not is_assigned:
                return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403

        teacher = Teacher.query.filter_by(user_id=user_id).first()
        teacher_id = None
        if teacher:
            teacher_id = teacher.id
        elif user.role == 'teacher':
            return jsonify({'success': False, 'message': 'Teacher profile not found'}), 400
        else:
            class_obj = ClassModel.query.get(class_id)
            if class_obj:
                teacher_id = class_obj.teacher_id

        payload = dict(request.json or {})
        payload['class_id'] = class_id
        data = announcement_create_schema.load(payload)
        data['teacher_id'] = teacher_id
        
        announcement, error = AnnouncementService.create_announcement(data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Announcement created successfully',
            'announcement': announcement_schema.dump(announcement)
        }), 201
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@classes_bp.route('/<int:class_id>/announcements/<int:announcement_id>', methods=['PUT'])
@jwt_required()
@teacher_required
def update_class_announcement(class_id, announcement_id):
    """Update an announcement for a class."""
    try:
        user_id = int(get_jwt_identity())
        from app.models.user import User
        from app.models.teacher import Teacher
        from app.models.class_ import ClassTeacherMapping, Class as ClassModel

        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        if user.role == 'teacher':
            is_assigned = ClassTeacherMapping.query.filter_by(class_id=class_id, teacher_id=user_id).first() is not None
            if not is_assigned:
                return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403

        teacher = Teacher.query.filter_by(user_id=user_id).first()
        teacher_id = None
        if teacher:
            teacher_id = teacher.id
        elif user.role == 'teacher':
            return jsonify({'success': False, 'message': 'Teacher profile not found'}), 400
        else:
            announcement_obj = AnnouncementService.get_announcement_by_id(announcement_id)
            if announcement_obj:
                teacher_id = announcement_obj.teacher_id
            else:
                class_obj = ClassModel.query.get(class_id)
                if class_obj:
                    teacher_id = class_obj.teacher_id

        data = announcement_update_schema.load(request.json, partial=True)
        
        announcement, error = AnnouncementService.update_announcement(announcement_id, data, class_id, teacher_id)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Announcement updated successfully',
            'announcement': announcement_schema.dump(announcement)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@classes_bp.route('/<int:class_id>/announcements/<int:announcement_id>', methods=['DELETE'])
@jwt_required()
@teacher_required
def delete_class_announcement(class_id, announcement_id):
    """Delete an announcement from a class."""
    user_id = int(get_jwt_identity())
    from app.models.user import User
    from app.models.teacher import Teacher
    from app.models.class_ import ClassTeacherMapping, Class as ClassModel

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if user.role == 'teacher':
        is_assigned = ClassTeacherMapping.query.filter_by(class_id=class_id, teacher_id=user_id).first() is not None
        if not is_assigned:
            return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403

    teacher = Teacher.query.filter_by(user_id=user_id).first()
    teacher_id = None
    if teacher:
        teacher_id = teacher.id
    elif user.role == 'teacher':
        return jsonify({'success': False, 'message': 'Teacher profile not found'}), 400
    else:
        announcement_obj = AnnouncementService.get_announcement_by_id(announcement_id)
        if announcement_obj:
            teacher_id = announcement_obj.teacher_id
        else:
            class_obj = ClassModel.query.get(class_id)
            if class_obj:
                teacher_id = class_obj.teacher_id

    success, error = AnnouncementService.delete_announcement(announcement_id, class_id, teacher_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
    
    return jsonify({
        'success': True,
        'message': 'Announcement deleted successfully'
    }), 200

# Resource routes
@classes_bp.route('/<int:class_id>/resources', methods=['GET'])
@jwt_required()
@require_permission('resource.read')
def get_class_resources(class_id):
    """Get resources for a specific class."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    paginated_resources = ResourceService.get_resources_by_class(class_id, page, per_page)
    
    if paginated_resources is None:
        return jsonify({'success': False, 'message': 'Class not found'}), 404
    
    return jsonify({
        'success': True,
        'resources': resources_schema.dump(paginated_resources.items),
        'pagination': {
            'total': paginated_resources.total,
            'pages': paginated_resources.pages,
            'page': paginated_resources.page,
            'per_page': paginated_resources.per_page,
            'next': paginated_resources.next_num,
            'prev': paginated_resources.prev_num
        }
    }), 200

# Update the POST route for creating resources
@classes_bp.route('/<int:class_id>/resources', methods=['POST'])
@jwt_required()
@teacher_required
def create_class_resource(class_id):
    """Create a new resource for a class with optional file upload."""
    try:
        # Check if there's a file in the request
        file = request.files.get('file')
        
        # Get JSON data or form data
        if request.is_json:
            data = resource_create_schema.load(request.json)
        else:
            data = resource_create_schema.load(request.form)
        
        data['class_id'] = class_id
        data['teacher_id'] = get_jwt_identity()
        
        resource, error = ResourceService.create_resource(data, file)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Resource created successfully',
            'resource': resource_schema.dump(resource)
        }), 201
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

# Update the PUT route for updating resources
@classes_bp.route('/<int:class_id>/resources/<int:resource_id>', methods=['PUT'])
@jwt_required()
@teacher_required
def update_class_resource(class_id, resource_id):
    """Update a resource for a class with optional file replacement."""
    try:
        # Check if there's a file in the request
        file = request.files.get('file')
        
        # Get JSON data or form data
        if request.is_json:
            data = resource_update_schema.load(request.json, partial=True)
        else:
            data = resource_update_schema.load(request.form, partial=True)
        
        resource, error = ResourceService.update_resource(resource_id, data, class_id, get_jwt_identity(), file)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Resource updated successfully',
            'resource': resource_schema.dump(resource)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@classes_bp.route('/<int:class_id>/resources/<int:resource_id>', methods=['DELETE'])
@jwt_required()
@teacher_required
def delete_class_resource(class_id, resource_id):
    """Delete a resource from a class."""
    success, error = ResourceService.delete_resource(resource_id, class_id, get_jwt_identity())
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
    
    return jsonify({
        'success': True,
        'message': 'Resource deleted successfully'
    }), 200

# Subject routes
@classes_bp.route('/<int:class_id>/subjects', methods=['GET'])
@jwt_required()
@require_permission('class.read')
def get_class_subjects(class_id):
    """Get subjects for a specific class."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    paginated_subjects = SubjectService.get_subjects_by_class(class_id, page, per_page)
    
    if paginated_subjects is None:
        # Check if class exists
        if not ClassService.get_class_by_id(class_id):
            return jsonify({'success': False, 'message': 'Class not found'}), 404
        return jsonify({'success': False, 'message': 'Failed to fetch subjects'}), 500
        
    subjects_list = paginated_subjects.items
    total = paginated_subjects.total
    pages = paginated_subjects.pages
    
    # Fallback to returning all active subjects if class mapping is empty
    if not subjects_list:
        from app.models.subject import Subject
        query = Subject.query.filter_by(is_active=True)
        if getattr(g, 'tenant_id', None) is not None:
            query = query.filter(Subject.tenant_id == g.tenant_id)
        subjects_list = query.order_by(Subject.name).all()
        total = len(subjects_list)
        pages = 1
        
    return jsonify({
        'success': True,
        'subjects': subjects_schema.dump(subjects_list),
        'pagination': {
            'total': total,
            'pages': pages,
            'page': 1 if not paginated_subjects.items else paginated_subjects.page,
            'per_page': per_page,
            'next': None if not paginated_subjects.items else paginated_subjects.next_num,
            'prev': None if not paginated_subjects.items else paginated_subjects.prev_num
        }
    }), 200
