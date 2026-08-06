from datetime import datetime

from flask import current_app, g, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.api.v1.classes import classes_bp
from app.schemas.class_ import (ClassCreateSchema, ClassListSchema,
                                ClassSchema, ClassUpdateSchema)
from app.services.class_service import ClassService
from app.services.teacher_service import TeacherService
from app.utils.auth_utils import admin_required, teacher_required
from app.utils.rbac_decorators import require_permission, require_role
from app.utils.tenant_context import tenant_required

# Initialize schemas
class_schema = ClassSchema()
class_create_schema = ClassCreateSchema()
class_update_schema = ClassUpdateSchema()
classes_schema = ClassListSchema(many=True)


@classes_bp.route("", methods=["GET"])  # Remove the trailing slash
@jwt_required()
@require_role(
    [
        "admin",
        "school_admin",
        "teacher",
        "parent",
        "student",
        "super_admin",
        "super_manager",
    ]
)
@tenant_required
def get_classes():
    """Get all classes with pagination and filtering."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    grade_level = request.args.get("grade_level", type=str)
    academic_year = request.args.get("academic_year", type=str)

    paginated_classes = ClassService.get_all_classes(
        page,
        per_page,
        grade_level,
        academic_year,
        tenant_id=getattr(g, "tenant_id", None),
    )

    return (
        jsonify(
            {
                "success": True,
                "classes": classes_schema.dump(paginated_classes.items),
                "pagination": {
                    "total": paginated_classes.total,
                    "pages": paginated_classes.pages,
                    "page": paginated_classes.page,
                    "per_page": paginated_classes.per_page,
                    "next": paginated_classes.next_num,
                    "prev": paginated_classes.prev_num,
                },
            }
        ),
        200,
    )


@classes_bp.route("/<int:class_id>", methods=["GET"])
@jwt_required()
@require_role(
    [
        "admin",
        "school_admin",
        "teacher",
        "parent",
        "student",
        "super_admin",
        "super_manager",
    ]
)
@tenant_required
def get_class(class_id):
    """Get a specific class by ID."""
    class_obj = ClassService.get_class_by_id(
        class_id, tenant_id=getattr(g, "tenant_id", None)
    )

    if not class_obj:
        return jsonify({"success": False, "message": "Class not found"}), 404

    return jsonify({"success": True, "class": class_schema.dump(class_obj)}), 200


@classes_bp.route("", methods=["POST"])  # Remove the trailing slash
@jwt_required()
@admin_required
@tenant_required
def create_class():
    """Create a new class."""
    try:
        data = class_create_schema.load(request.json)

        class_obj, error = ClassService.create_class(
            data, tenant_id=getattr(g, "tenant_id", None)
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Class created successfully",
                    "class": class_schema.dump(class_obj),
                }
            ),
            201,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@classes_bp.route("/<int:class_id>", methods=["PUT"])
@jwt_required()
@admin_required
@tenant_required
def update_class(class_id):
    """Update an existing class."""
    try:
        data = class_update_schema.load(request.json, partial=True)

        class_obj, error = ClassService.update_class(
            class_id, data, tenant_id=getattr(g, "tenant_id", None)
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Class updated successfully",
                    "class": class_schema.dump(class_obj),
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@classes_bp.route("/<int:class_id>", methods=["DELETE"])
@jwt_required()
@admin_required
@tenant_required
def delete_class(class_id):
    """Delete a class."""
    # Check for force parameter
    force = request.args.get("force", "false").lower() == "true"

    existing = ClassService.get_class_by_id(
        class_id, tenant_id=getattr(g, "tenant_id", None)
    )
    if not existing:
        return jsonify({"success": False, "message": "Class not found"}), 404

    success, error = ClassService.delete_class(class_id, force=force)

    if error:
        return jsonify({"success": False, "message": error}), 400

    return jsonify({"success": True, "message": "Class deleted successfully"}), 200


@classes_bp.route("/<int:class_id>/assign-teacher", methods=["PUT"])
@jwt_required()
@admin_required
@require_permission("class.manage_students")
@tenant_required
def assign_teacher(class_id):
    """Assign a teacher to a class."""
    try:
        teacher_id = request.json.get("teacher_id")
        if teacher_id is None:
            return jsonify({"success": False, "message": "Teacher ID is required"}), 400

        class_obj = ClassService.get_class_by_id(
            class_id, tenant_id=getattr(g, "tenant_id", None)
        )
        if not class_obj:
            return jsonify({"success": False, "message": "Class not found"}), 404

        from app.models.teacher import Teacher

        teacher = Teacher.query.get(teacher_id)
        if not teacher or getattr(teacher, "tenant_id", None) != getattr(
            g, "tenant_id", None
        ):
            return jsonify({"success": False, "message": "Teacher not found"}), 404

        class_obj, error = ClassService.assign_teacher(class_id, teacher_id)

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Teacher assigned to class successfully",
                    "class": class_schema.dump(class_obj),
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@classes_bp.route("/teacher/<int:teacher_id>", methods=["GET"])
@jwt_required()
@require_role(["admin", "teacher"])
@tenant_required
def get_classes_by_teacher(teacher_id):
    # Scope query dynamically by matching the active authenticated teacher's identifier if they are a teacher
    from app.utils.rbac_decorators import get_current_user

    user = get_current_user()
    if user and getattr(user, "role", "").lower() == "teacher":
        teacher_record = TeacherService.get_teacher_by_user_id(user.id)
        if teacher_record:
            teacher_id = teacher_record.id

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    from app.models.teacher import Teacher

    teacher = Teacher.query.get(teacher_id)
    if not teacher or getattr(teacher, "tenant_id", None) != getattr(
        g, "tenant_id", None
    ):
        return jsonify({"success": False, "message": "Teacher not found"}), 404

    paginated_classes = ClassService.get_classes_by_teacher_id(
        teacher_id, page, per_page, tenant_id=getattr(g, "tenant_id", None)
    )

    return (
        jsonify(
            {
                "success": True,
                "classes": classes_schema.dump(paginated_classes.items),
                "pagination": {
                    "total": paginated_classes.total,
                    "pages": paginated_classes.pages,
                    "page": paginated_classes.page,
                    "per_page": paginated_classes.per_page,
                    "next": paginated_classes.next_num,
                    "prev": paginated_classes.prev_num,
                },
            }
        ),
        200,
    )


from app.schemas.announcement import (AnnouncementCreateSchema,
                                      AnnouncementListSchema,
                                      AnnouncementSchema,
                                      AnnouncementUpdateSchema)
# Add these imports at the top of the file
from app.schemas.lesson import (LessonCreateSchema, LessonListSchema,
                                LessonSchema, LessonUpdateSchema)
from app.schemas.resource import (ResourceCreateSchema, ResourceListSchema,
                                  ResourceSchema, ResourceUpdateSchema)
from app.schemas.subject import SubjectListSchema
from app.services.announcement_service import AnnouncementService
from app.services.lesson_service import LessonService
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
@classes_bp.route("/lesson-monitoring", methods=["GET"])
@jwt_required()
@require_role(["admin", "school_admin", "super_admin", "super_manager"])
@tenant_required
def get_lesson_monitoring():
    """Get tenant-wide daily lesson monitoring for administrators."""

    def parse_date(value):
        if not value:
            return None
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError:
            raise ValidationError({"date": ["Invalid date format. Use YYYY-MM-DD."]})

    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 50, type=int)
        class_id = request.args.get("class_id", type=int)
        teacher_id = request.args.get("teacher_id", type=int)
        status = request.args.get("status", type=str)
        date_from = parse_date(request.args.get("date_from"))
        date_to = parse_date(request.args.get("date_to"))

        paginated_lessons, summary = LessonService.get_lesson_monitoring(
            page=page,
            per_page=per_page,
            tenant_id=getattr(g, "tenant_id", None),
            class_id=class_id,
            teacher_id=teacher_id,
            status=status,
            date_from=date_from,
            date_to=date_to,
        )

        return (
            jsonify(
                {
                    "success": True,
                    "lessons": [
                        LessonService.serialize_lesson(lesson)
                        for lesson in paginated_lessons.items
                    ],
                    "summary": summary,
                    "pagination": {
                        "total": paginated_lessons.total,
                        "pages": paginated_lessons.pages,
                        "page": paginated_lessons.page,
                        "per_page": paginated_lessons.per_page,
                        "next": paginated_lessons.next_num,
                        "prev": paginated_lessons.prev_num,
                    },
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@classes_bp.route("/<int:class_id>/lessons", methods=["GET"])
@jwt_required()
@require_permission("lesson.read")
def get_class_lessons(class_id):
    """Get lessons for a specific class."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    paginated_lessons = LessonService.get_lessons_by_class(class_id, page, per_page)

    if paginated_lessons is None:
        return jsonify({"success": False, "message": "Class not found"}), 404

    return (
        jsonify(
            {
                "success": True,
                "lessons": [
                    LessonService.serialize_lesson(lesson)
                    for lesson in paginated_lessons.items
                ],
                "pagination": {
                    "total": paginated_lessons.total,
                    "pages": paginated_lessons.pages,
                    "page": paginated_lessons.page,
                    "per_page": paginated_lessons.per_page,
                    "next": paginated_lessons.next_num,
                    "prev": paginated_lessons.prev_num,
                },
            }
        ),
        200,
    )


