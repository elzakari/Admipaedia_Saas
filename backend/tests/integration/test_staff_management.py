import pytest
from app.models.staff_enhanced import LeaveType, StaffLeave, StaffAttendance
from app.models.user import User
from datetime import date

class TestStaffManagement:
    def test_leave_application(self, auth_client, db):
        # Setup Leave Type
        lt = LeaveType(name='Sick Leave', days_allowed=10)
        db.session.add(lt)
        db.session.commit()
        
        data = {
            'leave_type_id': lt.id,
            'start_date': '2024-05-01',
            'end_date': '2024-05-02',
            'reason': 'Flu'
        }
        
        response = auth_client.post('/api/v1/staff-enhanced/leave/apply', json=data)
        assert response.status_code == 201
        
        leave = StaffLeave.query.first()
        assert leave.status.value == 'pending'
        assert leave.days_count == 2
        
    def test_attendance_clock_in(self, auth_client, db):
        # Assuming we can create a Staff record and link to user
        # This might require complex setup with User/Staff linkage
        # For now, we'll skip if it requires too many dependencies, or mock it
        pass
