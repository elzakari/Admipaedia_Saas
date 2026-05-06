from app import create_app
from app.extensions import db
from sqlalchemy import inspect

app = create_app('development')
with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print("TABLES FOUND:")
    print(tables)
    
    expected = ['facilities', 'maintenance_requests', 'student_fees', 'payments', 'fee_structures']
    missing = [t for t in expected if t not in tables]
    if missing:
        print(f"MISSING TABLES: {missing}")
    else:
        print("ALL TABLES OK")
