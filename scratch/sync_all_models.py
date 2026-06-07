import sys
import os

backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, backend_path)

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

os.environ['DATABASE_URL'] = 'postgresql://postgres:Barbie198320132025@127.0.0.1:5432/admipaedia'
os.environ['FLASK_ENV'] = 'development'

from app import create_app
from app.extensions import db
from sqlalchemy import inspect, text

app = create_app('development')
with app.app_context():
    try:
        # Recreate class_subjects table first
        print("Recreating class_subjects table...")
        db.session.execute(text("DROP TABLE IF EXISTS class_subjects CASCADE;"))
        db.session.commit()
        db.session.execute(text("""
            CREATE TABLE class_subjects (
                id SERIAL PRIMARY KEY,
                class_id INT REFERENCES classes(id) ON DELETE CASCADE,
                subject_id INT REFERENCES subjects(id) ON DELETE CASCADE,
                teacher_id INT REFERENCES users(id) ON DELETE SET NULL,
                assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        db.session.commit()
        print("class_subjects table created successfully.")

        # Dynamically find missing columns for all models and add them
        inspector = inspect(db.engine)
        for table_name, table in db.metadata.tables.items():
            # Get columns in DB
            try:
                db_cols = {c['name'].lower() for c in inspector.get_columns(table_name)}
            except Exception:
                continue
            
            # Get columns in SQLAlchemy model
            for col in table.columns:
                col_name = col.name.lower()
                if col_name not in db_cols:
                    # Column is missing in DB, let's add it!
                    col_type = str(col.type)
                    # Simple mapping for common postgres types
                    if "VARCHAR" in col_type:
                        sql_type = col_type
                    elif "INTEGER" in col_type:
                        sql_type = "INTEGER"
                    elif "BOOLEAN" in col_type:
                        sql_type = "BOOLEAN DEFAULT FALSE"
                    elif "DATETIME" in col_type or "TIMESTAMP" in col_type:
                        sql_type = "TIMESTAMP"
                    elif "TEXT" in col_type:
                        sql_type = "TEXT"
                    elif "NUMERIC" in col_type:
                        sql_type = col_type
                    elif "FLOAT" in col_type:
                        sql_type = "DOUBLE PRECISION"
                    else:
                        sql_type = col_type
                    
                    alter_query = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {sql_type};"
                    try:
                        db.session.execute(text(alter_query))
                        db.session.commit()
                        print(f"Added column {col.name} ({sql_type}) to table {table_name}.")
                    except Exception as col_err:
                        db.session.rollback()
                        print(f"Failed to add column {col.name} to {table_name}: {col_err}")

        # Try to run seed data
        print("Running seed script...")
        import create_default_data
        create_default_data.create_default_data()
        print("Default data seeded successfully!")
    except Exception as e:
        db.session.rollback()
        print("Error during sync/migration:", e)
