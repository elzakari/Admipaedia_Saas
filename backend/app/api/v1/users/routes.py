"""
User Management API Routes
Comprehensive CRUD operations for user management with role-based access control
"""

from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import Schema, fields, validate, ValidationError
from datetime import datetime, timedelta
import structlog

from app.models.user import User, Role, user_roles
from app.models.security import SecurityEvent, PasswordHistory
from app.extensions import db
from app.middleware.security_middleware import (
    rate_limit, sanitize_request_data, security_headers, 
    log_security_event
)
from app.utils.rbac_decorators import require_permission
from app.utils.password_security import PasswordSecurity
from app.utils.tenant_context import tenant_required
from app.services.auth_service import AuthService
from app.services.user_deletion_policy_service import UserDeletionPolicyService

logger = structlog.get_logger()
users_bp = Blueprint('users', __name__)

# Validation Schemas
class UserCreateSchema(Schema):
    username = fields.String(required=True, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    role = fields.String(required=False, validate=validate.OneOf(
        ['admin', 'teacher', 'student', 'parent', 'user']
    ))
    first_name = fields.String(required=False, validate=validate.Length(max=50))
    last_name = fields.String(required=False, validate=validate.Length(max=50))
    is_active = fields.Boolean(load_default=True)

class UserUpdateSchema(Schema):
    username = fields.String(required=False, validate=validate.Length(min=3, max=80))
    email = fields.Email(required=False)
    first_name = fields.String(required=False, validate=validate.Length(max=50))
    last_name = fields.String(required=False, validate=validate.Length(max=50))
    is_active = fields.Boolean(required=False)
    role = fields.String(required=False, validate=validate.OneOf(
        ['admin', 'teacher', 'student', 'parent', 'user']
    ))

class BulkUserActionSchema(Schema):
    user_ids = fields.List(fields.Integer(), required=True, validate=validate.Length(min=1))
    action = fields.String(required=True, validate=validate.OneOf(['activate', 'deactivate', 'delete']))

# Helper Functions
def serialize_user(user):
    """Serialize user object for API response"""
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': getattr(user, 'first_name', None),
        'last_name': getattr(user, 'last_name', None),
        'role': user.roles[0].name if user.roles else 'user',
        'is_active': getattr(user, 'is_active', True),
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'last_login': user.last_login.isoformat() if user.last_login else None,
        'password_changed_at': getattr(user, 'password_changed_at', None)
    }

