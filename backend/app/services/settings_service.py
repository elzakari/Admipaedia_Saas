from typing import Dict, Any, Optional, List
from app.extensions import db
from app.models.settings import SchoolSettings, UserRole, Permission
from app.models.user import User
from sqlalchemy.exc import IntegrityError
from flask import current_app
import json

class SettingsService:
    def __init__(self, db_session):
        self.db = db_session
    
    # School Settings Management
    def get_school_settings(self) -> Optional[Dict[str, Any]]:
        """Get current school settings."""
        try:
            settings = SchoolSettings.query.first()
            if not settings:
                # Create default settings if none exist
                settings = self._create_default_settings()
            
            return {
                'name': settings.name,
                'code': settings.code,
                'type': settings.type,
                'address': settings.address,
                'city': settings.city,
                'region': settings.region,
                'country': settings.country,
                'postalCode': settings.postal_code,
                'phone': settings.phone,
                'email': settings.email,
                'website': settings.website,
                'academicYear': settings.academic_year,
                'currentTerm': settings.current_term,
                'gradingSystem': settings.grading_system,
                'passingGrade': settings.passing_grade,
                'maxStudentsPerClass': settings.max_students_per_class,
                'timezone': settings.timezone,
                'language': settings.language,
                'currency': settings.currency,
                'dateFormat': settings.date_format,
                'timeFormat': settings.time_format,
                'enableSMS': settings.enable_sms,
                'enableEmail': settings.enable_email,
                'enableParentPortal': settings.enable_parent_portal,
                'enableOnlinePayments': settings.enable_online_payments,
                'enableAttendanceTracking': settings.enable_attendance_tracking,
                'enableGradeBook': settings.enable_grade_book,
                'primaryColor': settings.primary_color,
                'secondaryColor': settings.secondary_color,
                'logo': settings.logo,
                'favicon': settings.favicon
            }
        except Exception as e:
            current_app.logger.error(f"Error getting school settings: {str(e)}")
            return None
    
    def update_school_settings(self, settings_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
        """Update school settings."""
        try:
            settings = SchoolSettings.query.first()
            if not settings:
                settings = SchoolSettings()
                self.db.add(settings)
            
            # Update settings fields
            settings.name = settings_data.get('name', settings.name)
            settings.code = settings_data.get('code', settings.code)
            settings.type = settings_data.get('type', settings.type)
            settings.address = settings_data.get('address', settings.address)
            settings.city = settings_data.get('city', settings.city)
            settings.region = settings_data.get('region', settings.region)
            settings.country = settings_data.get('country', settings.country)
            settings.postal_code = settings_data.get('postalCode', settings.postal_code)
            settings.phone = settings_data.get('phone', settings.phone)
            settings.email = settings_data.get('email', settings.email)
            settings.website = settings_data.get('website', settings.website)
            settings.academic_year = settings_data.get('academicYear', settings.academic_year)
            settings.current_term = settings_data.get('currentTerm', settings.current_term)
            settings.grading_system = settings_data.get('gradingSystem', settings.grading_system)
            settings.passing_grade = settings_data.get('passingGrade', settings.passing_grade)
            settings.max_students_per_class = settings_data.get('maxStudentsPerClass', settings.max_students_per_class)
            settings.timezone = settings_data.get('timezone', settings.timezone)
            settings.language = settings_data.get('language', settings.language)
            settings.currency = settings_data.get('currency', settings.currency)
            settings.date_format = settings_data.get('dateFormat', settings.date_format)
            settings.time_format = settings_data.get('timeFormat', settings.time_format)
            settings.enable_sms = settings_data.get('enableSMS', settings.enable_sms)
            settings.enable_email = settings_data.get('enableEmail', settings.enable_email)
            settings.enable_parent_portal = settings_data.get('enableParentPortal', settings.enable_parent_portal)
            settings.enable_online_payments = settings_data.get('enableOnlinePayments', settings.enable_online_payments)
            settings.enable_attendance_tracking = settings_data.get('enableAttendanceTracking', settings.enable_attendance_tracking)
            settings.enable_grade_book = settings_data.get('enableGradeBook', settings.enable_grade_book)
            settings.primary_color = settings_data.get('primaryColor', settings.primary_color)
            settings.secondary_color = settings_data.get('secondaryColor', settings.secondary_color)
            settings.logo = settings_data.get('logo', settings.logo)
            settings.favicon = settings_data.get('favicon', settings.favicon)
            
            self.db.commit()
            return True, None
            
        except Exception as e:
            self.db.rollback()
            current_app.logger.error(f"Error updating school settings: {str(e)}")
            return False, str(e)
    
    def _create_default_settings(self) -> SchoolSettings:
        """Create default school settings."""
        settings = SchoolSettings(
            name='ADMIPAEDIA Academy',
            code='ADM-12345',
            type='Secondary School',
            address='123 Education Street',
            city='Accra',
            region='Greater Accra',
            country='Ghana',
            postal_code='GA-123-4567',
            phone='+233 20 123 4567',
            email='info@admipaedia-academy.edu.gh',
            website='https://admipaedia-academy.edu.gh',
            academic_year='2024/2025',
            current_term='First Term',
            grading_system='GES',
            passing_grade=50,
            max_students_per_class=40,
            timezone='Africa/Accra',
            language='en',
            currency='GHS',
            date_format='DD/MM/YYYY',
            time_format='24h',
            enable_sms=True,
            enable_email=True,
            enable_parent_portal=True,
            enable_online_payments=False,
            enable_attendance_tracking=True,
            enable_grade_book=True,
            primary_color='#3B82F6',
            secondary_color='#10B981',
            logo='',
            favicon=''
        )
        self.db.add(settings)
        self.db.commit()
        return settings
    
    # Role Management
    def get_roles(self) -> List[Dict[str, Any]]:
        """Get all user roles."""
        try:
            roles = UserRole.query.all()
            return [{
                'id': role.id,
                'name': role.name,
                'description': role.description,
                'permissions': json.loads(role.permissions) if role.permissions else [],
                'userCount': User.query.filter_by(role=role.name.lower()).count(),
                'isSystem': role.is_system,
                'createdAt': role.created_at.isoformat() if role.created_at else None
            } for role in roles]
        except Exception as e:
            current_app.logger.error(f"Error getting roles: {str(e)}")
            return []
    
    def create_role(self, role_data: Dict[str, Any]) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Create a new user role."""
        try:
            # Check if role name already exists
            existing_role = UserRole.query.filter_by(name=role_data['name']).first()
            if existing_role:
                return None, "Role name already exists"
            
            role = UserRole(
                name=role_data['name'],
                description=role_data.get('description', ''),
                permissions=json.dumps(role_data.get('permissions', [])),
                is_system=False
            )
            
            self.db.add(role)
            self.db.commit()
            
            return {
                'id': role.id,
                'name': role.name,
                'description': role.description,
                'permissions': json.loads(role.permissions) if role.permissions else [],
                'userCount': 0,
                'isSystem': role.is_system,
                'createdAt': role.created_at.isoformat() if role.created_at else None
            }, None
            
        except IntegrityError as e:
            self.db.rollback()
            current_app.logger.error(f"Integrity error creating role: {str(e)}")
            return None, "Role name already exists or constraint violation"
        except Exception as e:
            self.db.rollback()
            current_app.logger.error(f"Error creating role: {str(e)}")
            return None, str(e)
    
    def update_role(self, role_id: int, role_data: Dict[str, Any]) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Update an existing user role."""
        try:
            role = UserRole.query.get(role_id)
            if not role:
                return None, "Role not found"
            
            if role.is_system:
                return None, "Cannot modify system roles"
            
            # Check if new name conflicts with existing roles (excluding current)
            if 'name' in role_data and role_data['name'] != role.name:
                existing_role = UserRole.query.filter(
                    UserRole.name == role_data['name'],
                    UserRole.id != role_id
                ).first()
                if existing_role:
                    return None, "Role name already exists"
            
            # Update role fields
            role.name = role_data.get('name', role.name)
            role.description = role_data.get('description', role.description)
            if 'permissions' in role_data:
                role.permissions = json.dumps(role_data['permissions'])
            
            self.db.commit()
            
            return {
                'id': role.id,
                'name': role.name,
                'description': role.description,
                'permissions': json.loads(role.permissions) if role.permissions else [],
                'userCount': User.query.filter_by(role=role.name.lower()).count(),
                'isSystem': role.is_system,
                'createdAt': role.created_at.isoformat() if role.created_at else None
            }, None
            
        except IntegrityError as e:
            self.db.rollback()
            current_app.logger.error(f"Integrity error updating role {role_id}: {str(e)}")
            return None, "Role name already exists or constraint violation"
        except Exception as e:
            self.db.rollback()
            current_app.logger.error(f"Error updating role {role_id}: {str(e)}")
            return None, str(e)
    
    def delete_role(self, role_id: int) -> tuple[bool, Optional[str]]:
        """Delete a user role."""
        try:
            role = UserRole.query.get(role_id)
            if not role:
                return False, "Role not found"
            
            if role.is_system:
                return False, "Cannot delete system roles"
            
            # Check if role is assigned to any users
            user_count = User.query.filter_by(role=role.name.lower()).count()
            if user_count > 0:
                return False, f"Cannot delete role. {user_count} users are assigned to this role"
            
            self.db.delete(role)
            self.db.commit()
            
            return True, None
            
        except Exception as e:
            self.db.rollback()
            current_app.logger.error(f"Error deleting role {role_id}: {str(e)}")
            return False, str(e)
    
    def get_role_by_id(self, role_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific role by ID."""
        try:
            role = UserRole.query.get(role_id)
            if not role:
                return None
            
            return {
                'id': role.id,
                'name': role.name,
                'description': role.description,
                'permissions': json.loads(role.permissions) if role.permissions else [],
                'userCount': User.query.filter_by(role=role.name.lower()).count(),
                'isSystem': role.is_system,
                'createdAt': role.created_at.isoformat() if role.created_at else None
            }
            
        except Exception as e:
            current_app.logger.error(f"Error getting role {role_id}: {str(e)}")
            return None
    
    # Permission Management
    def get_permissions(self) -> List[Dict[str, Any]]:
        """Get all available permissions."""
        try:
            permissions = Permission.query.all()
            return [{
                'id': permission.id,
                'name': permission.name,
                'description': permission.description,
                'category': permission.category,
                'resource': permission.resource,
                'action': permission.action,
                'createdAt': permission.created_at.isoformat() if permission.created_at else None
            } for permission in permissions]
        except Exception as e:
            current_app.logger.error(f"Error getting permissions: {str(e)}")
            return []
    
    def create_permission(self, permission_data: Dict[str, Any]) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Create a new permission."""
        try:
            # Check if permission already exists
            existing_permission = Permission.query.filter_by(
                resource=permission_data['resource'],
                action=permission_data['action']
            ).first()
            if existing_permission:
                return None, "Permission already exists for this resource and action"
            
            permission = Permission(
                name=permission_data['name'],
                description=permission_data.get('description', ''),
                category=permission_data.get('category', 'general'),
                resource=permission_data['resource'],
                action=permission_data['action']
            )
            
            self.db.add(permission)
            self.db.commit()
            
            return {
                'id': permission.id,
                'name': permission.name,
                'description': permission.description,
                'category': permission.category,
                'resource': permission.resource,
                'action': permission.action,
                'createdAt': permission.created_at.isoformat() if permission.created_at else None
            }, None
            
        except IntegrityError as e:
            self.db.rollback()
            current_app.logger.error(f"Integrity error creating permission: {str(e)}")
            return None, "Permission already exists or constraint violation"
        except Exception as e:
            self.db.rollback()
            current_app.logger.error(f"Error creating permission: {str(e)}")
            return None, str(e)
    
    def update_permission(self, permission_id: int, permission_data: Dict[str, Any]) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Update an existing permission."""
        try:
            permission = Permission.query.get(permission_id)
            if not permission:
                return None, "Permission not found"
            
            # Check for conflicts if resource/action is being changed
            if ('resource' in permission_data or 'action' in permission_data):
                new_resource = permission_data.get('resource', permission.resource)
                new_action = permission_data.get('action', permission.action)
                
                existing_permission = Permission.query.filter(
                    Permission.resource == new_resource,
                    Permission.action == new_action,
                    Permission.id != permission_id
                ).first()
                if existing_permission:
                    return None, "Permission already exists for this resource and action"
            
            # Update permission fields
            permission.name = permission_data.get('name', permission.name)
            permission.description = permission_data.get('description', permission.description)
            permission.category = permission_data.get('category', permission.category)
            permission.resource = permission_data.get('resource', permission.resource)
            permission.action = permission_data.get('action', permission.action)
            
            self.db.commit()
            
            return {
                'id': permission.id,
                'name': permission.name,
                'description': permission.description,
                'category': permission.category,
                'resource': permission.resource,
                'action': permission.action,
                'createdAt': permission.created_at.isoformat() if permission.created_at else None
            }, None
            
        except IntegrityError as e:
            self.db.rollback()
            current_app.logger.error(f"Integrity error updating permission {permission_id}: {str(e)}")
            return None, "Permission already exists or constraint violation"
        except Exception as e:
            self.db.rollback()
            current_app.logger.error(f"Error updating permission {permission_id}: {str(e)}")
            return None, str(e)
    
    def delete_permission(self, permission_id: int) -> tuple[bool, Optional[str]]:
        """Delete a permission."""
        try:
            permission = Permission.query.get(permission_id)
            if not permission:
                return False, "Permission not found"
            
            # Check if permission is assigned to any roles
            roles_with_permission = UserRole.query.filter(
                UserRole.permissions.contains(f'"{permission.name}"')
            ).all()
            
            if roles_with_permission:
                role_names = [role.name for role in roles_with_permission]
                return False, f"Cannot delete permission. It is assigned to roles: {', '.join(role_names)}"
            
            self.db.delete(permission)
            self.db.commit()
            
            return True, None
            
        except Exception as e:
            self.db.rollback()
            current_app.logger.error(f"Error deleting permission {permission_id}: {str(e)}")
            return False, str(e)
    
    def get_permission_by_id(self, permission_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific permission by ID."""
        try:
            permission = Permission.query.get(permission_id)
            if not permission:
                return None
            
            return {
                'id': permission.id,
                'name': permission.name,
                'description': permission.description,
                'category': permission.category,
                'resource': permission.resource,
                'action': permission.action,
                'createdAt': permission.created_at.isoformat() if permission.created_at else None
            }
            
        except Exception as e:
            current_app.logger.error(f"Error getting permission {permission_id}: {str(e)}")
            return None
    
    # User Management
    def get_users_by_role(self, role_name: str) -> List[Dict[str, Any]]:
        """Get all users assigned to a specific role."""
        try:
            users = User.query.filter_by(role=role_name.lower()).all()
            return [{
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'isActive': user.is_active if hasattr(user, 'is_active') else True,
                'createdAt': user.created_at.isoformat() if user.created_at else None,
                'lastLogin': user.last_login.isoformat() if user.last_login else None
            } for user in users]
        except Exception as e:
            current_app.logger.error(f"Error getting users by role {role_name}: {str(e)}")
            return []
    
    def update_user_role(self, user_id: int, new_role: str) -> tuple[bool, Optional[str]]:
        """Update a user's role."""
        try:
            user = User.query.get(user_id)
            if not user:
                return False, "User not found"
            
            # Verify the new role exists
            role = UserRole.query.filter_by(name=new_role).first()
            if not role:
                return False, "Role not found"
            
            user.role = new_role.lower()
            self.db.commit()
            
            return True, None
            
        except Exception as e:
            self.db.rollback()
            current_app.logger.error(f"Error updating user {user_id} role: {str(e)}")
            return False, str(e)
    
    # System Configuration
    def get_system_info(self) -> Dict[str, Any]:
        """Get system information and statistics."""
        try:
            total_users = User.query.count()
            total_roles = UserRole.query.count()
            total_permissions = Permission.query.count()
            
            # Get user count by role
            role_stats = {}
            roles = UserRole.query.all()
            for role in roles:
                role_stats[role.name] = User.query.filter_by(role=role.name.lower()).count()
            
            return {
                'totalUsers': total_users,
                'totalRoles': total_roles,
                'totalPermissions': total_permissions,
                'roleStatistics': role_stats,
                'systemRoles': [role.name for role in roles if role.is_system],
                'customRoles': [role.name for role in roles if not role.is_system]
            }
            
        except Exception as e:
            current_app.logger.error(f"Error getting system info: {str(e)}")
            return {
                'totalUsers': 0,
                'totalRoles': 0,
                'totalPermissions': 0,
                'roleStatistics': {},
                'systemRoles': [],
                'customRoles': []
            }
    
    def initialize_default_roles_and_permissions(self) -> tuple[bool, Optional[str]]:
        """Initialize default roles and permissions for the system."""
        try:
            # Default permissions
            default_permissions = [
                {'name': 'view_dashboard', 'description': 'View dashboard', 'category': 'dashboard', 'resource': 'dashboard', 'action': 'view'},
                {'name': 'manage_users', 'description': 'Manage users', 'category': 'administration', 'resource': 'users', 'action': 'manage'},
                {'name': 'manage_roles', 'description': 'Manage roles', 'category': 'administration', 'resource': 'roles', 'action': 'manage'},
                {'name': 'view_students', 'description': 'View students', 'category': 'academic', 'resource': 'students', 'action': 'view'},
                {'name': 'manage_students', 'description': 'Manage students', 'category': 'academic', 'resource': 'students', 'action': 'manage'},
                {'name': 'view_teachers', 'description': 'View teachers', 'category': 'academic', 'resource': 'teachers', 'action': 'view'},
                {'name': 'manage_teachers', 'description': 'Manage teachers', 'category': 'academic', 'resource': 'teachers', 'action': 'manage'},
                {'name': 'view_classes', 'description': 'View classes', 'category': 'academic', 'resource': 'classes', 'action': 'view'},
                {'name': 'manage_classes', 'description': 'Manage classes', 'category': 'academic', 'resource': 'classes', 'action': 'manage'},
                {'name': 'view_subjects', 'description': 'View subjects', 'category': 'academic', 'resource': 'subjects', 'action': 'view'},
                {'name': 'manage_subjects', 'description': 'Manage subjects', 'category': 'academic', 'resource': 'subjects', 'action': 'manage'},
                {'name': 'view_attendance', 'description': 'View attendance', 'category': 'academic', 'resource': 'attendance', 'action': 'view'},
                {'name': 'manage_attendance', 'description': 'Manage attendance', 'category': 'academic', 'resource': 'attendance', 'action': 'manage'},
                {'name': 'view_grades', 'description': 'View grades', 'category': 'academic', 'resource': 'grades', 'action': 'view'},
                {'name': 'manage_grades', 'description': 'Manage grades', 'category': 'academic', 'resource': 'grades', 'action': 'manage'},
                {'name': 'view_reports', 'description': 'View reports', 'category': 'reports', 'resource': 'reports', 'action': 'view'},
                {'name': 'generate_reports', 'description': 'Generate reports', 'category': 'reports', 'resource': 'reports', 'action': 'generate'},
                {'name': 'manage_settings', 'description': 'Manage system settings', 'category': 'administration', 'resource': 'settings', 'action': 'manage'},
            ]
            
            # Create permissions if they don't exist
            for perm_data in default_permissions:
                existing = Permission.query.filter_by(
                    resource=perm_data['resource'],
                    action=perm_data['action']
                ).first()
                if not existing:
                    permission = Permission(**perm_data)
                    self.db.add(permission)
            
            # Default roles
            default_roles = [
                {
                    'name': 'Admin',
                    'description': 'System administrator with full access',
                    'permissions': [perm['name'] for perm in default_permissions],
                    'is_system': True
                },
                {
                    'name': 'Teacher',
                    'description': 'Teacher with academic management access',
                    'permissions': [
                        'view_dashboard', 'view_students', 'view_classes', 'view_subjects',
                        'view_attendance', 'manage_attendance', 'view_grades', 'manage_grades',
                        'view_reports'
                    ],
                    'is_system': True
                },
                {
                    'name': 'Student',
                    'description': 'Student with limited access to personal information',
                    'permissions': ['view_dashboard', 'view_attendance', 'view_grades'],
                    'is_system': True
                },
                {
                    'name': 'Parent',
                    'description': 'Parent with access to child information',
                    'permissions': ['view_dashboard', 'view_attendance', 'view_grades', 'view_reports'],
                    'is_system': True
                }
            ]
            
            # Create roles if they don't exist
            for role_data in default_roles:
                existing = UserRole.query.filter_by(name=role_data['name']).first()
                if not existing:
                    role = UserRole(
                        name=role_data['name'],
                        description=role_data['description'],
                        permissions=json.dumps(role_data['permissions']),
                        is_system=role_data['is_system']
                    )
                    self.db.add(role)
            
            self.db.commit()
            return True, None
            
        except Exception as e:
            self.db.rollback()
            current_app.logger.error(f"Error initializing default roles and permissions: {str(e)}")
            return False, str(e)