@classes_bp.route("/<int:class_id>/lessons", methods=["POST"])
@jwt_required()
@teacher_required
def create_class_lesson(class_id):
    """Create a new lesson for a class."""
    try:
        data = lesson_create_schema.load(request.json)
        data["class_id"] = class_id
        teacher_profile_id = LessonService.resolve_teacher_profile_id(
            get_jwt_identity()
        )
        if teacher_profile_id is None:
            return (
                jsonify({"success": False, "message": "Teacher profile not found"}),
                404,
            )
        data["teacher_id"] = teacher_profile_id

        lesson, error = LessonService.create_lesson(data)

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Lesson created successfully",
                    "lesson": LessonService.serialize_lesson(lesson),
                }
            ),
            201,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@classes_bp.route("/<int:class_id>/lessons/<int:lesson_id>", methods=["PUT"])
@jwt_required()
@teacher_required
def update_class_lesson(class_id, lesson_id):
    """Update a lesson for a class."""
    try:
        data = lesson_update_schema.load(request.json, partial=True)
        teacher_profile_id = LessonService.resolve_teacher_profile_id(
            get_jwt_identity()
        )
        if teacher_profile_id is None:
            return (
                jsonify({"success": False, "message": "Teacher profile not found"}),
                404,
            )

        lesson, error = LessonService.update_lesson(
            lesson_id, data, class_id, teacher_profile_id
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Lesson updated successfully",
                    "lesson": LessonService.serialize_lesson(lesson),
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@classes_bp.route("/<int:class_id>/lessons/<int:lesson_id>", methods=["DELETE"])
@jwt_required()
@teacher_required
def delete_class_lesson(class_id, lesson_id):
    """Delete a lesson from a class."""
    teacher_profile_id = LessonService.resolve_teacher_profile_id(get_jwt_identity())
    if teacher_profile_id is None:
        return jsonify({"success": False, "message": "Teacher profile not found"}), 404

    success, error = LessonService.delete_lesson(
        lesson_id, class_id, teacher_profile_id
    )

    if error:
        return jsonify({"success": False, "message": error}), 400

    return jsonify({"success": True, "message": "Lesson deleted successfully"}), 200


# Announcement routes
@classes_bp.route("/<int:class_id>/announcements", methods=["GET"])
@jwt_required()
def get_class_announcements(class_id):
    """Get announcements for a specific class."""
    user_id = int(get_jwt_identity())
    from app.models.class_ import Class as ClassModel
    from app.models.class_ import ClassTeacherMapping
    from app.models.parent import Parent
    from app.models.student import Student
    from app.models.teacher import Teacher
    from app.models.user import User

    class_obj = ClassModel.query.get(class_id)
    if not class_obj:
        return jsonify({"success": False, "message": "Class not found"}), 404

    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    from app.services.identity_resolver import IdentityResolver

    if not IdentityResolver.can_user_access_class(user_id, class_id):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Insufficient permissions to view class announcements",
                }
            ),
            403,
        )

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    paginated_announcements = AnnouncementService.get_announcements_by_class(
        class_id, page, per_page
    )

    if paginated_announcements is None:
        return jsonify({"success": False, "message": "Class not found"}), 404

    return (
        jsonify(
            {
                "success": True,
                "announcements": announcements_schema.dump(
                    paginated_announcements.items
                ),
                "pagination": {
                    "total": paginated_announcements.total,
                    "pages": paginated_announcements.pages,
                    "page": paginated_announcements.page,
                    "per_page": paginated_announcements.per_page,
                    "next": paginated_announcements.next_num,
                    "prev": paginated_announcements.prev_num,
                },
            }
        ),
        200,
    )


