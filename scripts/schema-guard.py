import sys
import os

# Force PostgreSQL client library and server messages to standard English ASCII to avoid decode errors on Windows locales
os.environ['LC_ALL'] = 'C'
os.environ['LC_MESSAGES'] = 'C'
os.environ['PGCLIENTENCODING'] = 'utf-8'

# Add backend to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.core.factory import create_app
from app.config import DevelopmentConfig

def check_schema():
    print("Running target-specific Schema Guard for tenant_credential_counters...")
    
    # Initialize the Flask app in testing mode so it uses a clean in-memory database
    # and doesn't run db.create_all() on start
    app = create_app('testing')
    
    # Check if a real Postgres database is configured and reachable
    db_uri = os.environ.get('DATABASE_URL') or DevelopmentConfig.SQLALCHEMY_DATABASE_URI
    
    use_postgres = False
    if db_uri and ('postgresql://' in db_uri or 'postgresql+psycopg2://' in db_uri):
        print(f"Detected PostgreSQL configuration. Testing reachability...")
        try:
            from sqlalchemy import create_engine
            # Ensure client_encoding is passed to psycopg2
            url = db_uri
            if '?' in url:
                url += '&client_encoding=utf8'
            else:
                url += '?client_encoding=utf8'
            
            # Use a short timeout/attributes to check quickly
            engine = create_engine(url, connect_args={'connect_timeout': 3})
            connection = engine.connect()
            connection.close()
            use_postgres = True
            print("PostgreSQL is reachable. Performing inspection on the live database.")
        except Exception as e:
            print(f"PostgreSQL connection test failed (expected if local server is down): {e}")
            print("Falling back to local schema model inspection.")
            
    with app.app_context():
        from app.extensions import db
        from sqlalchemy import inspect
        
        if use_postgres:
            # Inspect the real database
            from sqlalchemy import create_engine
            url = db_uri
            if '?' in url:
                url += '&client_encoding=utf8'
            else:
                url += '?client_encoding=utf8'
            engine = create_engine(url)
            inspector = inspect(engine)
            tables = inspector.get_table_names()
        else:
            # Inspect the SQLite test database / models
            # In testing config, db.create_all() is run to populate the in-memory database
            db.create_all()
            engine = db.engine
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            
        table_name = 'tenant_credential_counters'
        
        if table_name not in tables:
            print(f"❌ Table '{table_name}' does not exist in the database!")
            sys.exit(1)
            
        print(f"Table '{table_name}' exists: OK")
        
        columns = inspector.get_columns(table_name)
        col_names = {col['name']: col for col in columns}
        
        required_cols = {
            'tenant_id': 'VARCHAR',
            'year': 'INTEGER',
            'last_value': 'INTEGER'
        }
        
        for col_name, expected_type in required_cols.items():
            if col_name not in col_names:
                print(f"Column '{col_name}' is missing in '{table_name}'!")
                sys.exit(1)
            
            actual_type = str(col_names[col_name]['type']).upper()
            if expected_type not in actual_type:
                print(f"Column '{col_name}' has type {actual_type}, expected {expected_type}!")
                sys.exit(1)
                
            print(f"  - Column '{col_name}': OK ({actual_type})")
            
        # Check primary keys
        pk_constraint = inspector.get_pk_constraint(table_name)
        pk_cols = pk_constraint.get('constrained_columns', [])
        if set(pk_cols) != {'tenant_id', 'year'}:
            print(f"Composite primary key is incorrect: expected {{'tenant_id', 'year'}}, got {set(pk_cols)}")
            sys.exit(1)
            
        print("Composite primary key: OK ('tenant_id', 'year')")
        print("All Schema Guard checks passed successfully!")
        sys.exit(0)

if __name__ == '__main__':
    check_schema()
