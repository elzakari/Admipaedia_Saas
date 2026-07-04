from app.extensions import db
from app.models.timetable import TimetableSlot, Period
from app.models.class_ import Class
from app.models.teacher import Teacher
from app.models.subject import Subject
import structlog
from sqlalchemy import and_

logger = structlog.get_logger()

class TimetableService:
    TERM_LABELS = {
        'term1': 'Term 1',
        'term 1': 'Term 1',
        '1': 'Term 1',
        'term2': 'Term 2',
        'term 2': 'Term 2',
        '2': 'Term 2',
        'term3': 'Term 3',
        'term 3': 'Term 3',
        '3': 'Term 3',
    }

    @staticmethod
    def normalize_term(term):
        if term is None:
            return None
        term_value = str(term).strip()
        if not term_value:
            return None
        return TimetableService.TERM_LABELS.get(term_value.lower(), term_value)

    @staticmethod
    def get_term_aliases(term):
        canonical = TimetableService.normalize_term(term)
        if canonical is None:
            return []

        aliases = {canonical}
        for raw_value, normalized in TimetableService.TERM_LABELS.items():
            if normalized == canonical:
                aliases.add(raw_value)
        return list(aliases)

    @staticmethod
    def normalize_slot_payload(data):
        payload = dict(data or {})
        payload['term'] = TimetableService.normalize_term(payload.get('term'))
        return payload

    @staticmethod
    def get_teacher_display_name(teacher):
        if not teacher:
            return ''
        user = getattr(teacher, 'user', None)
        first_name = getattr(user, 'first_name', None) or getattr(teacher, 'first_name', None) or ''
        last_name = getattr(user, 'last_name', None) or getattr(teacher, 'last_name', None) or ''
        full_name = f"{first_name} {last_name}".strip()
        return full_name or f"Teacher {teacher.id}"

    @staticmethod
    def validate_slot_relationships(data):
        class_obj = Class.query.get(data.get('class_id'))
        if not class_obj:
            return None, None, "Class not found"

        subject = Subject.query.get(data.get('subject_id'))
        if not subject:
            return class_obj, None, "Subject not found"

        teacher = Teacher.query.get(data.get('teacher_id'))
        if not teacher:
            return class_obj, subject, "Teacher not found"

        if not any(mapped_class.id == class_obj.id for mapped_class in subject.classes):
            return class_obj, subject, "Selected subject is not assigned to this class. Assign it in Settings > Academic > Subjects first."

        if not any(mapped_teacher.id == teacher.id for mapped_teacher in subject.teachers):
            return class_obj, subject, "Selected teacher is not assigned to this subject. Update the subject setup before creating the timetable slot."

        return class_obj, subject, None

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
        data = TimetableService.normalize_slot_payload(data)
        _, _, relationship_error = TimetableService.validate_slot_relationships(data)
        if relationship_error:
            return None, relationship_error

        term_aliases = TimetableService.get_term_aliases(data.get('term'))

        # 1. Check for Class Conflict (Class already booked at this time)
        class_conflict_query = TimetableSlot.query.filter_by(
            class_id=data['class_id'],
            day_of_week=data['day_of_week'],
            period_id=data['period_id'],
            academic_year=data['academic_year']
        )
        if term_aliases:
            class_conflict_query = class_conflict_query.filter(TimetableSlot.term.in_(term_aliases))
        class_conflict = class_conflict_query.first()
        
        if class_conflict:
            return None, f"Class already has a lesson at this time ({class_conflict.subject.name})"

        # 2. Check for Teacher Conflict (Teacher already teaching elsewhere)
        teacher_conflict_query = TimetableSlot.query.filter_by(
            teacher_id=data['teacher_id'],
            day_of_week=data['day_of_week'],
            period_id=data['period_id'],
            academic_year=data['academic_year']
        )
        if term_aliases:
            teacher_conflict_query = teacher_conflict_query.filter(TimetableSlot.term.in_(term_aliases))
        teacher_conflict = teacher_conflict_query.first()
        
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
        query = TimetableSlot.query.filter_by(class_id=class_id)
        if academic_year:
            query = query.filter_by(academic_year=academic_year)
        term_aliases = TimetableService.get_term_aliases(term)
        if term_aliases:
            query = query.filter(TimetableSlot.term.in_(term_aliases))
        slots = query.all()
        
        # Structure: {Day: {PeriodID: {Subject, Teacher}}}
        timetable = {}
        for slot in slots:
            if slot.day_of_week not in timetable:
                timetable[slot.day_of_week] = {}
            
            timetable[slot.day_of_week][slot.period_id] = {
                'id': slot.id,
                'subject': slot.subject.name,
                'teacher': TimetableService.get_teacher_display_name(slot.teacher),
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
                query = query.filter(TimetableSlot.term.in_(TimetableService.get_term_aliases(filters['term'])))
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
            'teacher_name': TimetableService.get_teacher_display_name(slot.teacher),
            'room_number': str(slot.room_id or ''),
            'academic_year': slot.academic_year,
            'term': TimetableService.normalize_term(slot.term) or slot.term,
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

            data = TimetableService.normalize_slot_payload(data)
            payload = {
                'class_id': data.get('class_id', slot.class_id),
                'subject_id': data.get('subject_id', slot.subject_id),
                'teacher_id': data.get('teacher_id', slot.teacher_id),
                'day_of_week': data.get('day_of_week', slot.day_of_week),
                'period_id': data.get('period_id', slot.period_id),
                'term': data.get('term', TimetableService.normalize_term(slot.term) or slot.term),
                'academic_year': data.get('academic_year', slot.academic_year),
            }

            _, _, relationship_error = TimetableService.validate_slot_relationships(payload)
            if relationship_error:
                return None, relationship_error

            conflicts = TimetableService.check_conflicts({**payload, 'id': slot.id})
            if conflicts:
                return None, conflicts[0]['message']
            
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
        data = TimetableService.normalize_slot_payload(data)
        conflicts = []
        term_aliases = TimetableService.get_term_aliases(data.get('term'))
        
        # 1. Class Conflict
        class_conflict_query = TimetableSlot.query.filter_by(
            class_id=data['class_id'],
            day_of_week=data['day_of_week'],
            period_id=data['period_id'],
            academic_year=data['academic_year']
        )
        if term_aliases:
            class_conflict_query = class_conflict_query.filter(TimetableSlot.term.in_(term_aliases))
        class_conflict = class_conflict_query.first()
        if class_conflict and class_conflict.id != data.get('id'):
            conflicts.append({
                'type': 'class',
                'message': f"Class already has a lesson: {class_conflict.subject.name}"
            })

        # 2. Teacher Conflict
        teacher_conflict_query = TimetableSlot.query.filter_by(
            teacher_id=data['teacher_id'],
            day_of_week=data['day_of_week'],
            period_id=data['period_id'],
            academic_year=data['academic_year']
        )
        if term_aliases:
            teacher_conflict_query = teacher_conflict_query.filter(TimetableSlot.term.in_(term_aliases))
        teacher_conflict = teacher_conflict_query.first()
        if teacher_conflict and teacher_conflict.id != data.get('id'):
            conflicts.append({
                'type': 'teacher',
                'message': f"Teacher is already teaching {teacher_conflict.class_.name}"
            })

        return conflicts

    @staticmethod
    def get_teacher_timetable(teacher_id, term, academic_year):
        """Get weekly timetable for a teacher."""
        query = TimetableSlot.query.filter_by(teacher_id=teacher_id)
        if academic_year:
            query = query.filter_by(academic_year=academic_year)
        term_aliases = TimetableService.get_term_aliases(term)
        if term_aliases:
            query = query.filter(TimetableSlot.term.in_(term_aliases))
        slots = query.all()
        
        timetable = {}
        for slot in slots:
            if slot.day_of_week not in timetable:
                timetable[slot.day_of_week] = {}
            
            timetable[slot.day_of_week][slot.period_id] = {
                'subject': slot.subject.name,
                'class': slot.class_.name,
                'teacher': TimetableService.get_teacher_display_name(slot.teacher),
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