# User CRUD Endpoints
@users_bp.route('/', methods=['GET'])
@jwt_required()
@require_permission('user.read')
@security_headers()
def get_users():
    """Get paginated list of users with filtering and search"""
    try:
        # Query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        search = request.args.get('search', '').strip()
        role_filter = request.args.get('role', '').strip()
        status_filter = request.args.get('status', '').strip()  # active, inactive, all
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')

        # Build query
        query = User.query

        # Search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    User.username.ilike(search_term),
                    User.email.ilike(search_term),
                    getattr(User, 'first_name', User.username).ilike(search_term),
                    getattr(User, 'last_name', User.username).ilike(search_term)
                )
            )

        # Role filter
        if role_filter:
            query = query.join(user_roles).join(Role).filter(Role.name == role_filter)

        # Status filter
        if status_filter == 'active':
            query = query.filter(getattr(User, 'is_active', True) == True)
        elif status_filter == 'inactive':
            query = query.filter(getattr(User, 'is_active', True) == False)

        # Sorting
        if hasattr(User, sort_by):
            if sort_order.lower() == 'desc':
                query = query.order_by(getattr(User, sort_by).desc())
            else:
                query = query.order_by(getattr(User, sort_by).asc())

        # Pagination
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )

        users = [serialize_user(user) for user in pagination.items]

        return jsonify({
            'success': True,
            'users': users,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        logger.error("Error fetching users", error=str(e))
        return jsonify({'success': False, 'error': 'Failed to fetch users'}), 500

@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
@require_permission('user.read')
@security_headers()
def get_user(user_id):
    """Get specific user by ID"""
    try:
        user = User.query.get_or_404(user_id)
        
        # Enhanced user data with additional details
        user_data = serialize_user(user)
        
        # Add security information for admins
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user and any(role.name == 'admin' for role in current_user.roles):
            user_data.update({
                'security_info': {
                    'failed_login_attempts': 0,  # Would need to implement this
                    'last_password_change': getattr(user, 'password_changed_at', None),
                    'account_locked': False,  # Would need to implement this
                }
            })

        return jsonify({
            'success': True,
            'user': user_data
        }), 200

    except Exception as e:
        logger.error("Error fetching user", user_id=user_id, error=str(e))
        return jsonify({'success': False, 'error': 'Failed to fetch user'}), 500

@users_bp.route('/', methods=['POST'])
@jwt_required()
@require_permission('user.create')
@rate_limit(limit=10, window=3600)  # 10 user creations per hour
@sanitize_request_data()
@security_headers()
def create_user():
    """Create a new user"""
    try:
        schema = UserCreateSchema()
        data = schema.load(request.json)

        # Check if email already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({
                'success': False, 
                'error': 'Email already registered'
            }), 400

        # Check if username already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({
                'success': False, 
                'error': 'Username already taken'
            }), 400

        # Validate password strength
        password_validation = PasswordSecurity.validate_password_strength(data['password'])
        if not password_validation['is_valid']:
            return jsonify({
                'success': False,
                'error': 'Password does not meet security requirements',
                'requirements': password_validation['requirements']
            }), 400

        # Create user
        user = User(
            username=data['username'],
            email=data['email']
        )
        
        # Set optional fields if they exist in the User model
        for field in ['first_name', 'last_name', 'is_active']:
            if field in data and hasattr(user, field):
                setattr(user, field, data[field])

        user.set_password_hash(data['password'])
        
        db.session.add(user)
        db.session.flush()  # Get user ID

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        actor_role = getattr(current_user, 'role', None)
        if not actor_role and current_user:
            if any(r.name == 'super_admin' for r in current_user.roles):
                actor_role = 'super_admin'
            elif any(r.name == 'super_manager' for r in current_user.roles):
                actor_role = 'super_manager'

        role_name = data.get('role', 'user')
        if role_name in ('super_admin', 'super_manager') and actor_role != 'super_admin':
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        role = Role.query.filter_by(name=role_name).first()
        if role:
            user.roles.append(role)
        if hasattr(user, 'role'):
            user.role = role_name

        # Store password in history
        password_history = PasswordHistory(
            user_id=user.id,
            password_hash=user.password_hash
        )
        db.session.add(password_history)

        db.session.commit()

        # Log security event
        log_security_event('user_created_by_admin', {
            'created_user_id': user.id,
            'created_by': current_user_id,
            'email': user.email,
            'role': role_name
        })

        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'user': serialize_user(user)
        }), 201

    except ValidationError as err:
        return jsonify({'success': False, 'error': err.messages}), 400
    except Exception as e:
        logger.error("Error creating user", error=str(e))
        return jsonify({'success': False, 'error': 'Failed to create user'}), 500

