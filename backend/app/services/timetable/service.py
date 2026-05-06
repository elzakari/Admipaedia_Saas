from app.extensions import db
from app.models.timetable import TimetableSlot, Period
from app.models.class_ import Class
from app.models.teacher import Teacher
import structlog
from sqlalchemy import and_

logger = structlog.get_logger()

class TimetableService:
    @staticmethod
    def create_period(data):
        """Create a time slot definition."""
        try:
            period = Period(**data)
            db.session.add(period)
            db.session.commit()
            return period, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def get_periods():
        """Get all periods ordered by index."""
        return Period.query.order_by(Period.order_index).all()

    @staticmethod
    def create_slot(data):
        """Create a timetable slot with conflict checking."""
        # 1. Check for Class Conflict (Class already booked at this time)
        class_conflict = TimetableSlot.query.filter_by(
            class_id=data['class_id'],
            day_of_week=data['day_of_week'],
            period_id=data['period_id'],
            term=data['term'],
            academic_year=data['academic_year']
        ).first()
        
        if class_conflict:
            return None, f"Class already has a lesson at this time ({class_conflict.subject.name})"

        # 2. Check for Teacher Conflict (Teacher already teaching elsewhere)
        teacher_conflict = TimetableSlot.query.filter_by(
            teacher_id=data['teacher_id'],
            day_of_week=data['day_of_week'],
            period_id=data['period_id'],
            term=data['term'],
            academic_year=data['academic_year']
        ).first()
        
        if teacher_conflict:
            return None, f"Teacher is already teaching {teacher_conflict.class_.name} at this time"

        try:
            slot = TimetableSlot(**data)
            db.session.add(slot)
            db.session.commit()
            return slot, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def get_class_timetable(class_id, term, academic_year):
        """Get weekly timetable for a class."""
        slots = TimetableSlot.query.filter_by(
            class_id=class_id,
            term=term,
            academic_year=academic_year
        ).all()
        
        # Structure: {Day: {PeriodID: {Subject, Teacher}}}
        timetable = {}
        for slot in slots:
            if slot.day_of_week not in timetable:
                timetable[slot.day_of_week] = {}
            
            timetable[slot.day_of_week][slot.period_id] = {
                'id': slot.id,
                'subject': slot.subject.name,
                'teacher': f"{slot.teacher.user.first_name} {slot.teacher.user.last_name}",
                'room': slot.room_id,
                'start_time': str(slot.period.start_time),
                'end_time': str(slot.period.end_time)
            }
        return timetable, None

    @staticmethod
    def get_all_slots(filters=None):
        """Get all timetable slots with optional filtering."""
        query = TimetableSlot.query
        if filters:
            if filters.get('academic_year'):
                query = query.filter_by(academic_year=filters['academic_year'])
            if filters.get('term'):
                query = query.filter_by(term=filters['term'])
            if filters.get('class_id'):
                query = query.filter_by(class_id=filters['class_id'])
            if filters.get('teacher_id'):
                query = query.filter_by(teacher_id=filters['teacher_id'])
        
        slots = query.all()
        return [{
            'id': slot.id,
            'day_of_week': slot.day_of_week,
            'period_id': slot.period_id,
            'start_time': str(slot.period.start_time),
            'end_time': str(slot.period.end_time),
            'subject_id': slot.subject_id,
            'subject_name': slot.subject.name,
            'class_id': slot.class_id,
            'class_name': slot.class_.name,
            'teacher_id': slot.teacher_id,
            'teacher_name': f"{slot.teacher.user.first_name} {slot.teacher.user.last_name}",
            'room_number': str(slot.room_id or ''),
            'academic_year': slot.academic_year,
            'term': slot.term,
            'created_at': slot.created_at.isoformat() if slot.created_at else None
        } for slot in slots]

    @staticmethod
    def delete_slot(slot_id):
        """Delete a timetable slot."""
        try:
            slot = TimetableSlot.query.get(slot_id)
            if not slot:
                return False, "Slot not found"
            db.session.delete(slot)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)

    @staticmethod
    def update_slot(slot_id, data):
        """Update a timetable slot."""
        try:
            slot = TimetableSlot.query.get(slot_id)
            if not slot:
                return None, "Slot not found"
            
            # Update attributes
            for key, value in data.items():
                if hasattr(slot, key):
                    setattr(slot, key, value)
            
            db.session.commit()
            return slot, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def check_conflicts(data):
        """Check for timetable conflicts."""
        conflicts = []
        
        # 1. Class Conflict
        class_conflict = TimetableSlot.query.filter_by(
            class_id=data['class_id'],
            day_of_week=data['day_of_week'],
            period_id=data['period_id'],
            term=data['term'],
            academic_year=data['academic_year']
        ).first()
        if class_conflict and class_conflict.id != data.get('id'):
            conflicts.append({
                'type': 'class',
                'message': f"Class already has a lesson: {class_conflict.subject.name}"
            })

        # 2. Teacher Conflict
        teacher_conflict = TimetableSlot.query.filter_by(
            teacher_id=data['teacher_id'],
            day_of_week=data['day_of_week'],
            period_id=data['period_id'],
            term=data['term'],
            academic_year=data['academic_year']
        ).first()
        if teacher_conflict and teacher_conflict.id != data.get('id'):
            conflicts.append({
                'type': 'teacher',
                'message': f"Teacher is already teaching {teacher_conflict.class_.name}"
            })

        return conflicts

    @staticmethod
    def get_teacher_timetable(teacher_id, term, academic_year):
        """Get weekly timetable for a teacher."""
        slots = TimetableSlot.query.filter_by(
            teacher_id=teacher_id,
            term=term,
            academic_year=academic_year
        ).all()
        
        timetable = {}
        for slot in slots:
            if slot.day_of_week not in timetable:
                timetable[slot.day_of_week] = {}
            
            timetable[slot.day_of_week][slot.period_id] = {
                'subject': slot.subject.name,
                'class': slot.class_.name,
                'room': slot.room_id
            }
        return timetable, None

    @staticmethod
    def auto_schedule_greedy(term, academic_year):
        """
        Simple Greedy Scheduler.
        Iterates through classes and subjects, trying to find the first available slot.
        NOTE: This is a basic implementation. Real-world scheduling is NP-hard.
        """
        classes = Class.query.all()
        periods = Period.query.filter_by(is_break=False).all()
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        
        allocations = []
        errors = []
        
        for class_ in classes:
            # Get subjects required for this class (Assuming a relationship or config exists)
            # For prototype, we'll fetch subjects linked to the class
            subjects = class_.subjects 
            
            for subject in subjects:
                # Determine sessions needed per week (e.g., Math=5, PE=2)
                # Default to 3 for now
                sessions_needed = 3 
                
                # Find teacher for this subject in this class
                # Assuming TeacherSubject table or similar logic
                # For prototype, pick the first teacher associated with the subject (Naive)
                teacher = subject.teachers[0] if subject.teachers else None
                
                if not teacher:
                    errors.append(f"No teacher found for {subject.name} in {class_.name}")
                    continue
                    
                allocated = 0
                for day in days:
                    if allocated >= sessions_needed:
                        break
                        
                    for period in periods:
                        if allocated >= sessions_needed:
                            break
                            
                        # Check availability
                        # 1. Is class free?
                        class_busy = TimetableSlot.query.filter_by(
                            class_id=class_.id, day_of_week=day, period_id=period.id, term=term, academic_year=academic_year
                        ).first()
                        
                        # 2. Is teacher free?
                        teacher_busy = TimetableSlot.query.filter_by(
                            teacher_id=teacher.id, day_of_week=day, period_id=period.id, term=term, academic_year=academic_year
                        ).first()
                        
                        if not class_busy and not teacher_busy:
                            # Allocate
                            slot = TimetableSlot(
                                class_id=class_.id,
                                subject_id=subject.id,
                                teacher_id=teacher.id,
                                period_id=period.id,
                                day_of_week=day,
                                term=term,
                                academic_year=academic_year
                            )
                            db.session.add(slot)
                            allocations.append(slot)
                            allocated += 1
                            
        try:
            db.session.commit()
            return len(allocations), errors
        except Exception as e:
            db.session.rollback()
            return 0, [str(e)]
