#!/usr/bin/env python3
"""
Script to check existing users in the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db, bcrypt
from app.models.user import User
from app.models.rbac import RBACRole
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_users():
    """Check existing users in the database"""
    app = create_app()
    
    with app.app_context():
        try:
            users = User.query.all()
            
            if not users:
                print("No users found in the database.")
                return
            
            print(f"Found {len(users)} users:")
            print("-" * 50)
            
            for user in users:
                print(f"ID: {user.id}")
                print(f"Username: {user.username}")
                print(f"Email: {user.email}")
                print(f"Role: {user.role}")
                # Check if user has is_active attribute
                if hasattr(user, 'is_active'):
                    print(f"Active: {user.is_active}")
                else:
                    print(f"Active: N/A (attribute not found)")
                print(f"Created: {user.created_at}")
                print(f"Last Login: {user.last_login}")
                
                # Check RBAC roles
                rbac_roles = []
                if hasattr(user, 'role_assignments') and user.role_assignments:
                    try:
                        for role_assignment in user.role_assignments:
                            if role_assignment.role.is_active:
                                rbac_roles.append(role_assignment.role.name)
                        
                        if rbac_roles:
                            print(f"RBAC Roles: {', '.join(rbac_roles)}")
                        else:
                            print("RBAC Roles: None")
                    except Exception as e:
                        print(f"RBAC Roles: Error accessing roles - {str(e)}")
                else:
                    print("RBAC Roles: N/A (role_assignments not found)")
                
                print("-" * 50)
                
        except Exception as e:
            logger.error(f"Error checking users: {str(e)}")
            raise

def test_password(email, password):
    """Test if a password works for a user"""
    app = create_app()
    
    with app.app_context():
        try:
            user = User.query.filter_by(email=email).first()
            
            if not user:
                print(f"User with email {email} not found.")
                return False
            
            if bcrypt.check_password_hash(user.password_hash, password):
                print(f"✅ Password '{password}' is correct for {email}")
                return True
            else:
                print(f"❌ Password '{password}' is incorrect for {email}")
                return False
                
        except Exception as e:
            logger.error(f"Error testing password: {str(e)}")
            return False

def reset_admin_password(new_password='Admin@123'):
    """Reset admin password"""
    app = create_app()
    
    with app.app_context():
        try:
            admin_user = User.query.filter_by(email='admin@admipaedia.com').first()
            
            if not admin_user:
                print("Admin user not found.")
                return False
            
            # Hash the new password
            password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
            admin_user.password_hash = password_hash
            
            db.session.commit()
            
            print(f"✅ Admin password reset to: {new_password}")
            return True
                
        except Exception as e:
            logger.error(f"Error resetting password: {str(e)}")
            db.session.rollback()
            return False

if __name__ == '__main__':
    if len(sys.argv) > 1:
        if sys.argv[1] == '--test-password' and len(sys.argv) >= 4:
            email = sys.argv[2]
            password = sys.argv[3]
            test_password(email, password)
        elif sys.argv[1] == '--reset-admin':
            new_password = sys.argv[2] if len(sys.argv) > 2 else 'Admin@123'
            reset_admin_password(new_password)
        else:
            print("Usage:")
            print("  python check_users.py                                    # List all users")
            print("  python check_users.py --test-password <email> <password> # Test password")
            print("  python check_users.py --reset-admin [password]          # Reset admin password")
    else:
        check_users()