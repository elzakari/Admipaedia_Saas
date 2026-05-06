from app import create_app
from app.extensions import db
from sqlalchemy import text, inspect
from app.services.dashboard_service import DashboardService

def fix_dashboard_db():
    app = create_app()
    with app.app_context():
        engine = db.engine
        inspector = inspect(engine)
        
        print("Checking 'dashboard_statistics' table...")
        if 'dashboard_statistics' in inspector.get_table_names():
            columns = [c['name'] for c in inspector.get_columns('dashboard_statistics')]
            
            if 'icon' not in columns:
                print("Adding column 'icon' to 'dashboard_statistics' table...")
                try:
                    db.session.execute(text("ALTER TABLE dashboard_statistics ADD COLUMN icon VARCHAR(50)"))
                    db.session.commit()
                except Exception as e:
                    print(f"Error adding icon column: {e}")
                    db.session.rollback()
            
            # Check if we have any statistics, if not generate them
            count = db.session.execute(text("SELECT count(*) FROM dashboard_statistics")).scalar()
            if count == 0:
                print("Generating default statistics...")
                DashboardService.generate_default_statistics()
        else:
            print("'dashboard_statistics' table does not exist. Creating all tables...")
            db.create_all()
            print("Generating default statistics...")
            DashboardService.generate_default_statistics()

        print("Database check and fix completed.")

if __name__ == "__main__":
    fix_dashboard_db()