@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
@require_permission('user.update')
@rate_limit(limit=20, window=3600)  # 20 updates per hour
@sanitize_request_data()
@security_headers()
def update_user(user_id):
    """Update user information"""
    try:
        user = User.query.get_or_404(user_id)
        schema = UserUpdateSchema()
        data = schema.load(request.json)

        # Check email uniqueness if email is being updated
        if 'email' in data and data['email'] != user.email:
            if User.query.filter_by(email=data['email']).first():
                return jsonify({
                    'success': False,
                    'error': 'Email already registered'
                }), 400

        # Check username uniqueness if username is being updated
        if 'username' in data and data['username'] != user.username:
            if User.query.filter_by(username=data['username']).first():
                return jsonify({
                    'success': False,
                    'error': 'Username already taken'
                }), 400

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        actor_role = getattr(current_user, 'role', None)
        if not actor_role and current_user:
            if any(r.name == 'super_admin' for r in current_user.roles):
                actor_role = 'super_admin'
            elif any(r.name == 'super_manager' for r in current_user.roles):
                actor_role = 'super_manager'

        target_role = getattr(user, 'role', None)
        if not target_role:
            if any(r.name == 'super_admin' for r in user.roles):
                target_role = 'super_admin'
            elif any(r.name == 'super_manager' for r in user.roles):
                target_role = 'super_manager'

        if target_role in ('super_admin', 'super_manager') and actor_role != 'super_admin':
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        # Update user fields
        for field, value in data.items():
            if field == 'role':
                if value in ('super_admin', 'super_manager') and actor_role != 'super_admin':
                    return jsonify({'success': False, 'error': 'Unauthorized'}), 403
                # Handle role update
                # Remove existing roles
                user.roles.clear()
                
                # Add new role
                role = Role.query.filter_by(name=value).first()
                if role:
                    user.roles.append(role)
                if hasattr(user, 'role'):
                    user.role = value
            elif hasattr(user, field):
                setattr(user, field, value)

        db.session.commit()

        # Log security event
        log_security_event('user_updated_by_admin', {
            'updated_user_id': user.id,
            'updated_by': current_user_id,
            'updated_fields': list(data.keys())
        })

        return jsonify({
            'success': True,
            'message': 'User updated successfully',
            'user': serialize_user(user)
        }), 200

    except ValidationError as err:
        return jsonify({'success': False, 'error': err.messages}), 400
    except Exception as e:
        logger.error("Error updating user", user_id=user_id, error=str(e))
        return jsonify({'success': False, 'error': 'Failed to update user'}), 500

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
@tenant_required(resolve_branch=False, load_full_user=False)
@require_permission('user.delete')
@rate_limit(limit=5, window=3600)  # 5 deletions per hour
@security_headers()
def delete_user(user_id):
    """Delete a user within the active tenant scope."""
    try:
        current_user_id = get_jwt_identity()
        tenant_id = getattr(g, 'tenant_id', None)
        status = UserDeletionPolicyService.get_delete_status(
            user_id,
            current_user_id,
            tenant_scope_id=tenant_id,
        )
        if not status.get('exists'):
            return jsonify({'success': False, 'error': 'User not found', 'status': status}), 404
        if not status.get('can_delete'):
            reasons = status.get('reasons') or ['Cannot delete user']
            auth_reasons = {
                'Tenant context is required',
                'Only a School Admin can delete users from a school',
                'School Admin can only delete users from an active school',
                'School Admin can only delete users linked to their school',
                'School Admin cannot delete another School Admin account',
                'User has links to another school and cannot be deleted from this school',
            }
            code = 403 if any(reason in auth_reasons for reason in reasons) else 400
            return jsonify({'success': False, 'error': 'Cannot delete user', 'status': status}), code

        target_user = User.query.get(user_id)
        ok, result = UserDeletionPolicyService.delete_user(
            user_id,
            current_user_id,
            tenant_scope_id=tenant_id,
        )
        if not ok:
            return jsonify({'success': False, 'error': 'Cannot delete user', 'status': result}), 400

        log_security_event('user_deleted_by_admin', {
            'deleted_user_id': user_id,
            'deleted_by': current_user_id,
            'email': target_user.email if target_user else None,
            'tenant_id': str(tenant_id) if tenant_id else None,
        })
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'User deleted successfully',
            'result': result,
        }), 200

    except Exception as e:
        logger.error("Error deleting user", user_id=user_id, error=str(e))
        return jsonify({'success': False, 'error': 'Failed to delete user'}), 500

# Bulk Operations
@users_bp.route('/bulk-action', methods=['POST'])
@jwt_required()
@require_permission('user.bulk_update')
@rate_limit(limit=5, window=3600)  # 5 bulk operations per hour
@sanitize_request_data()
@security_headers()
def bulk_user_action():
    """Perform bulk actions on multiple users"""
    try:
        schema = BulkUserActionSchema()
        data = schema.load(request.json)

        user_ids = data['user_ids']
        action = data['action']
        current_user_id = get_jwt_identity()

        # Prevent acting on self
        if int(current_user_id) in user_ids:
            return jsonify({
                'success': False,
                'error': 'Cannot perform bulk action on your own account'
            }), 400

        users = User.query.filter(User.id.in_(user_ids)).all()
        
        if len(users) != len(user_ids):
            return jsonify({
                'success': False,
                'error': 'Some users not found'
            }), 404

        # Perform action
        updated_count = 0
        for user in users:
            if action == 'activate' and hasattr(user, 'is_active'):
                user.is_active = True
                updated_count += 1
            elif action == 'deactivate' and hasattr(user, 'is_active'):
                user.is_active = False
                updated_count += 1
            elif action == 'delete':
                if hasattr(user, 'is_active'):
                    user.is_active = False
                    user.deleted_at = datetime.utcnow()
                else:
                    db.session.delete(user)
                updated_count += 1

        db.session.commit()

        # Log security event
        log_security_event('bulk_user_action', {
            'action': action,
            'user_ids': user_ids,
            'performed_by': current_user_id,
            'affected_count': updated_count
        })

        return jsonify({
            'success': True,
            'message': f'Bulk {action} completed successfully',
            'affected_count': updated_count
        }), 200

    except ValidationError as err:
        return jsonify({'success': False, 'error': err.messages}), 400
    except Exception as e:
        logger.error("Error in bulk user action", error=str(e))
        return jsonify({'success': False, 'error': 'Bulk action failed'}), 500

