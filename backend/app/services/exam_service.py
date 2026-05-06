from app.models.exam import Exam
from app.models.class_ import Class
from app.models.subject import Subject
from app.extensions import db
from datetime import datetime
from sqlalchemy import and_, or_
from app.services.cache_service import get_cache_service
from app.schemas.exam import ExamSchema

cache_service = get_cache_service()
exam_schema = ExamSchema()

class ExamService:
    @staticmethod
    def get_all_exams(page, per_page, class_id=None, subject_id=None, date_from=None, date_to=None, status=None):
        """Get all exams with optional filtering."""
        from sqlalchemy.orm import joinedload
        
        query = Exam.query.options(
            joinedload(Exam.class_),
            joinedload(Exam.subject),
            joinedload(Exam.creator)
        )
        
        # Apply filters if provided
        if class_id:
            query = query.filter(Exam.class_id == class_id)
        if subject_id:
            query = query.filter(Exam.subject_id == subject_id)
        if date_from:
            query = query.filter(Exam.exam_date >= date_from)
        if date_to:
            query = query.filter(Exam.exam_date <= date_to)
        if status:
            query = query.filter(Exam.status == status)
        
        # Order by exam date (upcoming exams first)
        query = query.order_by(Exam.exam_date.asc())
        
        # Paginate results
        return query.paginate(page=page, per_page=per_page, error_out=False)
    
    @staticmethod
    def get_exam_by_id(exam_id):
        """Get a specific exam by ID."""
        from sqlalchemy.orm import joinedload
        
        # Try to get DTO from cache first
        cache_key = f"exam:dto:{exam_id}"
        cached_exam = cache_service.get(cache_key)
        if cached_exam:
            return cached_exam
        
        # If not in cache, query database
        exam = Exam.query.options(
            joinedload(Exam.class_),
            joinedload(Exam.subject),
            joinedload(Exam.creator)
        ).get(exam_id)
        
        # Cache the result if found (as DTO)
        if exam:
            cache_service.set(cache_key, exam_schema.dump(exam), ttl=cache_service.SHORT_TTL)
        
        return exam
    
    @staticmethod
    def create_exam(data):
        """Create a new exam."""
        try:
            db.session.rollback()
        except Exception:
            pass
        # Verify that class and subject exist
        class_obj = Class.query.get(data['class_id'])
        subject_obj = Subject.query.get(data['subject_id'])
        
        if not class_obj:
            return None, "Class not found"
        if not subject_obj:
            return None, "Subject not found"
        
        # Create new exam
        exam = Exam(
            title=data['title'],
            description=data.get('description'),
            exam_date=data['exam_date'],
            duration=data['duration'],
            total_marks=data['total_marks'],
            passing_marks=data['passing_marks'],
            class_id=data['class_id'],
            subject_id=data['subject_id'],
            created_by=data['created_by'],
            status=data.get('status', 'scheduled')
        )
        
        try:
            db.session.add(exam)
            db.session.commit()
            cache_service.delete(f"exam:dto:{exam.id}")
            return exam, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def update_exam(exam_id, data):
        """Update an existing exam."""
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return None, "Exam not found"
        
        # Don't allow updates to completed exams
        if exam.status == 'completed':
            return None, "Cannot update a completed exam"
        
        # Update fields if provided
        if 'title' in data:
            exam.title = data['title']
        if 'description' in data:
            exam.description = data['description']
        if 'exam_date' in data:
            exam.exam_date = data['exam_date']
        if 'duration' in data:
            exam.duration = data['duration']
        if 'total_marks' in data:
            exam.total_marks = data['total_marks']
        if 'passing_marks' in data:
            exam.passing_marks = data['passing_marks']
        if 'status' in data:
            exam.status = data['status']
        
        try:
            db.session.commit()
            cache_service.delete(f"exam:dto:{exam_id}")
            return exam, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def delete_exam(exam_id, force=False):
        """Delete an exam."""
        exam = Exam.query.get(exam_id)
        
        if not exam:
            return False, "Exam not found"
        
        # Check for grades associated with this exam
        from app.models.grade import Grade
        grade_count = Grade.query.filter_by(exam_id=exam_id).count()
        
        # Don't allow deletion of completed exams with grades unless forced
        if exam.status == 'completed' and grade_count > 0 and not force:
            return False, f"Cannot delete completed exam '{exam.title}' because it has {grade_count} grade(s) associated with it. Deleting this exam will permanently remove all associated grades. If you're sure you want to proceed, use force delete."
        
        try:
            # If force delete, remove associated grades first
            if force and grade_count > 0:
                Grade.query.filter_by(exam_id=exam_id).delete()
                
            db.session.delete(exam)
            db.session.commit()
            cache_service.delete(f"exam:dto:{exam_id}")
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)
    
    @staticmethod
    def get_upcoming_exams(class_id=None, days=7):
        """Get upcoming exams within the specified number of days."""
        from datetime import timedelta
        from sqlalchemy.orm import joinedload
        
        # Create cache key based on parameters
        cache_key = f"upcoming_exams:dto:class_{class_id}:days_{days}"
        cached_exams = cache_service.get(cache_key)
        if cached_exams:
            return cached_exams
        
        now = datetime.now()
        end_date = now + timedelta(days=days)
        
        query = Exam.query.options(
            joinedload(Exam.class_),
            joinedload(Exam.subject),
            joinedload(Exam.created_by)
        ).filter(
            and_(
                Exam.exam_date >= now,
                Exam.exam_date <= end_date,
                Exam.status == 'scheduled'
            )
        )
        
        if class_id:
            query = query.filter(Exam.class_id == class_id)
        
        exams = query.order_by(Exam.exam_date.asc()).all()
        dto_list = [exam_schema.dump(e) for e in exams]
        
        # Cache the result for 5 minutes (upcoming exams change frequently)
        cache_service.set(cache_key, dto_list, ttl=cache_service.SHORT_TTL)
        
        return dto_list
    
    @staticmethod
    def get_exam_schedule(class_id=None, subject_id=None, date_from=None, date_to=None):
        """Get exam schedule with filtering options."""
        query = Exam.query
        
        if class_id:
            query = query.filter(Exam.class_id == class_id)
            
        if subject_id:
            query = query.filter(Exam.subject_id == subject_id)
            
        if date_from:
            query = query.filter(Exam.exam_date >= date_from)
            
        if date_to:
            query = query.filter(Exam.exam_date <= date_to)
            
        return query.order_by(Exam.exam_date).all()
    
    @staticmethod
    def check_exam_conflicts(class_id, exam_date, duration, exam_id=None):
        """Check for exam scheduling conflicts."""
        from datetime import timedelta
        
        # Convert exam_date to datetime if it's a string
        if isinstance(exam_date, str):
            exam_date = datetime.strptime(exam_date, '%Y-%m-%dT%H:%M:%S')
        
        # Calculate end time
        end_time = exam_date + timedelta(minutes=duration)
        
        # Find exams that overlap with the proposed time
        query = Exam.query.filter(
            Exam.class_id == class_id,
            Exam.status != 'cancelled',
            or_(
                # Exam starts during another exam
                and_(Exam.exam_date <= exam_date, (Exam.exam_date + func.interval(Exam.duration, 'minute')) >= exam_date),
                # Exam ends during another exam
                and_(Exam.exam_date <= end_time, (Exam.exam_date + func.interval(Exam.duration, 'minute')) >= end_time),
                # Exam completely contains another exam
                and_(Exam.exam_date >= exam_date, (Exam.exam_date + func.interval(Exam.duration, 'minute')) <= end_time)
            )
        )
        
        # Exclude the current exam if updating
        if exam_id:
            query = query.filter(Exam.id != exam_id)
        
        conflicts = query.all()
        return conflicts
