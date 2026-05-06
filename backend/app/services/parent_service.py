from app.models.parent import Parent
from app.models.student import Student
from app.models.user import User
from app.extensions import db
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_, func
from datetime import datetime, timedelta
import logging
from app.services.cache_service import get_cache_service

logger = logging.getLogger(__name__)
cache_service = get_cache_service()

class ParentService:
    @staticmethod
    def get_all_parents(page=1, per_page=10, search='', tenant_id=None):
        """Get all parents with pagination and search"""
        try:
            from sqlalchemy.orm import joinedload
            
            query = Parent.query.options(
                joinedload(Parent.user),
                joinedload(Parent.children)
            )

            if tenant_id is not None and hasattr(Parent, 'tenant_id'):
                query = query.filter(Parent.tenant_id == tenant_id)
            
            if search:
                # Join with User table to search by name and email
                query = query.join(Parent.user).filter(
                    or_(
                        User.username.ilike(f'%{search}%'),
                        User.email.ilike(f'%{search}%'),
                        Parent.emergency_contact.ilike(f'%{search}%'),
                        Parent.address.ilike(f'%{search}%')
                    )
                )
            
            total = query.count()
            parents = query.offset((page - 1) * per_page).limit(per_page).all()
            
            return parents, total
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_all_parents: {str(e)}")
            raise

    @staticmethod
    def get_parent_by_id(parent_id):
        """Get a parent by ID"""
        try:
            from sqlalchemy.orm import joinedload
            
            # Try to get from cache first
            cache_key = f"parent:{parent_id}"
            cached_parent = cache_service.get(cache_key)
            if cached_parent:
                return cached_parent
            
            # If not in cache, query database
            parent = Parent.query.options(
                joinedload(Parent.user),
                joinedload(Parent.children)
            ).get(parent_id)
            
            # Cache the result if found
            if parent:
                cache_service.set(cache_key, parent, ttl=600)  # Cache for 10 minutes
            
            return parent
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_parent_by_id: {str(e)}")
            raise

    @staticmethod
    def get_parent_by_user_id(user_id):
        """Get a parent by user ID"""
        try:
            return Parent.query.filter_by(user_id=user_id).first()
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_parent_by_user_id: {str(e)}")
            raise

    @staticmethod
    def create_parent(data, tenant_id=None):
        """Create a new parent"""
        try:
            if tenant_id is not None and 'tenant_id' not in data and hasattr(Parent, 'tenant_id'):
                data = dict(data)
                data['tenant_id'] = tenant_id
            parent = Parent(**data)
            db.session.add(parent)
            try:
                from app.models.tenant import TenantMembership
                if tenant_id is not None and getattr(parent, 'user_id', None) is not None:
                    existing = TenantMembership.query.filter_by(user_id=parent.user_id, tenant_id=tenant_id).first()
                    if not existing:
                        db.session.add(TenantMembership(
                            tenant_id=tenant_id,
                            user_id=parent.user_id,
                            role='parent',
                            status='active'
                        ))
            except Exception:
                pass
            db.session.commit()
            return parent
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error in create_parent: {str(e)}")
            raise

    @staticmethod
    def update_parent(parent_id, data):
        """Update a parent"""
        try:
            parent = Parent.query.get(parent_id)
            if not parent:
                return None
            
            for key, value in data.items():
                setattr(parent, key, value)
            
            db.session.commit()
            return parent
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error in update_parent: {str(e)}")
            raise

    @staticmethod
    def delete_parent(parent_id):
        """Delete a parent"""
        try:
            parent = Parent.query.get(parent_id)
            if not parent:
                return False
            
            # Unlink all children before deleting to avoid FK constraint error
            Student.query.filter_by(parent_id=parent_id).update(
                {Student.parent_id: None},
                synchronize_session=False
            )
            
            db.session.delete(parent)
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error in delete_parent: {str(e)}")
            raise

    @staticmethod
    def get_children(parent_id, page=1, per_page=10):
        """Get children of a parent with pagination"""
        try:
            from sqlalchemy.orm import joinedload
            
            parent = Parent.query.get(parent_id)
            if not parent:
                return [], 0
            
            query = Student.query.options(
                joinedload(Student.user),
                joinedload(Student.class_)
            ).filter_by(parent_id=parent_id)
            total = query.count()
            children = query.offset((page - 1) * per_page).limit(per_page).all()
            
            return children, total
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_children: {str(e)}")
            raise

    @staticmethod
    def get_parent_dashboard_stats(parent_id):
        """Get dashboard statistics for a parent"""
        try:
            parent = Parent.query.get(parent_id)
            if not parent:
                return {}
            
            # Get children count
            children_count = Student.query.filter_by(parent_id=parent_id).count()
            
            # Get children list with basic info
            children = Student.query.filter_by(parent_id=parent_id).all()
            children_data = []
            
            total_attendance_rate = 0
            total_grade_average = 0
            children_with_attendance = 0
            children_with_grades = 0
            
            for child in children:
                child_summary = ParentService.get_child_summary(child.id)
                child_data = {
                    'id': child.id,
                    'name': f"{child.first_name} {child.last_name}",
                    'class_name': child.class_.name if child.class_ else None,
                    'attendance_rate': child_summary.get('attendance_rate', 0),
                    'grade_average': child_summary.get('grade_average', 0),
                    'recent_attendance': child_summary.get('recent_attendance', []),
                    'recent_grades': child_summary.get('recent_grades', [])
                }
                children_data.append(child_data)
                
                # Calculate overall stats
                if child_summary.get('attendance_rate', 0) > 0:
                    total_attendance_rate += child_summary['attendance_rate']
                    children_with_attendance += 1
                
                if child_summary.get('grade_average', 0) > 0:
                    total_grade_average += child_summary['grade_average']
                    children_with_grades += 1
            
            # Calculate averages
            avg_attendance_rate = (total_attendance_rate / children_with_attendance) if children_with_attendance > 0 else 0
            avg_grade_average = (total_grade_average / children_with_grades) if children_with_grades > 0 else 0
            
            # Get recent notifications count
            try:
                from app.models.notification import Notification
                unread_notifications = Notification.query.filter_by(
                    user_id=parent.user_id, 
                    is_read=False
                ).count()
            except ImportError:
                unread_notifications = 0
            
            return {
                'children_count': children_count,
                'children': children_data,
                'overall_attendance_rate': round(avg_attendance_rate, 2),
                'overall_grade_average': round(avg_grade_average, 2),
                'unread_notifications': unread_notifications,
                'summary': {
                    'total_children': children_count,
                    'children_with_good_attendance': len([c for c in children_data if c['attendance_rate'] >= 80]),
                    'children_with_good_grades': len([c for c in children_data if c['grade_average'] >= 70]),
                }
            }
        except Exception as e:
            logger.error(f"Error in get_parent_dashboard_stats: {str(e)}")
            return {}

    @staticmethod
    def get_child_summary(student_id):
        """Get summary data for a specific child"""
        try:
            from app.models.attendance import Attendance
            from app.models.grade import Grade
            from datetime import datetime, timedelta
            
            # Get attendance rate for the last 30 days
            thirty_days_ago = datetime.now() - timedelta(days=30)
            
            total_attendance = Attendance.query.filter(
                Attendance.student_id == student_id,
                Attendance.date >= thirty_days_ago
            ).count()
            
            present_attendance = Attendance.query.filter(
                Attendance.student_id == student_id,
                Attendance.date >= thirty_days_ago,
                Attendance.status == 'present'
            ).count()
            
            attendance_rate = (present_attendance / total_attendance * 100) if total_attendance > 0 else 0
            
            # Get recent attendance records (last 10)
            recent_attendance = Attendance.query.filter_by(student_id=student_id)\
                .order_by(Attendance.date.desc())\
                .limit(10).all()
            
            # Get grade average for current academic year
            current_year = datetime.now().year
            
            try:
                grades = Grade.query.filter_by(student_id=student_id).all()
                
                if grades:
                    total_marks = sum(grade.marks_obtained for grade in grades)
                    # Handle cases where exam might be missing
                    total_possible = sum(grade.exam.total_marks if grade.exam else 100 for grade in grades)
                    grade_average = (total_marks / total_possible * 100) if total_possible > 0 else 0
                else:
                    grade_average = 0
                
                # Get recent grades (last 10)
                recent_grades = Grade.query.filter_by(student_id=student_id)\
                    .order_by(Grade.created_at.desc())\
                    .limit(10).all()
                    
                formatted_recent_grades = [
                    {
                        'exam_title': grade.exam.title if grade.exam else 'Unknown',
                        'subject': grade.exam.subject.name if grade.exam and grade.exam.subject else 'Unknown',
                        'marks_obtained': grade.marks_obtained,
                        'total_marks': grade.exam.total_marks if grade.exam else 100,
                        'percentage': grade.percentage,
                        'grade_letter': grade.grade_letter,
                        'date': grade.created_at.isoformat()
                    } for grade in recent_grades
                ]
            except Exception as e:
                logger.warning(f"Error fetching grades for student {student_id}: {str(e)}")
                grade_average = 0
                formatted_recent_grades = []
            
            return {
                'attendance_rate': round(attendance_rate, 2),
                'grade_average': round(grade_average, 2),
                'recent_attendance': [
                    {
                        'date': att.date.isoformat(),
                        'status': att.status,
                        'subject': att.subject.name if att.subject else None
                    } for att in recent_attendance
                ],
                'recent_grades': formatted_recent_grades
            }
        except Exception as e:
            logger.error(f"Error in get_child_summary: {str(e)}")
            return {
                'attendance_rate': 0,
                'grade_average': 0,
                'recent_attendance': [],
                'recent_grades': []
            }