# User Statistics and Analytics
@users_bp.route('/statistics', methods=['GET'])
@jwt_required()
@require_permission('user.read')
@security_headers()
def get_user_statistics():
    """Get user statistics for admin dashboard"""
    try:
        # Basic counts
        total_users = User.query.count()
        
        # Active/Inactive counts (if supported)
        active_users = 0
        inactive_users = 0
        if hasattr(User, 'is_active'):
            active_users = User.query.filter_by(is_active=True).count()
            inactive_users = User.query.filter_by(is_active=False).count()
        else:
            active_users = total_users

        # Role distribution
        role_stats = db.session.query(
            Role.name, 
            db.func.count(user_roles.c.user_id)
        ).join(user_roles).group_by(Role.name).all()

        # Recent registrations (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_registrations = User.query.filter(
            User.created_at >= thirty_days_ago
        ).count() if hasattr(User, 'created_at') else 0

        return jsonify({
            'success': True,
            'statistics': {
                'total_users': total_users,
                'active_users': active_users,
                'inactive_users': inactive_users,
                'recent_registrations': recent_registrations,
                'role_distribution': dict(role_stats)
            }
        }), 200

    except Exception as e:
        logger.error("Error fetching user statistics", error=str(e))
        return jsonify({'success': False, 'error': 'Failed to fetch statistics'}), 500

