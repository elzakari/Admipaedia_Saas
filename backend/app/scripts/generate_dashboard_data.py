from datetime import datetime, timedelta
import uuid
from app.extensions import db
from app.models.dashboard import DashboardStatistic, CalendarEvent, Notification

def generate_dashboard_data():
    """Generate initial dashboard data for testing."""
    # Generate statistics
    statistics = [
        DashboardStatistic(
            id=str(uuid.uuid4()),
            title="Total Students",
            value="1250",
            change_value=12.0,
            change_is_positive=True,
            color="primary"
        ),
        DashboardStatistic(
            id=str(uuid.uuid4()),
            title="Attendance Rate",
            value="94%",
            change_value=2.0,
            change_is_positive=True,
            color="success"
        ),
        DashboardStatistic(
            id=str(uuid.uuid4()),
            title="Average Grade",
            value="B+",
            change_value=5.0,
            change_is_positive=True,
            color="primary"
        ),
        DashboardStatistic(
            id=str(uuid.uuid4()),
            title="Pending Tasks",
            value="15",
            change_value=10.0,
            change_is_positive=False,
            color="warning"
        )
    ]
    
    # Generate calendar events
    now = datetime.utcnow()
    current_month = now.month - 1  # JS months are 0-indexed
    current_year = now.year
    
    events = [
        CalendarEvent(
            id=str(uuid.uuid4()),
            title="Math Final Exam",
            date=datetime(current_year, current_month + 1, 15),
            type="exam",
            description="Final examination for Mathematics"
        ),
        CalendarEvent(
            id=str(uuid.uuid4()),
            title="Parent-Teacher Meeting",
            date=datetime(current_year, current_month + 1, 20),
            type="meeting",
            description="Annual parent-teacher conference"
        ),
        CalendarEvent(
            id=str(uuid.uuid4()),
            title="Science Project Due",
            date=datetime(current_year, current_month + 1, 25),
            type="class",
            description="Submit final science project"
        ),
        CalendarEvent(
            id=str(uuid.uuid4()),
            title="School Holiday",
            date=datetime(current_year, current_month + 1, 5),
            type="holiday",
            description="National holiday - school closed"
        )
    ]
    
    # Generate notifications
    notifications = [
        Notification(
            id=str(uuid.uuid4()),
            title="New Exam Schedule",
            message="Final exams schedule has been published",
            time=now - timedelta(hours=2),
            read=False,
            type="info"
        ),
        Notification(
            id=str(uuid.uuid4()),
            title="Attendance Alert",
            message="Student John Doe has been absent for 3 consecutive days",
            time=now - timedelta(hours=5),
            read=True,
            type="warning"
        ),
        Notification(
            id=str(uuid.uuid4()),
            title="Fee Payment",
            message="Fee payment deadline extended to next week",
            time=now - timedelta(days=1),
            read=False,
            type="info"
        ),
        Notification(
            id=str(uuid.uuid4()),
            title="System Update",
            message="System will be down for maintenance tonight",
            time=now - timedelta(days=2),
            read=True,
            type="info"
        )
    ]
    
    # Add all to database
    db.session.add_all(statistics)
    db.session.add_all(events)
    db.session.add_all(notifications)
    db.session.commit()
    
    print("Dashboard data generated successfully!")

if __name__ == "__main__":
    from app import create_app
    app = create_app()
    with app.app_context():
        generate_dashboard_data()