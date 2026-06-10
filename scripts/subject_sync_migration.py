import os
import sys

# Force PostgreSQL client library and server messages to standard English ASCII to avoid decode errors on Windows locales
os.environ['LC_ALL'] = 'C'
os.environ['LC_MESSAGES'] = 'C'
os.environ['PGCLIENTENCODING'] = 'utf-8'

# Add backend to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app.core.factory import create_app
from app.extensions import db
from app.models.subject import Subject
from app.models.class_ import Class
from app.models.teacher import Teacher
from app.models.associations import class_subjects
from sqlalchemy import select

def sync_subjects_to_classes():
    config_name = 'development'
    
    # Check if we can connect to PostgreSQL, otherwise fall back to testing (SQLite)
    from app.config import DevelopmentConfig
    db_uri = os.environ.get('DATABASE_URL') or DevelopmentConfig.SQLALCHEMY_DATABASE_URI
    if db_uri and ('postgresql://' in db_uri or 'postgresql+psycopg2://' in db_uri):
        from sqlalchemy import create_engine
        try:
            url = db_uri
            if '?' in url:
                url += '&client_encoding=utf8'
            else:
                url += '?client_encoding=utf8'
            engine = create_engine(url, connect_args={'connect_timeout': 3})
            connection = engine.connect()
            connection.close()
        except Exception:
            print("PostgreSQL is unreachable. Falling back to SQLite ('testing') configuration.")
            config_name = 'testing'

    app = create_app(config_name)
    with app.app_context():
        if config_name == 'testing':
            db.create_all()
        print("Starting Subject to Class-Teacher Sync Migration...")
        active_subjects = Subject.query.filter_by(is_active=True).all()
        print(f"Found {len(active_subjects)} active subjects.")
        
        linked_count = 0
        for subj in active_subjects:
            # Find all classes belonging to the same tenant (and branch, if scoped)
            classes = Class.query.filter_by(tenant_id=subj.tenant_id, status='active').all()
            for cls in classes:
                # Resolve the class primary teacher's User ID
                teacher_user_id = None
                if cls.teacher_id:
                    t = Teacher.query.get(cls.teacher_id)
                    if t and t.user_id:
                        teacher_user_id = t.user_id
                
                # Check if this mapping already exists
                stmt = select(class_subjects).where(
                    class_subjects.c.class_id == cls.id,
                    class_subjects.c.subject_id == subj.id
                )
                existing = db.session.execute(stmt).first()
                
                if not existing:
                    # Insert mapping
                    insert_stmt = class_subjects.insert().values(
                        class_id=cls.id,
                        subject_id=subj.id,
                        teacher_id=teacher_user_id
                    )
                    db.session.execute(insert_stmt)
                    linked_count += 1
        
        db.session.commit()
        print(f"Sync complete. Linked {linked_count} class-subject records.")

if __name__ == '__main__':
    sync_subjects_to_classes()
