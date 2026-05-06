from app import create_app
from app.extensions import db, bcrypt
from app.models.user import User, Role
from app.models.parent import Parent
import structlog

logger = structlog.get_logger()

def create_parent_user():
    app = create_app()
    with app.app_context():
        try:
            # Check if user with ID 1496 exists
            existing_user = User.query.get(1496)
            if existing_user:
                print(f"User with ID 1496 already exists:")
                print(f"  Username: {existing_user.username}")
                print(f"  Email: {existing_user.email}")
                print(f"  Role: {existing_user.role}")
                
                # Update the user's role to parent if it's not already
                if existing_user.role != 'parent':
                    existing_user.role = 'parent'
                    db.session.commit()
                    print(f"  Updated role to 'parent'")
                else:
                    print(f"  User already has 'parent' role")
                return existing_user
            
            # Create parent role if it doesn't exist
            parent_role = Role.query.filter_by(name='parent').first()
            if not parent_role:
                parent_role = Role(name='parent', description='Parent')
                db.session.add(parent_role)
                db.session.commit()
                print("Parent role created")
            
            # Create a new parent user
            hashed_password = bcrypt.generate_password_hash('Parent@123').decode('utf-8')
            parent_user = User(
                username='parent1',
                email='parent1@admipaedia.com',
                password_hash=hashed_password,
                role='parent',
                status='active'
            )
            db.session.add(parent_user)
            db.session.flush()  # To get the ID
            
            # Create parent profile
            parent_profile = Parent(
                user_id=parent_user.id,
                occupation='Engineer',
                address='123 Main Street, City',
                emergency_contact='+1234567890',
                relationship='Father'
            )
            db.session.add(parent_profile)
            db.session.commit()
            
            print(f"Parent user created successfully!")
            print(f"  ID: {parent_user.id}")
            print(f"  Username: {parent_user.username}")
            print(f"  Email: {parent_user.email}")
            print(f"  Password: Parent@123")
            print(f"  Role: {parent_user.role}")
            
            return parent_user
            
        except Exception as e:
            print(f"Error creating parent user: {e}")
            db.session.rollback()
            raise

def check_all_users():
    """Check all existing users"""
    app = create_app()
    with app.app_context():
        users = User.query.all()
        print(f"\nFound {len(users)} users in the database:")
        print("-" * 60)
        for user in users:
            print(f"ID: {user.id:4d} | Username: {user.username:15s} | Email: {user.email:25s} | Role: {user.role}")
        print("-" * 60)

if __name__ == '__main__':
    print("Checking existing users...")
    check_all_users()
    
    print("\nCreating/updating parent user...")
    create_parent_user()
    
    print("\nFinal user list:")
    check_all_users()