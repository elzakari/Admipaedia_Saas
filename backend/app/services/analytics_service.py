# Create a new service for advanced analytics
from sqlalchemy import func, and_, or_, desc
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.assignment import Assignment
from app.models.assignment_submission import AssignmentSubmission
from app.extensions import db
from app.services.cache_service import CacheService

class AnalyticsService:
    """Service for advanced analytics operations."""
    
    @staticmethod
    def get_teacher_dashboard_analytics(teacher_id):
        """Generate comprehensive analytics for teacher dashboard."""
        try:
            # Try to get from cache first
            cache_key = f"teacher_dashboard_analytics:{teacher_id}"
            cached_analytics = cache_service.get(cache_key)
            if cached_analytics:
                return cached_analytics, None
            
            # Get classes taught by the teacher
            from app.models.class_ import Class
            from app.models.teacher import Teacher
            
            teacher = Teacher.query.get(teacher_id)
            if not teacher:
                return None, "Teacher not found"
                
            classes = Class.query.filter(Class.teacher_id == teacher_id).all()
            class_ids = [c.id for c in classes]
            
            if not class_ids:
                empty_result = {
                    "attendance": {},
                    "performance": {},
                    "assignments": {},
                    "students_at_risk": []
                }
                # Cache empty result for shorter time
                cache_service.set(cache_key, empty_result, ttl=300)
                return empty_result, None
            
            # Get attendance statistics
            attendance_stats = AnalyticsService._get_attendance_analytics(class_ids)
            
            # Get performance statistics
            performance_stats = AnalyticsService._get_performance_analytics(class_ids)
            
            # Get assignment statistics
            assignment_stats = AnalyticsService._get_assignment_analytics(class_ids, teacher_id)
            
            # Get at-risk students
            at_risk_students = AnalyticsService._get_at_risk_students(class_ids)
            
            result = {
                "attendance": attendance_stats,
                "performance": performance_stats,
                "assignments": assignment_stats,
                "students_at_risk": at_risk_students
            }
            
            # Cache the result for 10 minutes (analytics data changes frequently)
            cache_service.set(cache_key, result, ttl=600)
            
            return result, None
        except Exception as e:
            return None, str(e)
    
    @staticmethod
    def _get_attendance_analytics(class_ids):
        """Generate attendance analytics for classes."""
        # Calculate attendance statistics for the given classes
        try:
            # Get total attendance records
            total_records = Attendance.query.filter(Attendance.class_id.in_(class_ids)).count()
            
            # Get attendance by status
            attendance_by_status = db.session.query(
                Attendance.status, 
                func.count(Attendance.id).label('count')
            ).filter(
                Attendance.class_id.in_(class_ids)
            ).group_by(Attendance.status).all()
            
            # Calculate attendance rate
            present_count = sum(count for status, count in attendance_by_status if status == 'present')
            attendance_rate = round((present_count / total_records * 100) if total_records > 0 else 0)
            
            # Get attendance trend (last 30 days)
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            attendance_trend = db.session.query(
                func.date(Attendance.date).label('date'),
                Attendance.status,
                func.count(Attendance.id).label('count')
            ).filter(
                Attendance.class_id.in_(class_ids),
                Attendance.date >= thirty_days_ago
            ).group_by(
                func.date(Attendance.date),
                Attendance.status
            ).order_by(func.date(Attendance.date)).all()
            
            # Format trend data
            trend_data = {}
            for date, status, count in attendance_trend:
                date_str = date.strftime('%Y-%m-%d')
                if date_str not in trend_data:
                    trend_data[date_str] = {'present': 0, 'absent': 0, 'late': 0, 'excused': 0}
                trend_data[date_str][status] = count
            
            return {
                'rate': attendance_rate,
                'by_status': dict(attendance_by_status),
                'trend': trend_data,
                'total_records': total_records
            }
        except Exception as e:
            return {'error': str(e)}
    
    @staticmethod
    def _get_performance_analytics(class_ids):
        """Generate performance analytics for classes."""
        try:
            # Get average grades
            avg_grade = db.session.query(func.avg(Grade.percentage).label('avg_percentage'))\
                .filter(Grade.class_id.in_(class_ids)).scalar() or 0
            
            # Get grade distribution
            grade_distribution = db.session.query(
                Grade.grade_letter,
                func.count(Grade.id).label('count')
            ).filter(
                Grade.class_id.in_(class_ids)
            ).group_by(Grade.grade_letter).all()
            
            # Get performance trend (by term/assessment)
            performance_trend = db.session.query(
                Grade.term,
                Grade.assessment_type,
                func.avg(Grade.percentage).label('avg_percentage')
            ).filter(
                Grade.class_id.in_(class_ids)
            ).group_by(
                Grade.term,
                Grade.assessment_type
            ).all()
            
            # Format trend data
            trend_data = {}
            for term, assessment_type, avg_percentage in performance_trend:
                if term not in trend_data:
                    trend_data[term] = {}
                trend_data[term][assessment_type] = round(avg_percentage, 2)
            
            return {
                'average_grade': round(avg_grade, 2),
                'grade_distribution': dict(grade_distribution),
                'trend': trend_data
            }
        except Exception as e:
            return {'error': str(e)}
    
    @staticmethod
    def _get_assignment_analytics(class_ids, teacher_id):
        """Generate assignment analytics for classes."""
        try:
            # Get total assignments
            total_assignments = Assignment.query.filter(
                Assignment.class_id.in_(class_ids),
                Assignment.teacher_id == teacher_id
            ).count()
            
            # Get pending assignments (due date in future)
            now = datetime.utcnow()
            pending_assignments = Assignment.query.filter(
                Assignment.class_id.in_(class_ids),
                Assignment.teacher_id == teacher_id,
                Assignment.due_date > now
            ).count()
            
            # Get assignment submission stats
            submission_stats = db.session.query(
                Assignment.id,
                Assignment.title,
                func.count(AssignmentSubmission.id).label('submission_count'),
                func.avg(AssignmentSubmission.score).label('avg_score')
            ).outerjoin(
                AssignmentSubmission, 
                Assignment.id == AssignmentSubmission.assignment_id
            ).filter(
                Assignment.class_id.in_(class_ids),
                Assignment.teacher_id == teacher_id
            ).group_by(
                Assignment.id,
                Assignment.title
            ).all()
            
            # Format submission stats
            formatted_stats = [{
                'assignment_id': assignment_id,
                'title': title,
                'submission_count': submission_count,
                'average_score': round(avg_score, 2) if avg_score else 0
            } for assignment_id, title, submission_count, avg_score in submission_stats]
            
            return {
                'total': total_assignments,
                'pending': pending_assignments,
                'submission_stats': formatted_stats
            }
        except Exception as e:
            return {'error': str(e)}
    
    @staticmethod
    def _get_at_risk_students(class_ids):
        """Identify at-risk students based on attendance and performance."""
        try:
            # Define risk thresholds
            attendance_threshold = 70  # Below 70% attendance is at risk
            grade_threshold = 60       # Below 60% average grade is at risk
            
            # Get students with low attendance
            students_with_attendance = db.session.query(
                Attendance.student_id,
                func.count(Attendance.id).label('total_records'),
                func.sum(case([(Attendance.status == 'present', 1)], else_=0)).label('present_count')
            ).filter(
                Attendance.class_id.in_(class_ids)
            ).group_by(Attendance.student_id).all()
            
            # Calculate attendance rates and find at-risk students
            attendance_risk_students = []
            for student_id, total, present in students_with_attendance:
                attendance_rate = (present / total * 100) if total > 0 else 0
                if attendance_rate < attendance_threshold:
                    attendance_risk_students.append((student_id, attendance_rate))
            
            # Get students with low grades
            students_with_grades = db.session.query(
                Grade.student_id,
                func.avg(Grade.percentage).label('avg_grade')
            ).filter(
                Grade.class_id.in_(class_ids)
            ).group_by(Grade.student_id).all()
            
            # Find grade at-risk students
            grade_risk_students = []
            for student_id, avg_grade in students_with_grades:
                if avg_grade < grade_threshold:
                    grade_risk_students.append((student_id, avg_grade))
            
            # Combine risk factors
            at_risk_map = {}
            for student_id, attendance_rate in attendance_risk_students:
                if student_id not in at_risk_map:
                    at_risk_map[student_id] = {'risk_factors': []}
                at_risk_map[student_id]['risk_factors'].append(f'Low attendance ({round(attendance_rate)}%)')
            
            for student_id, avg_grade in grade_risk_students:
                if student_id not in at_risk_map:
                    at_risk_map[student_id] = {'risk_factors': []}
                at_risk_map[student_id]['risk_factors'].append(f'Low grades ({round(avg_grade)}%)')
            
            # Get student details for at-risk students
            student_ids = list(at_risk_map.keys())
            if student_ids:
                from sqlalchemy.orm import joinedload
                students = Student.query.options(
                    joinedload(Student.user),
                    joinedload(Student.class_)
                ).filter(Student.id.in_(student_ids)).all()
                for student in students:
                    at_risk_map[student.id]['id'] = student.id
                    at_risk_map[student.id]['name'] = f"{student.first_name} {student.last_name}"
            
            # Convert map to list
            at_risk_students = list(at_risk_map.values())
            
            return at_risk_students
        except Exception as e:
            return {'error': str(e)}