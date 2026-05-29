#!/usr/bin/env python3
"""
User Manager CLI Tool for ADMIPAEDIA
Provides interactive administration capabilities for user profiles.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db, bcrypt
from app.models.user import User
from sqlalchemy import func, or_

def resolve_user(identifier: str):
    """
    Polymorphic identity resolver.
    Handles numeric IDs, usernames, or emails case-insensitively.
    """
    identifier = str(identifier or '').strip()
    if not identifier:
        return None

    if identifier.isdigit():
        # Search strictly by primary key
        return User.query.filter(User.id == int(identifier)).first()
    
    # Case-insensitive lookup across email and username
    matches = User.query.filter(
        or_(
            func.lower(User.email) == identifier.lower(),
            func.lower(User.username) == identifier.lower()
        )
    ).all()

    if len(matches) > 1:
        print("Multiple users matched. Please use a numeric user ID.")
        return None
    elif len(matches) == 1:
        return matches[0]
    
    return None

def show_profile():
    identifier = input("Enter user email, username, or user ID: ")
    user = resolve_user(identifier)
    if not user:
        print("User not found.")
        return
    
    print("\n" + "=" * 40)
    print("USER PROFILE")
    print("=" * 40)
    print(f"ID: {user.id}")
    print(f"Username: {user.username}")
    print(f"Email: {user.email}")
    print(f"Role: {user.role}")
    print(f"Status: {user.status}")
    print(f"Email Verified: {getattr(user, 'email_verified', 'N/A')}")
    print(f"Created At: {user.created_at}")
    print(f"Last Login: {user.last_login}")
    print("=" * 40 + "\n")

def change_email():
    identifier = input("Enter user email, username, or user ID: ")
    user = resolve_user(identifier)
    if not user:
        print("User not found.")
        return
    
    new_email = input("Enter new email address: ").strip().lower()
    if not new_email:
        print("Email cannot be empty.")
        return
    
    # Check if already exists
    existing = User.query.filter(func.lower(User.email) == new_email).first()
    if existing and existing.id != user.id:
        print("Error: That email is already registered to another user.")
        return
    
    user.email = new_email
    db.session.commit()
    print("Successfully updated email address.")

def reset_password():
    identifier = input("Enter user email, username, or user ID: ")
    user = resolve_user(identifier)
    if not user:
        print("User not found.")
        return
    
    new_password = input("Enter new password: ").strip()
    if not new_password:
        print("Password cannot be empty.")
        return
    
    user.set_password_hash(new_password)
    db.session.commit()
    print("Successfully reset password.")

def verify_email_manually():
    identifier = input("Enter user email, username, or user ID: ")
    user = resolve_user(identifier)
    if not user:
        print("User not found.")
        return
    
    if hasattr(user, 'email_verified'):
        user.email_verified = True
    if hasattr(user, 'email_verified_at'):
        from datetime import datetime
        user.email_verified_at = datetime.utcnow()
    
    user.status = 'active'
    db.session.commit()
    print("Successfully verified email manually and set status to active.")

def main_menu():
    app = create_app()
    with app.app_context():
        while True:
            print("ADMIPAEDIA User Manager")
            print("1. Show User Profile")
            print("2. Change Email Address")
            print("3. Reset Password")
            print("4. Verify Email Manually")
            print("5. Exit")
            
            choice = input("Enter option (1-5): ").strip()
            if choice == '1':
                show_profile()
            elif choice == '2':
                change_email()
            elif choice == '3':
                reset_password()
            elif choice == '4':
                verify_email_manually()
            elif choice == '5':
                print("Exiting.")
                break
            else:
                print("Invalid option. Please try again.\n")

if __name__ == '__main__':
    main_menu()
