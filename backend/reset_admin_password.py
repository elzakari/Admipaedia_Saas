from app import create_app
from app.extensions import db
from app.models.user import User

def reset_admin_password():
    app = create_app()
    
    with app.app_context():
        # Find admin user
        admin_user = User.query.filter_by(email='admin@admipaedia.com').first()
        
        if admin_user:
            # Reset password to 'Admin@123' using the User model's method
            new_password = 'Admin@123'
            admin_user.set_password_hash(new_password)
            
            db.session.commit()
            print(f"✅ Admin password reset successfully!")
            print(f"Email: {admin_user.email}")
            print(f"New Password: {new_password}")
            print(f"Password hash method: bcrypt (consistent with User model)")
        else:
            print("❌ Admin user not found!")
            print("Creating new admin user...")
            
            # Create new admin user if not found
            admin_user = User(
                username='admin',
                email='admin@admipaedia.com',
                role='admin',
                status='active'
            )
            admin_user.set_password_hash('Admin@123')
            
            db.session.add(admin_user)
            db.session.commit()
            print(f"✅ New admin user created successfully!")
            print(f"Email: admin@admipaedia.com")
            print(f"Password: Admin@123")

if __name__ == '__main__':
    reset_admin_password()