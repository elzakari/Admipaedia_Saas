from app.models.parent import Parent
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.grading_system import FinalGrade
from app.models.finance import StudentFee
from app.extensions import db
from sqlalchemy import func
import structlog

logger = structlog.get_logger()

class ParentPortalService:
    @staticmethod
    def get_parent_children(user_id):
        """Get all children linked to a parent user."""
        parent = Parent.query.filter_by(user_id=user_id).first()
        if not parent:
            return None, "Parent profile not found"
        
        # Depending on relationship setup (Parent <-> Student)
        # Assuming Parent has 'students' relationship or Student has 'parent_id'
        # Let's assume Student model has parent_id or many-to-many
        # For prototype, using simple query
        children = Student.query.filter_by(parent_id=parent.id).all()
        return children, None

    @staticmethod
    def get_child_dashboard(student_id):
        """Aggregate data for a single child dashboard."""
        student = Student.query.get(student_id)
        if not student:
            return None, "Student not found"

        # 1. Attendance Summary (Current Term)
        attendance_stats = db.session.query(
            Attendance.status, func.count(Attendance.id)
        ).filter_by(student_id=student_id).group_by(Attendance.status).all()
        
        att_summary = {stat[0]: stat[1] for stat in attendance_stats}
        total_att = sum(att_summary.values())
        att_rate = (att_summary.get('present', 0) / total_att * 100) if total_att > 0 else 0

        # 2. Finance Summary
        total_fees = db.session.query(func.sum(StudentFee.final_amount))\
            .filter_by(student_id=student_id).scalar() or 0
        paid_fees = db.session.query(func.sum(StudentFee.paid_amount))\
            .filter_by(student_id=student_id).scalar() or 0
        outstanding = float(total_fees) - float(paid_fees)

        # 3. Recent Grades (Last 5)
        recent_grades = FinalGrade.query.filter_by(student_id=student_id)\
            .order_by(FinalGrade.created_at.desc()).limit(5).all()

        return {
            'student': {
                'id': student.id,
                'name': f"{student.first_name} {student.last_name}",
                'photo': student.profile_picture, # Assuming field exists
                'class': student.class_.name if student.class_ else 'N/A'
            },
            'attendance': {
                'rate': round(att_rate, 1),
                'summary': att_summary
            },
            'finance': {
                'outstanding': outstanding,
                'currency': 'GHS' # Configurable
            },
            'recent_grades': [{
                'subject': g.subject.name,
                'score': g.final_percentage,
                'grade': g.final_grade_symbol
            } for g in recent_grades]
        }, None
