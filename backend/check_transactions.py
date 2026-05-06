from app import create_app
from app.extensions import db
from sqlalchemy import text
import sys

app = create_app('development')
with app.app_context():
    try:
        query = text("""
            SELECT pid, now() - xact_start AS duration, query, state
            FROM pg_stat_activity
            WHERE state != 'idle' AND xact_start IS NOT NULL
            ORDER BY duration DESC;
        """)
        result = db.session.execute(query).fetchall()
        print("LONG RUNNING TRANSACTIONS:")
        for row in result:
            print(row)
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)
