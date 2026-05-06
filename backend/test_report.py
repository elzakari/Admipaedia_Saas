from app import create_app
from app.services.report_service import ReportService
import sys
from datetime import date

app = create_app('development')
with app.app_context():
    try:
        start_date = date(2026, 1, 1)
        end_date = date(2026, 4, 13)
        data = ReportService.get_administrative_report_data(start_date, end_date)
        print("SUCCESS")
        print(data)
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
