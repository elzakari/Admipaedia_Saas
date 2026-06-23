from datetime import datetime
from app.models.parent import Parent, ParentChildSetupTask
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
    def get_parent_children(user_id, tenant_id=None):
        """Get all children linked to a parent user."""
        parent_filters = {'user_id': user_id}
        if tenant_id is not None:
            parent_filters['tenant_id'] = tenant_id

        parent = Parent.query.filter_by(**parent_filters).first()
        if not parent:
            return None, "Parent profile not found"
        
        # Depending on relationship setup (Parent <-> Student)
        # Assuming Parent has 'students' relationship or Student has 'parent_id'
        # Let's assume Student model has parent_id or many-to-many
        # For prototype, using simple query
        student_filters = {'parent_id': parent.id}
        if tenant_id is not None:
            student_filters['tenant_id'] = tenant_id

        children = Student.query.filter_by(**student_filters).all()
        return children, None

    @staticmethod
    def get_authorized_child_dashboard(user_id, student_id, tenant_id=None):
        """Aggregate dashboard data only when the requested student belongs to the parent."""
        parent_filters = {'user_id': user_id}
        if tenant_id is not None:
            parent_filters['tenant_id'] = tenant_id

        parent = Parent.query.filter_by(**parent_filters).first()
        if not parent:
            return None, "Parent profile not found", 404

        student_filters = {'id': student_id}
        if tenant_id is not None:
            student_filters['tenant_id'] = tenant_id

        student = Student.query.filter_by(**student_filters).first()
        if not student:
            return None, "Student not found", 404

        if student.parent_id != parent.id:
            return None, "You are not authorized to access this student's dashboard", 403

        data, error = ParentPortalService.get_child_dashboard(student_id)
        if error:
            return None, error, 404

        return data, None, 200

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
            .order_by(FinalGrade.computed_at.desc()).limit(5).all()

        from app.models.tenant import Tenant
        tenant = Tenant.query.get(student.tenant_id)
        currency = tenant.currency if tenant and tenant.currency else 'GHS'

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
                'currency': currency
            },
            'recent_grades': [{
                'subject': g.subject.name,
                'score': g.final_percentage,
                'grade': g.final_grade_symbol
            } for g in recent_grades]
        }, None

    @staticmethod
    def get_parent_setup_tasks(user_id, tenant_id=None):
        """Get setup tasks for a parent user."""
        parent_filters = {'user_id': user_id}
        if tenant_id is not None:
            parent_filters['tenant_id'] = tenant_id

        parent = Parent.query.filter_by(**parent_filters).first()
        if not parent:
            return None, "Parent profile not found"
            
        tasks = ParentChildSetupTask.query.filter_by(parent_id=parent.id).all()
        return tasks, None

    @staticmethod
    def complete_child_setup_task(user_id, task_id, tenant_id=None):
        """Mark a child setup task as completed for a parent user."""
        parent_filters = {'user_id': user_id}
        if tenant_id is not None:
            parent_filters['tenant_id'] = tenant_id

        parent = Parent.query.filter_by(**parent_filters).first()
        if not parent:
            return None, "Parent profile not found"
            
        task = ParentChildSetupTask.query.filter_by(id=task_id, parent_id=parent.id).first()
        if not task:
            return None, "Setup task not found or unauthorized"
            
        task.status = 'completed'
        task.completed_at = datetime.utcnow()
        try:
            db.session.commit()
            return task, None
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to complete setup task: {str(e)}"
