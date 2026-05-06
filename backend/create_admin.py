from app import create_app
from app.extensions import db, bcrypt
from app.models.user import User, Role
import structlog

logger = structlog.get_logger()

app = create_app()
with app.app_context():
    # Create admin role if it doesn't exist
    admin_role = Role.query.filter_by(name='admin').first()
    if not admin_role:
        admin_role = Role(name='admin', description='Administrator')
        db.session.add(admin_role)
        db.session.commit()
        print("Admin role created")
    
    # Check if admin user exists
    admin = User.query.filter_by(email='admin@admipaedia.com').first()
    if not admin:
        # Create admin user
        hashed_password = bcrypt.generate_password_hash('Admin@123').decode('utf-8')
        admin = User(
            username='admin',
            email='admin@admipaedia.com',
            password_hash=hashed_password,
            role='admin',
            status='active'
        )
        db.session.add(admin)
        db.session.commit()
        print("Admin user created successfully!")
    else:
        # Update existing admin's password
        admin.password_hash = bcrypt.generate_password_hash('Admin@123').decode('utf-8')
        db.session.commit()
        print("Admin user password updated")
        print("Admin user already exists")