@classes_bp.route("/<int:class_id>/announcements", methods=["POST"])
@jwt_required()
@teacher_required
def create_class_announcement(class_id):
    """Create a new announcement for a class."""
    try:
        user_id = int(get_jwt_identity())
        from app.models.class_ import Class as ClassModel
        from app.models.class_ import ClassTeacherMapping
        from app.models.teacher import Teacher
        from app.models.user import User

        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        teacher = Teacher.query.filter_by(user_id=user_id).first()
        teacher_id = None
        if teacher:
            teacher_id = teacher.id

        if user.role == "teacher":
            if not teacher:
                return (
                    jsonify({"success": False, "message": "Teacher record not found"}),
                    403,
                )
            from app.services.identity_resolver import IdentityResolver

            if not IdentityResolver.can_user_access_class(user_id, class_id):
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Insufficient permissions for this class context",
                        }
                    ),
                    403,
                )
        else:
            if not teacher:
                class_obj = ClassModel.query.get(class_id)
                if class_obj:
                    teacher_id = class_obj.teacher_id

        payload = dict(request.json or {})
        payload["class_id"] = class_id
        if not payload.get("scope"):
            payload["scope"] = "class_bound"
        data = announcement_create_schema.load(payload)
        data["teacher_id"] = teacher_id

        announcement, error = AnnouncementService.create_announcement(data)

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Announcement created successfully",
                    "announcement": announcement_schema.dump(announcement),
                }
            ),
            201,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@classes_bp.route(
    "/<int:class_id>/announcements/<int:announcement_id>", methods=["PUT"]
)
@jwt_required()
@teacher_required
def update_class_announcement(class_id, announcement_id):
    """Update an announcement for a class."""
    try:
        user_id = int(get_jwt_identity())
        from app.models.class_ import Class as ClassModel
        from app.models.class_ import ClassTeacherMapping
        from app.models.teacher import Teacher
        from app.models.user import User

        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        teacher = Teacher.query.filter_by(user_id=user_id).first()
        teacher_id = None
        if teacher:
            teacher_id = teacher.id

        if user.role == "teacher":
            if not teacher:
                return (
                    jsonify({"success": False, "message": "Teacher record not found"}),
                    403,
                )
            is_assigned = (
                ClassTeacherMapping.query.filter_by(
                    class_id=class_id, teacher_id=teacher.user_id
                ).first()
                is not None
            )
            if not is_assigned:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Insufficient permissions for this class context",
                        }
                    ),
                    403,
                )
        else:
            if not teacher:
                announcement_obj = AnnouncementService.get_announcement_by_id(
                    announcement_id
                )
                if announcement_obj:
                    teacher_id = announcement_obj.teacher_id
                else:
                    class_obj = ClassModel.query.get(class_id)
                    if class_obj:
                        teacher_id = class_obj.teacher_id

        data = announcement_update_schema.load(request.json, partial=True)

        announcement, error = AnnouncementService.update_announcement(
            announcement_id, data, class_id, teacher_id
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Announcement updated successfully",
                    "announcement": announcement_schema.dump(announcement),
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@classes_bp.route(
    "/<int:class_id>/announcements/<int:announcement_id>", methods=["DELETE"]
)
@jwt_required()
@teacher_required
def delete_class_announcement(class_id, announcement_id):
    """Delete an announcement from a class."""
    try:
        user_id = int(get_jwt_identity())
        from app.models.class_ import Class as ClassModel
        from app.models.class_ import ClassTeacherMapping
        from app.models.teacher import Teacher
        from app.models.user import User

        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        teacher = Teacher.query.filter_by(user_id=user_id).first()
        teacher_id = None
        if teacher:
            teacher_id = teacher.id

        if user.role == "teacher":
            if not teacher:
                return (
                    jsonify({"success": False, "message": "Teacher record not found"}),
                    403,
                )
            is_assigned = (
                ClassTeacherMapping.query.filter_by(
                    class_id=class_id, teacher_id=teacher.user_id
                ).first()
                is not None
            )
            if not is_assigned:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Insufficient permissions for this class context",
                        }
                    ),
                    403,
                )
        else:
            if not teacher:
                announcement_obj = AnnouncementService.get_announcement_by_id(
                    announcement_id
                )
                if announcement_obj:
                    teacher_id = announcement_obj.teacher_id
                else:
                    class_obj = ClassModel.query.get(class_id)
                    if class_obj:
                        teacher_id = class_obj.teacher_id

        success, error = AnnouncementService.delete_announcement(
            announcement_id, class_id, teacher_id
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify({"success": True, "message": "Announcement deleted successfully"}),
            200,
        )
    except Exception as e:
        current_app.logger.error(f"Error deleting announcement: {str(e)}")
        return (
            jsonify({"success": False, "message": "Failed to delete announcement"}),
            500,
        )


