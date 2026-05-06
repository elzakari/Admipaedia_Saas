from datetime import datetime
import structlog
from app.extensions import db, bcrypt  # Import from extensions, not from __init__
from app.models.user import User, Role, LoginHistory
from flask_jwt_extended import create_access_token, create_refresh_token
from flask import request

logger = structlog.get_logger()

class AuthService:
    """Service for authentication-related operations."""
    
    @staticmethod
    @staticmethod
    def register_user(username, email, password, roles=None):
        """Register a new user."""
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            raise ValueError(f"Email {email} is already registered")
        
        if User.query.filter_by(username=username).first():
            raise ValueError(f"Username {username} is already taken")
        
        # Create new user
        new_user = User(
            username=username,
            email=email,
        )
        new_user.set_password_hash(password)
        
        # Add roles if provided
        if roles:
            for role_name in roles:
                role = Role.query.filter_by(name=role_name).first()
                if role:
                    new_user.roles.append(role)
        
        # Set the primary role field to the first role for backward compatibility
        if roles:
            new_user.role = roles[0]
    
        db.session.add(new_user)
        db.session.commit()
        
        logger.info("User registered", user_id=str(new_user.id))
        return new_user
    
    @staticmethod
    def authenticate_user(email, password):
        """Authenticate a user and return tokens."""
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password_hash(password):
            return None
        
        # Create tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        # Update last login time
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        return {
            'user': user,
            'access_token': access_token,
            'refresh_token': refresh_token
        }
    
    @staticmethod
    def record_login_attempt(user_id=None, email=None, success=True, ip_address=None, user_agent=None):
        """Record a login attempt in the login history."""
        try:
            if user_id:
                login_record = LoginHistory(
                    user_id=user_id,
                    success=success,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                db.session.add(login_record)
                db.session.commit()
            
            # Log the event
            if success:
                logger.info("login_successful", email=email, ip=ip_address)
            else:
                logger.warning("login_failed", email=email, ip=ip_address)
                
            return True
        except Exception as e:
            db.session.rollback()
            logger.error("login_tracking_error", error=str(e), email=email)
            return False

    @staticmethod
    def get_portal_data(role):
        """Get role-specific portal data for the frontend."""
        portals = {
            'admin': {
                'defaultRoute': '/admin/dashboard',
                'allowedPages': ['dashboard', 'users', 'academics', 'finances', 'settings']
            },
            'teacher': {
                'defaultRoute': '/teacher/dashboard',
                'allowedPages': ['dashboard', 'classes', 'students', 'grades', 'attendance']
            },
            'student': {
                'defaultRoute': '/student/dashboard',
                'allowedPages': ['dashboard', 'courses', 'grades', 'attendance', 'assignments']
            },
            'parent': {
                'defaultRoute': '/parent/dashboard',
                'allowedPages': ['dashboard', 'children', 'attendance', 'grades', 'finances']
            },
            'user': {
                'defaultRoute': '/dashboard',
                'allowedPages': ['dashboard', 'profile', 'settings']
            }
        }
        
        return portals.get(role, portals['user'])

    @staticmethod
    def create_role_profile(user, role, data):
        """Create role-specific profile for the user."""
        # Implementation depends on your data model
        logger.info(f"Creating {role} profile for user {user.id}")
        
        # Example implementation:
        if role == 'teacher':
            # Create teacher profile
            pass
        elif role == 'student':
            # Create student profile
            pass
        elif role == 'parent':
            # Create parent profile
            pass

    @staticmethod
    def is_admin_creator(request):
        """Check if the requester has permission to create admin accounts."""
        # This is a placeholder for the actual implementation
        # For now, return False for security
        return False

    @staticmethod
    def get_user_by_id(user_id):
        """Get a user by ID."""
        return User.query.get(user_id)
