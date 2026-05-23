import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load env variables from root .env
load_dotenv()

def run_migration():
    """Migrate database to support department budgets"""
    db_url = os.environ.get('DATABASE_URL')
    
    if not db_url:
        print("DATABASE_URL is not set in environment or .env!", file=sys.stderr)
        sys.exit(1)
        
    conn = None
    try:
        print("Connecting to database...")
        conn = psycopg2.connect(db_url)
        conn.autocommit = False
        cursor = conn.cursor()
        
        # 1. Add allocated_budget column on departments table if not exists
        print("Adding 'allocated_budget' column to 'departments' table...")
        cursor.execute(
            "ALTER TABLE departments ADD COLUMN IF NOT EXISTS allocated_budget DOUBLE PRECISION DEFAULT 0.0;"
        )
        
        # 2. Seed realistic budget values for standard default departments
        print("Seeding default department budgets...")
        budgets_map = {
            'science': 45000.0,
            'mathematics': 38000.0,
            'languages': 42000.0,
            'social studies': 35000.0,
            'arts': 28000.0,
            'physical education': 15000.0,
            'computer science': 25000.0,
            'business studies': 20000.0,
            'religious studies': 10000.0,
            'technology': 30000.0
        }
        
        for dept_name, budget in budgets_map.items():
            cursor.execute(
                "UPDATE departments SET allocated_budget = %s WHERE LOWER(name) = %s AND (allocated_budget IS NULL OR allocated_budget = 0.0);",
                (budget, dept_name)
            )
        
        # Set all remaining or NULL budgets to a safe fallback
        cursor.execute(
            "UPDATE departments SET allocated_budget = 15000.0 WHERE allocated_budget IS NULL OR allocated_budget = 0.0;"
        )
        
        # Commit transaction
        conn.commit()
        print("Database schema migration for department budgets completed successfully!")
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Migration aborted and rolled back due to error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migration()
