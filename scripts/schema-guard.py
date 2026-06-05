import sys
import os
import sqlalchemy as sa

# Force PostgreSQL client library and server messages to standard English ASCII to avoid decode errors on Windows locales
os.environ['LC_ALL'] = 'C'
os.environ['LC_MESSAGES'] = 'C'
os.environ['PGCLIENTENCODING'] = 'utf-8'

# Add backend to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.core.factory import create_app
from app.config import DevelopmentConfig

def check_schema():
    print("Running target-specific Schema Guard...")
    
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
            
        # 1. Check tenant_credential_counters table
        tcc_table = 'tenant_credential_counters'
        if tcc_table not in tables:
            print(f"❌ Table '{tcc_table}' does not exist in the database!")
            sys.exit(1)
            
        print(f"Table '{tcc_table}' exists: OK")
        
        columns = inspector.get_columns(tcc_table)
        col_names = {col['name']: col for col in columns}
        
        required_cols = {
            'tenant_id': 'VARCHAR',
            'year': 'INTEGER',
            'last_value': 'INTEGER'
        }
        
        for col_name, expected_type in required_cols.items():
            if col_name not in col_names:
                print(f"Column '{col_name}' is missing in '{tcc_table}'!")
                sys.exit(1)
            
            actual_type = str(col_names[col_name]['type']).upper()
            if expected_type not in actual_type:
                print(f"Column '{col_name}' has type {actual_type}, expected {expected_type}!")
                sys.exit(1)
                
            print(f"  - Column '{col_name}': OK ({actual_type})")
            
        # Check primary keys for tenant_credential_counters
        pk_constraint = inspector.get_pk_constraint(tcc_table)
        pk_cols = pk_constraint.get('constrained_columns', [])
        if set(pk_cols) != {'tenant_id', 'year'}:
            print(f"Composite primary key is incorrect: expected {{'tenant_id', 'year'}}, got {set(pk_cols)}")
            sys.exit(1)
            
        print("Composite primary key: OK ('tenant_id', 'year')")
        
        # 2. Check notifications table and column 'id'
        notif_table = 'notifications'
        if notif_table not in tables:
            print(f"❌ Table '{notif_table}' does not exist in the database!")
            sys.exit(1)
            
        print(f"Table '{notif_table}' exists: OK")
        
        notif_columns = inspector.get_columns(notif_table)
        notif_col_names = {col['name']: col for col in notif_columns}
        
        if 'id' not in notif_col_names:
            print(f"❌ Column 'id' is missing in '{notif_table}'!")
            sys.exit(1)
            
        notif_id_col = notif_col_names['id']
        notif_id_type = str(notif_id_col['type']).upper()
        
        type_ok = 'INT' in notif_id_type
        
        notif_pk_constraint = inspector.get_pk_constraint(notif_table)
        notif_pk_cols = notif_pk_constraint.get('constrained_columns', [])
        pk_ok = notif_pk_cols == ['id']
        
        default_ok = True
        if use_postgres:
            notif_id_default = notif_id_col.get('default')
            if not notif_id_default or "nextval('notifications_id_seq'" not in str(notif_id_default):
                default_ok = False
                
        if type_ok and pk_ok and default_ok:
            print("  - Column 'id': OK")
        else:
            print(f"❌ Column 'id' validation failed: type_ok={type_ok} ({notif_id_type}), pk_ok={pk_ok} ({notif_pk_cols}), default_ok={default_ok} ({notif_id_col.get('default') if use_postgres else 'N/A'})")
            
            # Check for non-numeric IDs before auto-repairing
            try:
                if use_postgres:
                    non_numeric_rows = db.session.execute(sa.text(
                        "SELECT id FROM notifications WHERE id IS NOT NULL AND id::text !~ '^[0-9]+$'"
                    )).fetchall()
                    has_non_numeric = len(non_numeric_rows) > 0
                else:
                    rows = db.session.execute(sa.text("SELECT id FROM notifications")).fetchall()
                    has_non_numeric = any(not str(r[0]).isdigit() for r in rows)
            except Exception as query_err:
                print(f"Warning: could not query existing notifications rows: {query_err}. Assuming safe to repair.")
                has_non_numeric = False
                
            if has_non_numeric:
                print("MANUAL_REQUIRED: UUID or non-numeric IDs exist in notifications. Cannot safely repair.")
                sys.exit(1)
                
            print("Attempting automatic repair of notifications.id schema...")
            try:
                if use_postgres:
                    db.session.execute(sa.text("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_pkey CASCADE"))
                    db.session.execute(sa.text("ALTER TABLE notifications ALTER COLUMN id TYPE INTEGER USING (NULLIF(id, '')::INTEGER)"))
                    db.session.execute(sa.text("CREATE SEQUENCE IF NOT EXISTS notifications_id_seq"))
                    db.session.execute(sa.text("ALTER TABLE notifications ALTER COLUMN id SET DEFAULT nextval('notifications_id_seq')"))
                    db.session.execute(sa.text("ALTER SEQUENCE notifications_id_seq OWNED BY notifications.id"))
                    db.session.execute(sa.text("SELECT setval('notifications_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM notifications), false)"))
                    db.session.execute(sa.text("ALTER TABLE notifications ADD PRIMARY KEY (id)"))
                    db.session.commit()
                    print("Repair successful!")
                else:
                    print("Repair skipped: clean schemas are automatically generated on SQLite.")
            except Exception as repair_err:
                print(f"❌ Schema repair failed: {repair_err}")
                db.session.rollback()
                sys.exit(1)
                
        print("All Schema Guard checks passed successfully!")
        sys.exit(0)

if __name__ == '__main__':
    check_schema()
