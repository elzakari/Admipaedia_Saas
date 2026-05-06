import os
import sys
from typing import Iterable, List, Set

from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.extensions import db


KEEP_TABLES: Set[str] = {
    "alembic_version",
    "users",
    "roles",
    "user_roles",
    "user_role_assignments_detailed",
    "tenants",
    "tenant_memberships",
    "tenant_invitations",
    "subscriptions",
    "platform_invoices",
    "platform_payments",
    "platform_audit_log",
    "supported_languages",
    "country_configs",
    "educational_system_templates",
}


def _chunk(items: List[str], size: int) -> Iterable[List[str]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def purge():
    app = create_app(os.environ.get("FLASK_ENV", "development"))
    with app.app_context():
        confirm = (os.environ.get("ADMIPAEDIA_PURGE_DEMO") or "").strip().upper()
        if confirm != "YES":
            raise RuntimeError("Set ADMIPAEDIA_PURGE_DEMO=YES to run purge.")

        dialect = db.engine.dialect.name
        if dialect != "postgresql":
            raise RuntimeError(f"Unsupported DB dialect for purge: {dialect}")

        tables = db.session.execute(
            text(
                """
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name
                """
            )
        ).fetchall()
        table_names = [r[0] for r in tables if r and r[0]]

        truncatables = [t for t in table_names if t not in KEEP_TABLES]
        for batch in _chunk(truncatables, 40):
            fq = ", ".join([f'public."{t}"' for t in batch])
            db.session.execute(text(f"TRUNCATE TABLE {fq} RESTART IDENTITY CASCADE"))

        db.session.execute(
            text(
                """
DELETE FROM public.tenant_invitations
WHERE email ILIKE 'teacher%@admipaedia.com'
   OR email ILIKE 'student%@admipaedia.com'
   OR email ILIKE 'parent%@example.com'
                """
            )
        )

        db.session.execute(
            text(
                """
DELETE FROM public.tenant_memberships
WHERE user_id IN (
  SELECT id FROM users WHERE role IN ('teacher','student','parent')
)
                """
            )
        )

        db.session.execute(
            text("DELETE FROM users WHERE role IN ('teacher','student','parent')")
        )

        db.session.execute(
            text(
                """
DELETE FROM users u
WHERE u.role NOT IN ('admin','super_admin')
  AND NOT EXISTS (SELECT 1 FROM public.tenant_memberships m WHERE m.user_id = u.id)
                """
            )
        )

        db.session.execute(
            text(
                """
DELETE FROM public.tenants
WHERE slug = 'legacy-school'
  AND NOT EXISTS (SELECT 1 FROM public.tenant_memberships m WHERE m.tenant_id = public.tenants.id)
  AND NOT EXISTS (SELECT 1 FROM public.platform_invoices i WHERE i.tenant_id = public.tenants.id)
  AND NOT EXISTS (SELECT 1 FROM public.platform_payments p WHERE p.tenant_id = public.tenants.id)
                """
            )
        )

        db.session.commit()


if __name__ == "__main__":
    purge()
