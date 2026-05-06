import structlog
import os
from app.extensions import db, bcrypt
from app.models.user import User, Role
from app.models.parent import Parent
from sqlalchemy import text

logger = structlog.get_logger()

def init_db():
    """Initialize database with default roles and admin user."""
    # Create default roles if they don't exist
    roles = ['super_admin', 'admin', 'teacher', 'student', 'parent', 'user']
    for role_name in roles:
        if not Role.query.filter_by(name=role_name).first():
            role = Role(name=role_name, description=f"{role_name} role")
            db.session.add(role)
            logger.info(f"Created role: {role_name}")
    
    admin_email = 'admin@admipaedia.com'
    admin_password = 'Admin@123'
    admin_user = User.query.filter_by(email=admin_email).first()
    if not admin_user:
        admin_user = User(
            username='admin',
            email=admin_email,
            password_hash=bcrypt.generate_password_hash(admin_password).decode('utf-8'),
            role='admin',
            status='active'
        )
        db.session.add(admin_user)
        logger.info("Created admin user")
    else:
        changed = False
        if getattr(admin_user, 'role', None) != 'admin':
            admin_user.role = 'admin'
            changed = True
        if getattr(admin_user, 'status', None) != 'active':
            admin_user.status = 'active'
            changed = True
        if not admin_user.check_password_hash(admin_password):
            admin_user.set_password_hash(admin_password)
            changed = True
        if changed:
            logger.info("Updated admin user")
    
    # Commit changes
    db.session.commit()

    super_admin_email = 'superadmin@admipaedia.com'
    super_admin_seed_password = os.environ.get('SUPERADMIN_SEED_PASSWORD')
    super_admin_user = User.query.filter_by(email=super_admin_email).first()
    if not super_admin_user:
        super_admin_password = super_admin_seed_password or 'SuperAdmin@123'
        super_admin_user = User(
            username='superadmin',
            email=super_admin_email,
            password_hash=bcrypt.generate_password_hash(super_admin_password).decode('utf-8'),
            role='super_admin',
            status='active'
        )
        db.session.add(super_admin_user)
        logger.info("Created super admin user")
    else:
        changed = False
        if getattr(super_admin_user, 'role', None) != 'super_admin':
            super_admin_user.role = 'super_admin'
            changed = True
        if getattr(super_admin_user, 'status', None) != 'active':
            super_admin_user.status = 'active'
            changed = True
        if super_admin_seed_password and not super_admin_user.check_password_hash(super_admin_seed_password):
            super_admin_user.set_password_hash(super_admin_seed_password)
            changed = True
        if changed:
            logger.info("Updated super admin user")

    db.session.commit()

    parent_users = User.query.filter_by(role='parent').all()
    for u in parent_users:
        if not Parent.query.filter_by(user_id=u.id).first():
            db.session.add(Parent(user_id=u.id))

    db.session.commit()
    logger.info("Database initialized with default data")

    _ensure_announcements_schema()


def _ensure_announcements_schema():
    try:
        engine = db.engine
        dialect = engine.dialect.name
        if dialect == 'sqlite':
            cols = db.session.execute(text("PRAGMA table_info(announcements)")).fetchall()
            existing = {c[1] for c in cols}
            statements = []
            if 'target_roles' not in existing:
                statements.append("ALTER TABLE announcements ADD COLUMN target_roles VARCHAR(255)")
            if 'scheduled_date' not in existing:
                statements.append("ALTER TABLE announcements ADD COLUMN scheduled_date DATETIME")
            if 'is_published' not in existing:
                statements.append("ALTER TABLE announcements ADD COLUMN is_published BOOLEAN DEFAULT 1")
            for stmt in statements:
                try:
                    db.session.execute(text(stmt))
                except Exception:
                    pass
            if statements:
                db.session.commit()
        else:
            db.session.execute(text("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_roles VARCHAR(255)"))
            db.session.execute(text("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP"))
            db.session.execute(text("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE"))
            db.session.commit()
    except Exception:
        try:
            db.session.rollback()
        except Exception:
            pass
