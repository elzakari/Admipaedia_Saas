from app import create_app
from app.extensions import db
from sqlalchemy import text
import sys

app = create_app('development')
with app.app_context():
    try:
        # Check for active locks in PostgreSQL
        query = text("""
            SELECT pid, usename, pg_blocking_pids(pid) as blocked_by, query, state
            FROM pg_stat_activity
            WHERE state != 'idle' AND pid != pg_backend_pid();
        """)
        result = db.session.execute(query).fetchall()
        print("ACTIVE QUERIES AND LOCKS:")
        for row in result:
            print(row)
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)