# Resource routes
@classes_bp.route("/<int:class_id>/resources", methods=["GET"])
@jwt_required()
@require_permission("resource.read")
def get_class_resources(class_id):
    """Get resources for a specific class."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    paginated_resources = ResourceService.get_resources_by_class(
        class_id, page, per_page
    )

    if paginated_resources is None:
        return jsonify({"success": False, "message": "Class not found"}), 404

    return (
        jsonify(
            {
                "success": True,
                "resources": resources_schema.dump(paginated_resources.items),
                "pagination": {
                    "total": paginated_resources.total,
                    "pages": paginated_resources.pages,
                    "page": paginated_resources.page,
                    "per_page": paginated_resources.per_page,
                    "next": paginated_resources.next_num,
                    "prev": paginated_resources.prev_num,
                },
            }
        ),
        200,
    )


# Update the POST route for creating resources
@classes_bp.route("/<int:class_id>/resources", methods=["POST"])
@jwt_required()
@teacher_required
def create_class_resource(class_id):
    """Create a new resource for a class with optional file upload."""
    try:
        # Check if there's a file in the request
        file = request.files.get("file")

        # Get JSON data or form data
        if request.is_json:
            data = resource_create_schema.load(request.json)
        else:
            data = resource_create_schema.load(request.form)

        data["class_id"] = class_id
        data["teacher_id"] = get_jwt_identity()

        resource, error = ResourceService.create_resource(data, file)

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Resource created successfully",
                    "resource": resource_schema.dump(resource),
                }
            ),
            201,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


# Update the PUT route for updating resources
@classes_bp.route("/<int:class_id>/resources/<int:resource_id>", methods=["PUT"])
@jwt_required()
@teacher_required
def update_class_resource(class_id, resource_id):
    """Update a resource for a class with optional file replacement."""
    try:
        # Check if there's a file in the request
        file = request.files.get("file")

        # Get JSON data or form data
        if request.is_json:
            data = resource_update_schema.load(request.json, partial=True)
        else:
            data = resource_update_schema.load(request.form, partial=True)

        resource, error = ResourceService.update_resource(
            resource_id, data, class_id, get_jwt_identity(), file
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Resource updated successfully",
                    "resource": resource_schema.dump(resource),
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@classes_bp.route("/<int:class_id>/resources/<int:resource_id>", methods=["DELETE"])
@jwt_required()
@teacher_required
def delete_class_resource(class_id, resource_id):
    """Delete a resource from a class."""
    success, error = ResourceService.delete_resource(
        resource_id, class_id, get_jwt_identity()
    )

    if error:
        return jsonify({"success": False, "message": error}), 400

    return jsonify({"success": True, "message": "Resource deleted successfully"}), 200


# Subject routes
@classes_bp.route("/<int:class_id>/subjects", methods=["GET"])
@jwt_required()
@require_role(["admin", "teacher"])
def get_class_subjects(class_id):
    """Get subjects for a specific class."""
    user_id = int(get_jwt_identity())
    from app.models.user import User
    from app.services.identity_resolver import IdentityResolver

    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    if user.role == "teacher" and not IdentityResolver.can_user_access_class(
        user_id, class_id
    ):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Insufficient permissions for this class context",
                }
            ),
            403,
        )

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    paginated_subjects = SubjectService.get_subjects_by_class(class_id, page, per_page)

    if paginated_subjects is None:
        # Check if class exists
        if not ClassService.get_class_by_id(class_id):
            return jsonify({"success": False, "message": "Class not found"}), 404
        return jsonify({"success": False, "message": "Failed to fetch subjects"}), 500

    subjects_list = paginated_subjects.items
    total = paginated_subjects.total
    pages = paginated_subjects.pages

    # Fallback to returning all active subjects if class mapping is empty
    if not subjects_list:
        from app.models.subject import Subject

        query = Subject.query.filter_by(is_active=True)
        if getattr(g, "tenant_id", None) is not None:
            query = query.filter(Subject.tenant_id == g.tenant_id)
        subjects_list = query.order_by(Subject.name).all()
        total = len(subjects_list)
        pages = 1

    return (
        jsonify(
            {
                "success": True,
                "subjects": subjects_schema.dump(subjects_list),
                "pagination": {
                    "total": total,
                    "pages": pages,
                    "page": (
                        1 if not paginated_subjects.items else paginated_subjects.page
                    ),
                    "per_page": per_page,
                    "next": (
                        None
                        if not paginated_subjects.items
                        else paginated_subjects.next_num
                    ),
                    "prev": (
                        None
                        if not paginated_subjects.items
                        else paginated_subjects.prev_num
                    ),
                },
            }
        ),
        200,
    )


# Assignment routes
@classes_bp.route("/<int:class_id>/assignments", methods=["POST"])
@jwt_required()
@teacher_required
def create_class_assignment(class_id):
    """Create a new assignment for a class."""
    try:
        from datetime import datetime

        from app.extensions import db

        user_id = int(get_jwt_identity())
        from app.models.class_ import Class as ClassModel
        from app.models.class_ import ClassTeacherMapping
        from app.models.subject import Subject
        from app.models.teacher import Teacher
        from app.models.user import User
        from app.services.assignment_service import AssignmentService

        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        teacher = Teacher.query.filter_by(user_id=user_id).first()
        if not teacher:
            return (
                jsonify({"success": False, "message": "Teacher record not found"}),
                403,
            )

        class_obj = ClassModel.query.get(class_id)
        if not class_obj:
            return jsonify({"success": False, "message": "Class not found"}), 404

        # Verify teacher is assigned to class
        is_assigned = (
            ClassTeacherMapping.query.filter_by(
                class_id=class_id, teacher_id=user_id
            ).first()
            is not None
        )
        if not is_assigned and user.role == "teacher":
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Insufficient permissions for this class context",
                    }
                ),
                403,
            )

        # Extract and format payload
        payload = (
            request.form.to_dict()
            if request.form
            else (request.get_json(silent=True) or {})
        )
        uploaded_attachments = request.files.getlist("attachments")
        title = payload.get("title")
        if not title or not title.strip():
            return jsonify({"success": False, "message": "Title is required"}), 400

        description = payload.get("description") or payload.get("instructions") or ""

        due_date_raw = payload.get("due_date") or payload.get("dueAt")
        if not due_date_raw:
            return jsonify({"success": False, "message": "due_date is required"}), 400
        try:
            due_date = datetime.fromisoformat(
                str(due_date_raw).replace("Z", "+00:00")
            ).replace(tzinfo=None)
        except Exception:
            try:
                due_date = datetime.strptime(str(due_date_raw)[:10], "%Y-%m-%d")
            except Exception:
                try:
                    due_date = datetime.strptime(str(due_date_raw), "%Y-%m-%d")
                except Exception:
                    return (
                        jsonify(
                            {"success": False, "message": "Invalid due_date format"}
                        ),
                        400,
                    )

        # Resolve subject_id
        subject_id = payload.get("subject_id")
        if not subject_id:
            first_subject = class_obj.subjects.first()
            if first_subject:
                subject_id = first_subject.id
            else:
                fallback_subject = Subject.query.filter_by(
                    tenant_id=class_obj.tenant_id
                ).first()
                if fallback_subject:
                    subject_id = fallback_subject.id
                else:
                    fallback_subject = Subject(
                        name="General",
                        code=f"GEN-{class_id}",
                        tenant_id=class_obj.tenant_id,
                    )
                    db.session.add(fallback_subject)
                    db.session.flush()
                    subject_id = fallback_subject.id

        total_points = payload.get("total_points") or payload.get("total_marks")
        if total_points is None:
            total_points = 100.0
        else:
            total_points = float(total_points)

        assignment_type = payload.get("assignment_type", "homework")
        status = payload.get("status", "active")
        if status == "published":
            status = "active"

        assignment_data = {
            "class_id": class_id,
            "teacher_id": teacher.id,
            "title": title.strip(),
            "description": description.strip(),
            "due_date": due_date,
            "subject_id": subject_id,
            "total_points": total_points,
            "assignment_type": assignment_type,
            "status": status,
        }

        assignment, error = AssignmentService.create_assignment(
            assignment_data,
            attachments=uploaded_attachments,
            uploader_id=user_id,
            tenant_id=getattr(class_obj, "tenant_id", None),
        )
        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Assignment created successfully",
                    "assignment": {
                        "id": assignment.id,
                        "title": assignment.title,
                        "description": assignment.description,
                        "due_date": assignment.due_date.isoformat(),
                        "subject_id": assignment.subject_id,
                        "class_id": assignment.class_id,
                        "teacher_id": assignment.teacher_id,
                        "total_points": assignment.total_points,
                        "assignment_type": assignment.assignment_type,
                        "status": assignment.status,
                        "attachments": getattr(assignment, "attachments_payload", []),
                    },
                }
            ),
            201,
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@classes_bp.route("/<int:class_id>/assignments", methods=["GET"])
@jwt_required()
def get_class_assignments(class_id):
    """Get assignments for a specific class."""
    try:
        from sqlalchemy import func

        from app.extensions import db
        from app.models.assignment_submission import AssignmentSubmission
        from app.services.assignment_service import AssignmentService

        assignments = AssignmentService.get_assignments_by_class(
            class_id, status="active"
        )
        assignment_ids = [assignment.id for assignment in assignments]
        attachment_map = AssignmentService.get_attachment_map(
            "assignment", assignment_ids
        )
        submission_counts = (
            {
                assignment_id: total
                for assignment_id, total in db.session.query(
                    AssignmentSubmission.assignment_id,
                    func.count(AssignmentSubmission.id),
                )
                .filter(AssignmentSubmission.assignment_id.in_(assignment_ids))
                .group_by(AssignmentSubmission.assignment_id)
                .all()
            }
            if assignment_ids
            else {}
        )

        assignments_data = []
        for a in assignments:
            assignments_data.append(
                {
                    "id": a.id,
                    "title": a.title,
                    "description": a.description or "",
                    "due_date": a.due_date.isoformat(),
                    "subject_id": a.subject_id,
                    "class_id": a.class_id,
                    "teacher_id": a.teacher_id,
                    "total_points": a.total_points,
                    "assignment_type": a.assignment_type,
                    "status": a.status,
                    "attachments": attachment_map.get(str(a.id), []),
                    "submission_count": int(submission_counts.get(a.id, 0)),
                }
            )

        return jsonify({"success": True, "assignments": assignments_data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@classes_bp.route("/assignments/<int:assignment_id>/submissions", methods=["GET"])
@jwt_required()
@require_role(["admin", "super_admin", "teacher"])
def get_assignment_submissions(assignment_id):
    """Get submissions for an assignment visible to the current teacher/admin."""
    try:
        from sqlalchemy.orm import joinedload

        from app.models.assignment import Assignment
        from app.models.assignment_submission import AssignmentSubmission
        from app.models.user import User
        from app.services.assignment_service import AssignmentService
        from app.services.identity_resolver import IdentityResolver

        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        assignment = Assignment.query.get(assignment_id)
        if not assignment:
            return jsonify({"success": False, "message": "Assignment not found"}), 404

        if user.role == "teacher" and not IdentityResolver.can_user_access_class(
            user_id, assignment.class_id
        ):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Insufficient permissions for this class context",
                    }
                ),
                403,
            )

        submissions = (
            AssignmentSubmission.query.options(joinedload(AssignmentSubmission.student))
            .filter(AssignmentSubmission.assignment_id == assignment_id)
            .order_by(
                AssignmentSubmission.submission_date.desc(),
                AssignmentSubmission.created_at.desc(),
            )
            .all()
        )

        attachment_map = AssignmentService.get_attachment_map(
            "assignment_submission", [submission.id for submission in submissions]
        )
        submissions_data = []
        for submission in submissions:
            student = submission.student
            student_name = None
            if student:
                student_name = (
                    f"{getattr(student, 'first_name', '')} {getattr(student, 'last_name', '')}".strip()
                    or getattr(student, "name", None)
                    or f"Student #{student.id}"
                )

            submissions_data.append(
                {
                    "id": submission.id,
                    "assignment_id": submission.assignment_id,
                    "student_id": submission.student_id,
                    "student_name": student_name,
                    "content": submission.content,
                    "file_path": submission.file_path,
                    "attachments": attachment_map.get(str(submission.id), []),
                    "submission_date": (
                        submission.submission_date.isoformat()
                        if submission.submission_date
                        else None
                    ),
                    "score": submission.score,
                    "feedback": submission.feedback,
                    "status": submission.status,
                    "graded_by": submission.graded_by,
                    "graded_at": (
                        submission.graded_at.isoformat()
                        if submission.graded_at
                        else None
                    ),
                }
            )

        return (
            jsonify(
                {
                    "success": True,
                    "assignment": {
                        "id": assignment.id,
                        "title": assignment.title,
                        "class_id": assignment.class_id,
                    },
                    "submissions": submissions_data,
                }
            ),
            200,
        )
    except Exception as e:
        current_app.logger.error(
            f"Error fetching submissions for assignment {assignment_id}: {str(e)}"
        )
        return (
            jsonify({"success": False, "message": "Failed to fetch submissions"}),
            500,
        )


@classes_bp.route("/<int:class_id>/teachers", methods=["GET"])
@jwt_required()
@tenant_required
def get_class_teachers(class_id):
    """Get all teachers assigned to a specific class."""
    try:
        from app.models.class_ import Class as ClassModel
        from app.models.class_ import ClassTeacherMapping
        from app.models.teacher import Teacher
        from app.models.user import User

        class_obj = ClassModel.query.get(class_id)
        if not class_obj or getattr(class_obj, "tenant_id", None) != getattr(
            g, "tenant_id", None
        ):
            return jsonify({"success": False, "message": "Class not found"}), 404

        teachers = []
        seen_teacher_ids = set()

        # 1. Primary class teacher
        if class_obj.teacher_id:
            primary_teacher = Teacher.query.get(class_obj.teacher_id)
            if primary_teacher and primary_teacher.id not in seen_teacher_ids:
                seen_teacher_ids.add(primary_teacher.id)
                teachers.append(primary_teacher)

        # 2. Teachers mapped through ClassTeacherMapping
        mappings = ClassTeacherMapping.query.filter_by(class_id=class_id).all()
        for m in mappings:
            # m.teacher_id matches User.id of the teacher
            teacher_profile = Teacher.query.filter_by(user_id=m.teacher_id).first()
            if teacher_profile and teacher_profile.id not in seen_teacher_ids:
                seen_teacher_ids.add(teacher_profile.id)
                teachers.append(teacher_profile)

        formatted_teachers = []
        for t in teachers:
            user_email = t.user.email if t.user else ""
            formatted_teachers.append(
                {
                    "id": t.id,
                    "user_id": t.user_id,
                    "name": f"{t.first_name} {t.last_name}",
                    "subject": t.specialization or "General",
                    "email": user_email,
                    "phone": t.phone_number or "",
                }
            )

        return jsonify({"success": True, "teachers": formatted_teachers}), 200
    except Exception as e:
        current_app.logger.error(
            f"Error fetching teachers for class {class_id}: {str(e)}"
        )
        return jsonify({"success": False, "message": "Failed to fetch teachers"}), 500


@classes_bp.route("/submissions/<int:submission_id>/grade", methods=["POST"])
@jwt_required()
@teacher_required
def grade_class_submission(submission_id):
    """Grade a student assignment submission."""
    try:
        user_id = int(get_jwt_identity())
        from app.models.assignment_submission import AssignmentSubmission
        from app.models.student import Student
        from app.models.user import User
        from app.services.assignment_service import AssignmentService
        from app.services.identity_resolver import IdentityResolver

        user = User.query.get(user_id)
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        submission = AssignmentSubmission.query.get(submission_id)
        if not submission:
            return jsonify({"success": False, "message": "Submission not found"}), 404

        student = Student.query.get(submission.student_id)
        if not student:
            return (
                jsonify({"success": False, "message": "Student profile not found"}),
                404,
            )

        if (
            not IdentityResolver.can_user_access_class(user_id, student.class_id)
            and user.role == "teacher"
        ):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Insufficient permissions for this class context",
                    }
                ),
                403,
            )

        payload = request.json or {}
        score = payload.get("score")
        feedback = payload.get("feedback", "")

        if score is None:
            return jsonify({"success": False, "message": "Score is required"}), 400

        submission, error = AssignmentService.grade_submission(
            submission_id=submission_id,
            score=float(score),
            feedback=feedback,
            graded_by=user_id,
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Submission graded successfully",
                    "submission": {
                        "id": submission.id,
                        "score": submission.score,
                        "feedback": submission.feedback,
                        "status": submission.status,
                        "graded_by": submission.graded_by,
                    },
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =============================================================================
# Teacher Scope RBAC Helpers (3-way class assignment pattern)
# =============================================================================

from flask import abort as _abort
from app.extensions import db
from app.models.class_ import Class, ClassTeacherMapping
from app.models.teacher import Teacher
from app.models.user import User
from app.utils.rbac_decorators import has_permission as _has_permission


def _classes_current_user_teacher_ids() -> list:
    user_id = get_jwt_identity()
    if not user_id:
        return []
    rows = (
        db.session.query(Teacher.id)
        .filter(Teacher.user_id == user_id)
        .all()
    )
    return [int(r[0]) for r in rows if r and r[0]]


def _classes_current_user_is_admin_like() -> bool:
    user_id = get_jwt_identity()
    if not user_id:
        return False
    user = db.session.query(User).filter(User.id == user_id).first()
    if getattr(user, "role", None) in {
        "admin", "school_admin", "super_admin", "super_manager", "manager", "billing_admin",
    }:
        return True
    return False


def _classes_teacher_is_assigned_to_class(teacher_ids, class_id: int) -> bool:
    if not teacher_ids or not class_id:
        return False

    class_ = db.session.query(Class).filter(Class.id == class_id).first()
    if class_ is None:
        return False

    if class_.teacher_id and int(class_.teacher_id) in {int(t) for t in teacher_ids}:
        return True

    mapping_exists = (
        db.session.query(ClassTeacherMapping.id)
        .filter(
            ClassTeacherMapping.class_id == class_id,
            ClassTeacherMapping.teacher_id.in_(teacher_ids),
        )
        .first()
    )
    if mapping_exists:
        return True

    try:
        from app.models.associations import class_subjects, teacher_subjects
        from app.models.subject import Subject

        assigned_subject_ids = (
            db.session.query(class_subjects.c.subject_id)
            .filter(class_subjects.c.class_id == class_id)
            .all()
        )
        if not assigned_subject_ids:
            return False
        subject_ids = [int(r[0]) for r in assigned_subject_ids if r and r[0]]
        linked_teacher = (
            db.session.query(teacher_subjects.c.teacher_id)
            .filter(
                teacher_subjects.c.subject_id.in_(subject_ids),
                teacher_subjects.c.teacher_id.in_(teacher_ids),
            )
            .first()
        )
        if linked_teacher is not None:
            return True
    except Exception:
        pass
    return False


def _classes_is_teacher_and_scoped_to_class(class_id) -> bool:
    if class_id is None:
        return False
    teacher_ids = _classes_current_user_teacher_ids()
    if not teacher_ids:
        return False
    return _classes_teacher_is_assigned_to_class(teacher_ids, int(class_id))


def _classes_ensure_teacher_or_admin(class_id, permission: str) -> None:
    current_user = db.session.query(User).filter(User.id == get_jwt_identity()).first() if get_jwt_identity() else None
    authorized = bool(current_user) and _has_permission(current_user, permission)
    if authorized:
        return
    if _classes_is_teacher_and_scoped_to_class(class_id):
        return
    _abort(403)


def _classes_ensure_teacher_or_admin_by_lesson(lesson, permission: str) -> None:
    class_id = getattr(lesson, "class_id", None)
    _classes_ensure_teacher_or_admin(class_id, permission)


# =============================================================================
# Lesson Broadcast Endpoints
# =============================================================================

from app.models.lesson_broadcast import LessonBroadcast
from app.models.lesson import Lesson as LessonModel


@classes_bp.route("/<int:class_id>/lessons/<int:lesson_id>/broadcast", methods=["POST"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
def start_lesson_broadcast(class_id, lesson_id):
    lesson = LessonModel.query.filter_by(id=lesson_id, class_id=class_id).first()
    if not lesson:
        return jsonify({"success": False, "message": "Lesson not found"}), 404

    _classes_ensure_teacher_or_admin(class_id, "lesson.update")

    tenant_id = getattr(g, "tenant_id", None) or getattr(lesson, "tenant_id", None)

    broadcast = (
        LessonBroadcast.query.filter_by(
            lesson_id=lesson_id, status="live"
        ).first()
    )
    if broadcast:
        return jsonify({"success": False, "message": "Broadcast already live"}), 400

    now = datetime.utcnow()
    broadcast = LessonBroadcast(
        lesson_id=lesson_id,
        tenant_id=tenant_id,
        status="live",
        started_at=now,
        viewer_count=0,
        peak_viewers=0,
    )
    db.session.add(broadcast)
    lesson.status = "in-progress"
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Broadcast started",
        "broadcast": {
            "id": broadcast.id,
            "lesson_id": broadcast.lesson_id,
            "status": broadcast.status,
            "started_at": broadcast.started_at.isoformat() if broadcast.started_at else None,
            "viewer_count": broadcast.viewer_count,
            "peak_viewers": broadcast.peak_viewers,
        }
    }), 200


@classes_bp.route("/<int:class_id>/lessons/<int:lesson_id>/end-broadcast", methods=["POST"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
def end_lesson_broadcast(class_id, lesson_id):
    lesson = LessonModel.query.filter_by(id=lesson_id, class_id=class_id).first()
    if not lesson:
        return jsonify({"success": False, "message": "Lesson not found"}), 404

    _classes_ensure_teacher_or_admin(class_id, "lesson.update")

    broadcast = (
        LessonBroadcast.query.filter_by(
            lesson_id=lesson_id
        ).order_by(LessonBroadcast.created_at.desc()).first()
    )
    if not broadcast:
        return jsonify({"success": False, "message": "No broadcast found"}), 404

    if broadcast.status == "ended":
        return jsonify({"success": False, "message": "Broadcast already ended"}), 400

    broadcast.status = "ended"
    broadcast.ended_at = datetime.utcnow()
    lesson.status = "completed"
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Broadcast ended",
        "broadcast": {
            "id": broadcast.id,
            "lesson_id": broadcast.lesson_id,
            "status": broadcast.status,
            "started_at": broadcast.started_at.isoformat() if broadcast.started_at else None,
            "ended_at": broadcast.ended_at.isoformat() if broadcast.ended_at else None,
            "viewer_count": broadcast.viewer_count,
            "peak_viewers": broadcast.peak_viewers,
        }
    }), 200


@classes_bp.route("/<int:class_id>/lessons/<int:lesson_id>/live-stats", methods=["GET"])
@jwt_required()
@tenant_required
def get_lesson_live_stats(class_id, lesson_id):
    lesson = LessonModel.query.filter_by(id=lesson_id, class_id=class_id).first()
    if not lesson:
        return jsonify({"success": False, "message": "Lesson not found"}), 404

    broadcast = (
        LessonBroadcast.query.filter_by(
            lesson_id=lesson_id
        ).order_by(LessonBroadcast.created_at.desc()).first()
    )

    if not broadcast:
        return jsonify({
            "success": True,
            "stats": {
                "viewer_count": 0,
                "peak_viewers": 0,
                "status": "offline",
            }
        }), 200

    return jsonify({
        "success": True,
        "stats": {
            "viewer_count": int(broadcast.viewer_count or 0),
            "peak_viewers": int(broadcast.peak_viewers or 0),
            "status": broadcast.status,
            "started_at": broadcast.started_at.isoformat() if broadcast.started_at else None,
            "ended_at": broadcast.ended_at.isoformat() if broadcast.ended_at else None,
        }
    }), 200


# =============================================================================
# Lesson Attachment Endpoints
# =============================================================================

from app.models.lesson_attachment import LessonAttachment
from app.services.adapters import StorageProviderFactory


def _serialize_lesson_attachment(att: LessonAttachment, signed_url: str | None = None) -> dict:
    payload = {
        "id": att.id,
        "lesson_id": att.lesson_id,
        "filename": att.filename,
        "mime_type": att.mime_type,
        "size": att.size,
        "storage_key": att.storage_key,
        "link_url": att.link_url,
        "attachment_type": att.attachment_type,
        "display_order": att.display_order,
        "uploader_id": att.uploader_id,
        "created_at": att.created_at.isoformat() if att.created_at else None,
        "updated_at": att.updated_at.isoformat() if att.updated_at else None,
    }
    if signed_url is not None:
        payload["signed_url"] = signed_url
    return payload


@classes_bp.route("/lessons/<int:lesson_id>/attachments", methods=["POST"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
def upload_lesson_attachment(lesson_id):
    lesson = LessonModel.query.get(lesson_id)
    if not lesson:
        return jsonify({"success": False, "message": "Lesson not found"}), 404

    _classes_ensure_teacher_or_admin_by_lesson(lesson, "lesson.update")

    file = request.files.get("file")
    if not file:
        return jsonify({"success": False, "message": "File is required"}), 400

    tenant_id = getattr(g, "tenant_id", None) or getattr(lesson, "tenant_id", None)
    uploader_id = get_jwt_identity()

    filename = file.filename or "attachment"
    content_type = file.mimetype or "application/octet-stream"
    file_bytes = file.read()
    size = len(file_bytes)

    adapter = StorageProviderFactory.adapter_for()
    storage_key = f"tenants/{tenant_id}/lessons/{lesson_id}/attachments/{filename}"
    result = adapter.put_file(
        key=storage_key,
        data=file_bytes,
        content_type=content_type,
        metadata={
            "lesson_id": str(lesson_id),
            "uploader_id": str(uploader_id),
            "original_name": filename,
        },
    )

    if not result.success:
        return jsonify({"success": False, "message": "Storage upload failed"}), 500

    attachment = LessonAttachment(
        lesson_id=lesson_id,
        tenant_id=tenant_id,
        storage_key=storage_key,
        filename=filename,
        mime_type=content_type,
        size=size,
        attachment_type="file",
        uploader_id=int(uploader_id) if uploader_id else None,
    )
    db.session.add(attachment)
    db.session.flush()

    signed_url = adapter.get_signed_url(key=storage_key, expires_in=3600)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Attachment uploaded successfully",
        "attachment": _serialize_lesson_attachment(attachment, signed_url=signed_url),
    }), 201


@classes_bp.route("/lessons/<int:lesson_id>/attachments/<int:attachment_id>/signed-url", methods=["GET"])
@jwt_required()
@tenant_required
def get_lesson_attachment_signed_url(lesson_id, attachment_id):
    lesson = LessonModel.query.get(lesson_id)
    if not lesson:
        return jsonify({"success": False, "message": "Lesson not found"}), 404

    attachment = (
        LessonAttachment.query.filter_by(
            id=attachment_id, lesson_id=lesson_id
        ).first()
    )
    if not attachment:
        return jsonify({"success": False, "message": "Attachment not found"}), 404

    adapter = StorageProviderFactory.adapter_for()
    signed_url = adapter.get_signed_url(key=attachment.storage_key, expires_in=3600)

    return jsonify({
        "success": True,
        "attachment_id": attachment.id,
        "signed_url": signed_url,
    }), 200


# =============================================================================
# Lesson Acknowledgement Endpoints
# =============================================================================

from app.models.lesson_acknowledgement import LessonAcknowledgement


def _serialize_lesson_acknowledgement(ack: LessonAcknowledgement) -> dict:
    return {
        "id": ack.id,
        "lesson_id": ack.lesson_id,
        "user_id": ack.user_id,
        "role": ack.role,
        "is_acknowledged": ack.is_acknowledged,
        "is_seen": ack.is_seen,
        "acknowledged_at": ack.acknowledged_at.isoformat() if ack.acknowledged_at else None,
        "seen_at": ack.seen_at.isoformat() if ack.seen_at else None,
        "acknowledgement_note": ack.acknowledgement_note,
        "created_at": ack.created_at.isoformat() if ack.created_at else None,
    }


@classes_bp.route("/lessons/<int:lesson_id>/acknowledge", methods=["POST"])
@jwt_required()
@tenant_required
def acknowledge_lesson(lesson_id):
    lesson = LessonModel.query.get(lesson_id)
    if not lesson:
        return jsonify({"success": False, "message": "Lesson not found"}), 404

    user_id = get_jwt_identity()
    user = db.session.query(User).filter(User.id == user_id).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    role = request.json.get("role") if request.is_json else None
    if not role:
        role_map = {
            "teacher": "teacher",
            "student": "student",
            "parent": "parent",
            "admin": "admin",
            "school_admin": "admin",
            "super_admin": "admin",
            "super_manager": "admin",
            "manager": "staff",
        }
        role = role_map.get(getattr(user, "role", ""), "staff")

    payload = request.get_json(silent=True) or {}
    note = payload.get("acknowledgement_note") or payload.get("note") or None
    tenant_id = getattr(g, "tenant_id", None) or getattr(lesson, "tenant_id", None)
    now = datetime.utcnow()

    ack = (
        LessonAcknowledgement.query.filter_by(
            lesson_id=lesson_id,
            user_id=int(user_id),
            role=role,
            tenant_id=tenant_id,
        ).first()
    )
    if ack:
        ack.is_acknowledged = True
        ack.acknowledged_at = now
        ack.is_seen = True
        ack.seen_at = now
        if note:
            ack.acknowledgement_note = note
    else:
        ack = LessonAcknowledgement(
            lesson_id=lesson_id,
            user_id=int(user_id),
            role=role,
            tenant_id=tenant_id,
            is_acknowledged=True,
            acknowledged_at=now,
            is_seen=True,
            seen_at=now,
            acknowledgement_note=note,
        )
        db.session.add(ack)

    if lesson.engagement_ack_count is None:
        lesson.engagement_ack_count = 0
    existing_count = (
        LessonAcknowledgement.query.filter_by(
            lesson_id=lesson_id, is_acknowledged=True
        ).count()
    )
    lesson.engagement_ack_count = existing_count + (0 if ack.id else 1)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Lesson acknowledged",
        "acknowledgement": _serialize_lesson_acknowledgement(ack),
    }), 200


@classes_bp.route("/lessons/<int:lesson_id>/acknowledgements", methods=["GET"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
def get_lesson_acknowledgements(lesson_id):
    lesson = LessonModel.query.get(lesson_id)
    if not lesson:
        return jsonify({"success": False, "message": "Lesson not found"}), 404

    _classes_ensure_teacher_or_admin_by_lesson(lesson, "lesson.read")

    acks = (
        LessonAcknowledgement.query.filter_by(lesson_id=lesson_id)
        .order_by(LessonAcknowledgement.created_at.desc())
        .all()
    )

    return jsonify({
        "success": True,
        "acknowledgements": [_serialize_lesson_acknowledgement(a) for a in acks],
    }), 200


# =============================================================================
# Lesson Comment Endpoints + LessonModerationService
# =============================================================================

from app.models.lesson_comment import LessonComment


class LessonModerationService:
    @staticmethod
    def auto_approve_comment(comment: LessonComment) -> None:
        content = (comment.content or "").strip().lower()
        flagged_tokens = ["spam", "advertise", "buy now", "click here"]
        has_flagged = any(tok in content for tok in flagged_tokens)
        if not has_flagged:
            comment.is_approved = True
            comment.approved_at = datetime.utcnow()
            comment.requires_approval = False

    @staticmethod
    def filter_comments_query(query, viewer_role, viewer_user_id):
        if viewer_role in {"admin", "school_admin", "super_admin", "super_manager", "teacher"}:
            return query.filter(LessonComment.is_deleted == False)
        return query.filter(
            LessonComment.is_deleted == False,
            LessonComment.is_approved == True,
        )


def _serialize_lesson_comment(comment: LessonComment, viewer_role: str | None = None) -> dict:
    author = getattr(comment, "author", None)
    author_name = None
    if author:
        author_name = (
            getattr(author, "full_name", None)
            or f"{getattr(author, 'first_name', '')} {getattr(author, 'last_name', '')}".strip()
            or getattr(author, "email", None)
        )
    payload = {
        "id": comment.id,
        "lesson_id": comment.lesson_id,
        "author_id": comment.author_id,
        "author_name": author_name,
        "content": comment.content,
        "visibility": comment.visibility,
        "is_approved": comment.is_approved,
        "requires_approval": comment.requires_approval,
        "parent_comment_id": comment.parent_comment_id,
        "edit_count": comment.edit_count,
        "edited_at": comment.edited_at.isoformat() if comment.edited_at else None,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
        "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
    }
    if viewer_role in {"admin", "school_admin", "super_admin", "super_manager", "teacher"}:
        payload["is_deleted"] = comment.is_deleted
        if comment.is_deleted:
            payload["deleted_at"] = comment.deleted_at.isoformat() if comment.deleted_at else None
            payload["deleted_by_id"] = comment.deleted_by_id
        if comment.approved_by_id:
            payload["approved_by_id"] = comment.approved_by_id
            payload["approved_at"] = comment.approved_at.isoformat() if comment.approved_at else None
    return payload


@classes_bp.route("/lessons/<int:lesson_id>/comments", methods=["POST"])
@jwt_required()
@tenant_required
def create_lesson_comment(lesson_id):
    lesson = LessonModel.query.get(lesson_id)
    if not lesson:
        return jsonify({"success": False, "message": "Lesson not found"}), 404

    payload = request.get_json(silent=True) or {}
    content = (payload.get("content") or "").strip()
    if not content:
        return jsonify({"success": False, "message": "Content is required"}), 400

    user_id = int(get_jwt_identity())
    user = db.session.query(User).filter(User.id == user_id).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    tenant_id = getattr(g, "tenant_id", None) or getattr(lesson, "tenant_id", None)
    visibility = payload.get("visibility") or "class"
    parent_comment_id = payload.get("parent_comment_id")

    comment = LessonComment(
        lesson_id=lesson_id,
        author_id=user_id,
        tenant_id=tenant_id,
        content=content,
        visibility=visibility,
        parent_comment_id=int(parent_comment_id) if parent_comment_id else None,
        requires_approval=True,
        is_approved=False,
    )
    LessonModerationService.auto_approve_comment(comment)
    db.session.add(comment)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Comment posted",
        "comment": _serialize_lesson_comment(comment, viewer_role=getattr(user, "role")),
    }), 201


@classes_bp.route("/lessons/<int:lesson_id>/comments", methods=["GET"])
@jwt_required()
@tenant_required
def get_lesson_comments(lesson_id):
    lesson = LessonModel.query.get(lesson_id)
    if not lesson:
        return jsonify({"success": False, "message": "Lesson not found"}), 404

    user_id = int(get_jwt_identity())
    user = db.session.query(User).filter(User.id == user_id).first()
    role = getattr(user, "role", None) if user else None

    query = LessonComment.query.filter_by(lesson_id=lesson_id)
    query = LessonModerationService.filter_comments_query(query, role, user_id)

    comments = query.order_by(LessonComment.created_at.desc()).all()

    return jsonify({
        "success": True,
        "comments": [_serialize_lesson_comment(c, viewer_role=role) for c in comments],
    }), 200


@classes_bp.route("/comments/<int:comment_id>/approve", methods=["POST"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
def approve_lesson_comment(comment_id):
    comment = LessonComment.query.get(comment_id)
    if not comment:
        return jsonify({"success": False, "message": "Comment not found"}), 404
    if comment.is_deleted:
        return jsonify({"success": False, "message": "Comment is deleted"}), 400

    lesson = LessonModel.query.get(comment.lesson_id)
    if lesson:
        _classes_ensure_teacher_or_admin_by_lesson(lesson, "lesson.update")

    user_id = int(get_jwt_identity())
    now = datetime.utcnow()
    comment.is_approved = True
    comment.requires_approval = False
    comment.approved_by_id = user_id
    comment.approved_at = now
    db.session.commit()

    user = db.session.query(User).filter(User.id == user_id).first()
    return jsonify({
        "success": True,
        "message": "Comment approved",
        "comment": _serialize_lesson_comment(comment, viewer_role=getattr(user, "role")),
    }), 200


@classes_bp.route("/comments/<int:comment_id>/delete", methods=["POST"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
def soft_delete_lesson_comment(comment_id):
    comment = LessonComment.query.get(comment_id)
    if not comment:
        return jsonify({"success": False, "message": "Comment not found"}), 404
    if comment.is_deleted:
        return jsonify({"success": False, "message": "Comment already deleted"}), 400

    lesson = LessonModel.query.get(comment.lesson_id)
    if lesson:
        _classes_ensure_teacher_or_admin_by_lesson(lesson, "lesson.update")

    user_id = int(get_jwt_identity())
    now = datetime.utcnow()
    comment.is_deleted = True
    comment.deleted_by_id = user_id
    comment.deleted_at = now
    db.session.commit()

    user = db.session.query(User).filter(User.id == user_id).first()
    return jsonify({
        "success": True,
        "message": "Comment deleted (soft)",
        "comment": _serialize_lesson_comment(comment, viewer_role=getattr(user, "role")),
    }), 200


# =============================================================================
# Admin Lesson Monitoring KPIs
# =============================================================================

from sqlalchemy import func


@classes_bp.route("/lesson-monitoring/kpis", methods=["GET"])
@jwt_required()
@tenant_required
@require_role(["admin", "school_admin", "super_admin", "super_manager"])
def get_lesson_monitoring_kpis():
    tenant_id = getattr(g, "tenant_id", None)
    today = datetime.utcnow().date()

    classes_query = Class.query
    lessons_query = LessonModel.query.join(Class, LessonModel.class_id == Class.id)
    broadcasts_query = LessonBroadcast.query

    if tenant_id is not None:
        classes_query = classes_query.filter(Class.tenant_id == tenant_id)
        lessons_query = lessons_query.filter(Class.tenant_id == tenant_id)
        broadcasts_query = broadcasts_query.filter(LessonBroadcast.tenant_id == tenant_id)

    total_classes = classes_query.count()
    total_lessons_today = lessons_query.filter(LessonModel.date == today).count()
    classes_with_lessons_today = (
        lessons_query.filter(LessonModel.date == today)
        .with_entities(func.distinct(LessonModel.class_id))
        .count()
    )
    coverage_pct = 0.0
    if total_classes:
        coverage_pct = round((classes_with_lessons_today / total_classes) * 100, 2)

    ack_lessons = lessons_query.filter(LessonModel.date == today).all()
    total_possible_acks = 0
    total_actual_acks = 0
    for l in ack_lessons:
        ack_count = (
            LessonAcknowledgement.query.filter_by(
                lesson_id=l.id, is_acknowledged=True
            ).count()
        )
        if l.class_id:
            from app.models.student import Student
            cls_students = Student.query.filter_by(class_id=l.class_id).count()
            total_possible_acks += max(cls_students, 1)
        total_actual_acks += ack_count or int(l.engagement_ack_count or 0)
    ack_rate = 0.0
    if total_possible_acks:
        ack_rate = round((total_actual_acks / total_possible_acks) * 100, 2)

    live_count = broadcasts_query.filter(LessonBroadcast.status == "live").count()

    broadcast_stats = {
        "total_broadcasts_today": broadcasts_query.filter(
            func.date(LessonBroadcast.created_at) == today
        ).count(),
        "live_now": live_count,
        "ended_today": broadcasts_query.filter(
            LessonBroadcast.status == "ended",
            func.date(LessonBroadcast.ended_at) == today,
        ).count(),
        "total_peak_viewers_today": int(
            broadcasts_query.filter(
                func.date(LessonBroadcast.created_at) == today
            ).with_entities(func.coalesce(func.sum(LessonBroadcast.peak_viewers), 0)).scalar() or 0
        ),
    }

    kpis = {
        "coverage": coverage_pct,
        "coverage_classes_with_lessons": classes_with_lessons_today,
        "coverage_total_classes": total_classes,
        "ack_rate": ack_rate,
        "ack_actual": total_actual_acks,
        "ack_expected": total_possible_acks,
        "live_count": live_count,
        "lessons_today": total_lessons_today,
        "broadcast_stats": broadcast_stats,
        "generated_at": datetime.utcnow().isoformat(),
    }

    return jsonify({"success": True, "kpis": kpis}), 200


# =============================================================================
# Register lesson-level routes directly on api_v1_bp for canonical URLs
# (/api/v1/lessons/* and /api/v1/comments/*) without /classes prefix.
# =============================================================================
try:
    from app.api.v1 import api_v1_bp as _api_v1_bp

    def _mk_view(fn):
        from functools import wraps
        @wraps(fn)
        def wrapper(*a, **kw):
            return fn(*a, **kw)
        return wrapper

    _api_v1_bp.add_url_rule(
        "/lessons/<int:lesson_id>/attachments",
        endpoint="v1_lesson_attachments_upload",
        view_func=_mk_view(upload_lesson_attachment),
        methods=["POST"],
    )
    _api_v1_bp.add_url_rule(
        "/lessons/<int:lesson_id>/attachments/<int:attachment_id>/signed-url",
        endpoint="v1_lesson_attachment_signed_url",
        view_func=_mk_view(get_lesson_attachment_signed_url),
        methods=["GET"],
    )
    _api_v1_bp.add_url_rule(
        "/lessons/<int:lesson_id>/acknowledge",
        endpoint="v1_lesson_acknowledge",
        view_func=_mk_view(acknowledge_lesson),
        methods=["POST"],
    )
    _api_v1_bp.add_url_rule(
        "/lessons/<int:lesson_id>/acknowledgements",
        endpoint="v1_lesson_acknowledgements",
        view_func=_mk_view(get_lesson_acknowledgements),
        methods=["GET"],
    )
    _api_v1_bp.add_url_rule(
        "/lessons/<int:lesson_id>/comments",
        endpoint="v1_lesson_comments_create",
        view_func=_mk_view(create_lesson_comment),
        methods=["POST"],
    )
    _api_v1_bp.add_url_rule(
        "/lessons/<int:lesson_id>/comments",
        endpoint="v1_lesson_comments_list",
        view_func=_mk_view(get_lesson_comments),
        methods=["GET"],
    )
    _api_v1_bp.add_url_rule(
        "/comments/<int:comment_id>/approve",
        endpoint="v1_comment_approve",
        view_func=_mk_view(approve_lesson_comment),
        methods=["POST"],
    )
    _api_v1_bp.add_url_rule(
        "/comments/<int:comment_id>/delete",
        endpoint="v1_comment_delete",
        view_func=_mk_view(soft_delete_lesson_comment),
        methods=["POST"],
    )
except Exception as _reg_err:
    current_app.logger.warning(f"Could not register canonical lesson routes: {_reg_err}")
