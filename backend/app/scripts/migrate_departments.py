import os
import sys
import psycopg2
import psycopg2.extensions
from sqlalchemy import text, create_engine, inspect
from sqlalchemy.orm import sessionmaker
from urllib.parse import urlparse, parse_qs, urlencode
import random
import string

# Set psycopg2 default encoding globally before any connection is made
psycopg2.extensions.register_type(psycopg2.extensions.UNICODE)
psycopg2.extensions.register_type(psycopg2.extensions.UNICODEARRAY)

def modify_db_url(url, encoding='LATIN1'):
    """Modify database URL to include client_encoding parameter"""
    # Parse the URL
    parsed = urlparse(url)
    
    # Get the query parameters
    query_params = parse_qs(parsed.query)
    
    # Update or add client_encoding parameter
    query_params['client_encoding'] = [encoding]
    
    # Rebuild the query string
    new_query = urlencode(query_params, doseq=True)
    
    # Rebuild the URL with the new query string
    new_url = parsed._replace(query=new_query).geturl()
    
    return new_url

def create_modified_app():
    """Create Flask app with modified database connection settings"""
    # Import here to avoid circular imports
    from app import create_app
    from app.config import Config
    
    # Create a custom config class that modifies the database URI
    class CustomConfig(Config):
        pass
    
    # Get the original database URL
    db_url = Config.SQLALCHEMY_DATABASE_URI
    
    # Modify the connection string to use LATIN1 encoding
    CustomConfig.SQLALCHEMY_DATABASE_URI = modify_db_url(db_url, 'UTF8')
    
    # Create app with custom config
    app = create_app(CustomConfig)
    
    return app

def get_direct_connection(app):
    """Create a direct connection to the database with explicit encoding settings"""
    from app.extensions import db
    
    with app.app_context():
        # Force close any existing connections in the pool
        db.engine.dispose()
        
        # Get connection parameters from SQLAlchemy engine
        url = db.engine.url
        
        # Extract connection parameters correctly for psycopg2
        params = {
            'host': url.host,
            'port': url.port,
            'database': url.database,
            'user': url.username,  # Correct parameter name for psycopg2
            'password': url.password
        }
        
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        
        # Create a direct connection
        conn = psycopg2.connect(**params)
        
        # Set client encoding explicitly
        conn.set_client_encoding('UTF8')
        
        return conn

def generate_unique_code(cursor, dept_name):
    """Generate a unique department code"""
    # Create a code from the first letters of each word in the name
    words = dept_name.split()
    code = ''.join([word[0].upper() for word in words if word])
    if not code:
        code = dept_name[:3].upper()
    
    # Check if code already exists and make it unique if needed
    cursor.execute("SELECT id FROM departments WHERE code = %s", (code,))
    if cursor.fetchone():
        # Add a random suffix
        suffix = ''.join(random.choices(string.digits, k=2))
        code = code + suffix
    
    return code

def create_departments_from_scratch():
    """Create departments from scratch when department column doesn't exist"""
    # Create app with modified config
    app = create_modified_app()
    
    # Get a direct connection with proper encoding
    conn = None
    
    try:
        conn = get_direct_connection(app)
        cursor = conn.cursor()
        
        print("Starting department creation from scratch...")
        
        # Begin transaction
        conn.autocommit = False
        
        # Define default departments
        default_departments = [
            "Mathematics",
            "Science",
            "Languages",
            "Social Studies",
            "Arts",
            "Physical Education",
            "Computer Science",
            "Business Studies",
            "Religious Studies",
            "Technology"
        ]
        
        # Create departments for each default name
        department_mapping = {}
        
        for dept_name in default_departments:
            try:
                # Generate unique code
                code = generate_unique_code(cursor, dept_name)
                
                # Create the department
                cursor.execute(
                    "INSERT INTO departments (name, code, description) VALUES (%s, %s, %s) RETURNING id",
                    (dept_name, code, f"Default department: {dept_name}")
                )
                dept_id = cursor.fetchone()[0]
                department_mapping[dept_name] = dept_id
                print(f"Created department: {dept_name} with code {code} (ID: {dept_id})")
            except Exception as e:
                print(f"Error creating department {dept_name}: {e}")
                conn.rollback()
                raise
        
        # Commit all changes
        conn.commit()
        print(f"Department creation complete. Created {len(department_mapping)} departments.")
        
    except Exception as e:
        print(f"Error during department creation: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        # Close connection
        if conn:
            conn.close()

def run_with_app_context():
    """Run department creation within Flask app context"""
    app = create_modified_app()
    with app.app_context():
        from app.extensions import db
        from app.models.department import Department
        
        try:
            # Force close any existing connections in the pool
            db.engine.dispose()
            
            # Set client encoding for SQLAlchemy session
            db.session.execute(text("SET CLIENT_ENCODING TO 'UTF8'"))
            
            # Define default departments
            default_departments = [
                "Mathematics",
                "Science",
                "Languages",
                "Social Studies",
                "Arts",
                "Physical Education",
                "Computer Science",
                "Business Studies",
                "Religious Studies",
                "Technology"
            ]
            
            # Create departments for each default name
            created_count = 0
            for dept_name in default_departments:
                try:
                    # Check if department already exists
                    existing_dept = Department.query.filter_by(name=dept_name).first()
                    if existing_dept:
                        print(f"Department already exists: {dept_name}")
                        continue
                    
                    # Create a code from the first letters of each word in the name
                    words = dept_name.split()
                    code = ''.join([word[0].upper() for word in words if word])
                    if not code:
                        code = dept_name[:3].upper()
                    
                    # Check if code already exists and make it unique if needed
                    existing_code = Department.query.filter_by(code=code).first()
                    if existing_code:
                        # Add a random suffix
                        suffix = ''.join(random.choices(string.digits, k=2))
                        code = code + suffix
                    
                    # Create the department
                    department = Department(name=dept_name, code=code, description=f"Default department: {dept_name}")
                    db.session.add(department)
                    created_count += 1
                    print(f"Created department: {dept_name} with code {code}")
                except Exception as e:
                    print(f"Error creating department {dept_name}: {e}")
                    db.session.rollback()
                    raise
            
            # Commit the new departments
            db.session.commit()
            print(f"Department creation complete. Created {created_count} departments.")
            
        except Exception as e:
            print(f"Error during department creation: {e}")
            db.session.rollback()
            raise

def check_column_exists(app, table, column):
    """Check if a column exists in a table"""
    with app.app_context():
        from app.extensions import db
        inspector = inspect(db.engine)
        columns = [c['name'] for c in inspector.get_columns(table)]
        return column in columns

if __name__ == "__main__":
    app = create_modified_app()
    
    # Check if the department column still exists in the subjects table
    if check_column_exists(app, 'subjects', 'department'):
        # If it exists, run the original migration script
        print("The 'department' column still exists in the 'subjects' table. Running migration...")
        try:
            # Try both approaches - first with direct connection, then with app context if that fails
            try:
                migrate_departments()
            except Exception as e:
                print(f"Direct connection approach failed: {e}\nTrying with app context...")
                run_with_app_context()
        except Exception as e:
            print(f"Migration failed: {e}")
            sys.exit(1)
    else:
        # If the column doesn't exist, create departments from scratch
        print("The 'department' column does not exist in the 'subjects' table. Creating departments from scratch...")
        try:
            # Try both approaches - first with direct connection, then with app context if that fails
            try:
                create_departments_from_scratch()
            except Exception as e:
                print(f"Direct connection approach failed: {e}\nTrying with app context...")
                run_with_app_context()
        except Exception as e:
            print(f"Department creation failed: {e}")
            sys.exit(1)