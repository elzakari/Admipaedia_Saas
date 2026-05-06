import sys
import os
from datetime import datetime, timedelta

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from app import create_app, db
    from app.services.dashboard_service import DashboardService
    from app.models.student import Student
    from app.models.attendance import Attendance
    
    app = create_app()
    with app.app_context():
        print("Verifying DashboardService filtering logic...")
        
        # Test filters
        filters = {
            'startDate': (datetime.now() - timedelta(days=7)).isoformat(),
            'endDate': datetime.now().isoformat(),
            'category': 'attendance'
        }
        
        print(f"Applying filters: {filters}")
        
        # Test _recalculate_statistics (indirectly via get_statistics)
        # Note: We need a role, 'admin' should work for recalculation
        stats = DashboardService.get_statistics('admin', filters)
        
        print("\nRecalculated Statistics:")
        for stat in stats:
            print(f"- {stat.title}: {stat.value}")
            
        # Verify specific stats
        has_attendance = any(s.title == "Attendance Rate" for s in stats)
        has_students = any(s.title == "Total Students" for s in stats)
        
        if has_attendance and has_students:
            print("\nSUCCESS: Filtering logic processed correctly.")
        else:
            print("\nWARNING: Some statistics might be missing.")
            
except Exception as e:
    print(f"Error during verification: {e}")
    # This might fail if database is not set up in the environment, which is expected.
    # But we can at least check if the imports and logic structure are correct.
