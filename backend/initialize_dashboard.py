from app import create_app
from app.services.dashboard_service import DashboardService
from datetime import datetime, timedelta
from app.extensions import db
from app.models.dashboard import CalendarEvent, Notification, DashboardStatistic
import uuid

app = create_app()

with app.app_context():
    # Create tables if they don't exist
    db.create_all()
    
    # Clear existing dashboard data (with error handling)
    try:
        DashboardStatistic.query.delete()
        CalendarEvent.query.delete()
        Notification.query.delete()
        db.session.commit()
    except Exception as e:
        print(f"Error clearing existing data: {e}")
        db.session.rollback()
    
    # Generate statistics based on actual database counts
    print("Generating dashboard statistics...")
    statistics = DashboardService.generate_default_statistics()
    print(f"Created {len(statistics)} statistics records")
    
    # Generate some calendar events
    print("Generating calendar events...")
    current_date = datetime.now()
    events = [
        CalendarEvent(
            id=str(uuid.uuid4()),
            title="Math Final Exam",
            date=current_date + timedelta(days=15),
            type="exam",
            description="Final examination for Mathematics"
        ),
        CalendarEvent(
            id=str(uuid.uuid4()),
            title="Parent-Teacher Meeting",
            date=current_date + timedelta(days=7),
            type="meeting",
            description="Discuss student progress with parents"
        ),
        CalendarEvent(
            id=str(uuid.uuid4()),
            title="Science Project Due",
            date=current_date + timedelta(days=10),
            type="class",
            description="Submit final science projects"
        ),
        CalendarEvent(
            id=str(uuid.uuid4()),
            title="School Holiday",
            date=current_date + timedelta(days=20),
            type="holiday",
            description="Mid-term break"
        )
    ]
    db.session.add_all(events)
    db.session.commit()
    print(f"Created {len(events)} calendar events")
    
    # Generate some notifications
    print("Generating notifications...")
    notifications = [
        Notification(
            id=str(uuid.uuid4()),
            title="New Exam Schedule",
            message="Final exams schedule has been published",
            time=datetime.now() - timedelta(hours=2),
            read=False,
            type="info"
        ),
        Notification(
            id=str(uuid.uuid4()),
            title="Attendance Alert",
            message="Student John Doe has been absent for 3 consecutive days",
            time=datetime.now() - timedelta(hours=5),
            read=True,
            type="warning"
        ),
        Notification(
            id=str(uuid.uuid4()),
            title="Fee Payment",
            message="Fee payment deadline extended to next week",
            time=datetime.now() - timedelta(days=1),
            read=False,
            type="info"
        ),
        Notification(
            id=str(uuid.uuid4()),
            title="System Update",
            message="System will be down for maintenance tonight",
            time=datetime.now() - timedelta(days=2),
            read=True,
            type="info"
        )
    ]
    db.session.add_all(notifications)
    db.session.commit()
    print(f"Created {len(notifications)} notifications")
    
    print("Dashboard data initialized successfully!")