# Password Management
@users_bp.route('/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
@require_permission('user.update')
@rate_limit(limit=5, window=3600)  # 5 password resets per hour
@sanitize_request_data()
@security_headers()
def admin_reset_password(user_id):
    """Admin reset user password"""
    try:
        user = User.query.get_or_404(user_id)
        data = request.json
        new_password = data.get('new_password', '').strip()

        if not new_password:
            return jsonify({
                'success': False,
                'error': 'New password is required'
            }), 400

        # Validate password strength
        password_validation = PasswordSecurity.validate_password_strength(new_password)
        if not password_validation['is_valid']:
            return jsonify({
                'success': False,
                'error': 'Password does not meet security requirements',
                'requirements': password_validation['requirements']
            }), 400

        # Update password
        user.set_password_hash(new_password)
        if hasattr(user, 'password_changed_at'):
            user.password_changed_at = datetime.utcnow()

        # Store in password history
        password_history = PasswordHistory(
            user_id=user.id,
            password_hash=user.password_hash
        )
        db.session.add(password_history)
        db.session.commit()

        # Log security event
        log_security_event('admin_password_reset', {
            'target_user_id': user.id,
            'reset_by': get_jwt_identity()
        })

        return jsonify({
            'success': True,
            'message': 'Password reset successfully'
        }), 200

    except Exception as e:
        logger.error("Error resetting password", user_id=user_id, error=str(e))
        return jsonify({'success': False, 'error': 'Failed to reset password'}), 500

# Audit Logs
@users_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
@require_permission('audit.read')
@security_headers()
def get_user_audit_logs():
    """Get user-related audit logs"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        user_id = request.args.get('user_id', type=int)
        event_type = request.args.get('event_type', '').strip()

        # Build query for security events
        query = SecurityEvent.query

        if user_id:
            query = query.filter_by(user_id=user_id)

        if event_type:
            query = query.filter(SecurityEvent.event_type.ilike(f'%{event_type}%'))

        # Filter for user-related events
        user_events = [
            'user_created', 'user_updated', 'user_deleted', 'password_reset',
            'login_attempt', 'failed_login', 'account_locked'
        ]
        query = query.filter(SecurityEvent.event_type.in_(user_events))

        # Order by most recent
        query = query.order_by(SecurityEvent.created_at.desc())

        # Pagination
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        logs = []
        for event in pagination.items:
            logs.append({
                'id': event.id,
                'event_type': event.event_type,
                'user_id': event.user_id,
                'user_name': event.user.username if event.user else 'Unknown',
                'ip_address': event.ip_address,
                'details': event.details,
                'severity': event.severity,
                'created_at': event.created_at.isoformat()
            })

        return jsonify({
            'success': True,
            'audit_logs': logs,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        logger.error("Error fetching audit logs", error=str(e))
        return jsonify({'success': False, 'error': 'Failed to fetch audit logs'}), 500

@users_bp.route('/profile', methods=['PUT', 'PATCH'])
@jwt_required()
@rate_limit(limit=20, window=3600)
@sanitize_request_data()
@security_headers()
def update_current_user_profile():
    """Update profile information of the currently logged-in user."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
            
        data = request.json or {}
        
        # 1. Update basic User properties: first_name, email, phone (or phone_number)
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            email = data['email'].strip()
            if email != user.email:
                if User.query.filter_by(email=email).first():
                    return jsonify({'success': False, 'error': 'Email already registered'}), 400
                user.email = email
                
        # Handle linked teacher, student, or parent phone number if applicable
        from app.models.teacher import Teacher
        from app.models.student import Student
        from app.models.parent import Parent
        
        phone = data.get('phone') or data.get('phone_number')
        if phone:
            user_role_str = getattr(user, 'role', '')
            if not user_role_str and user.roles:
                user_role_str = user.roles[0].name
                
            if user_role_str == 'teacher':
                teacher = Teacher.query.filter_by(user_id=user_id).first()
                if teacher:
                    teacher.phone_number = phone
            elif user_role_str == 'student':
                student = Student.query.filter_by(user_id=user_id).first()
                if student:
                    student.phone_number = phone
            elif user_role_str == 'parent':
                parent = Parent.query.filter_by(user_id=user_id).first()
                if parent:
                    parent.phone_number = phone
                    
        # 2. Update password if provided (Security Preferences tab)
        if 'password' in data or 'new_password' in data:
            new_password = data.get('password') or data.get('new_password')
            current_password = data.get('current_password')
            
            if not current_password:
                return jsonify({'success': False, 'error': 'Current password is required to change password'}), 400
            if not user.check_password_hash(current_password):
                return jsonify({'success': False, 'error': 'Invalid current password'}), 400
                
            password_validation = PasswordSecurity.validate_password_strength(new_password)
            if not password_validation['is_valid']:
                return jsonify({
                    'success': False,
                    'error': 'Password does not meet security requirements',
                    'requirements': password_validation['requirements']
                }), 400
                
            user.set_password_hash(new_password)
            user.password_changed_at = datetime.utcnow()
            
            # Store in password history
            password_history = PasswordHistory(
                user_id=user.id,
                password_hash=user.password_hash
            )
            db.session.add(password_history)
            
        db.session.commit()
        
        # Log security event
        log_security_event('profile_updated_by_user', {
            'user_id': user.id,
            'updated_fields': list(data.keys())
        })
        
        # Query phone to display
        ret_phone = None
        user_role_str = getattr(user, 'role', '')
        if not user_role_str and user.roles:
            user_role_str = user.roles[0].name
            
        if user_role_str == 'teacher':
            teacher = Teacher.query.filter_by(user_id=user_id).first()
            ret_phone = teacher.phone_number if teacher else None
        elif user_role_str == 'student':
            student = Student.query.filter_by(user_id=user_id).first()
            ret_phone = student.phone_number if student else None
        elif user_role_str == 'parent':
            parent = Parent.query.filter_by(user_id=user_id).first()
            ret_phone = parent.phone_number if parent else None
            
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': getattr(user, 'first_name', None),
                'last_name': getattr(user, 'last_name', None),
                'phone': ret_phone,
                'role': user_role_str
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error("Error updating own user profile", error=str(e))
        return jsonify({'success': False, 'error': 'Failed to update profile'}), 500


# Error Handlers
@users_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'User not found'
    }), 404

@users_bp.errorhandler(403)
def forbidden(error):
    return jsonify({
        'success': False,
        'error': 'Insufficient permissions'
    }), 403

@users_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500
