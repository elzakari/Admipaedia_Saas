from datetime import datetime, timedelta, time
import math

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
    def parse_time_string(value):
        if value is None:
            return None

        normalized = str(value).strip()
        if not normalized:
            return None

        for time_format in ('%H:%M', '%H:%M:%S', '%I:%M %p', '%I:%M%p'):
            try:
                return datetime.strptime(normalized, time_format).time()
            except ValueError:
                continue
        return None

    @staticmethod
    def format_time_value(value):
        return value.strftime('%H:%M') if value else ''

    @staticmethod
    def get_class_schedule_bounds(class_obj=None):
        default_start = time(8, 0)
        default_end = time(16, 0)
        if not class_obj:
            return default_start, default_end

        start_time = TimetableService.parse_time_string(getattr(class_obj, 'start_time', None)) or default_start
        end_time = TimetableService.parse_time_string(getattr(class_obj, 'end_time', None))
        if end_time and end_time > start_time:
            return start_time, end_time

        derived_end = datetime.combine(datetime.utcnow().date(), start_time) + timedelta(hours=8)
        return start_time, derived_end.time()

    @staticmethod
    def ensure_periods_for_class(class_id=None):
        periods = Period.query.order_by(Period.order_index).all()
        if periods:
            return periods

        class_obj = Class.query.get(class_id) if class_id else Class.query.order_by(Class.id).first()
        start_time, end_time = TimetableService.get_class_schedule_bounds(class_obj)
        current_time = datetime.combine(datetime.utcnow().date(), start_time)
        end_datetime = datetime.combine(datetime.utcnow().date(), end_time)

        generated_periods = []
        order_index = 1
        while current_time < end_datetime and order_index <= 12:
            next_time = current_time + timedelta(hours=1)
            period = Period(
                name=f'Period {order_index}',
                start_time=current_time.time(),
                end_time=min(next_time, end_datetime).time(),
                order_index=order_index,
                is_break=False,
            )
            generated_periods.append(period)
            current_time = next_time
            order_index += 1

        if not generated_periods:
            fallback_start = datetime.combine(datetime.utcnow().date(), default_start := time(8, 0))
            for order_index in range(1, 9):
                next_time = fallback_start + timedelta(hours=1)
                generated_periods.append(
                    Period(
                        name=f'Period {order_index}',
                        start_time=fallback_start.time(),
                        end_time=next_time.time(),
                        order_index=order_index,
                        is_break=False,
                    )
                )
                fallback_start = next_time

        db.session.add_all(generated_periods)
        db.session.commit()
        return Period.query.order_by(Period.order_index).all()

    @staticmethod
    def calculate_required_period_count(subject):
        credit_hours = getattr(subject, 'credit_hours', None)
        if credit_hours is None:
            return 1

        try:
            return max(1, int(math.ceil(float(credit_hours))))
        except (TypeError, ValueError):
            return 1

    @staticmethod
    def get_ordered_periods(class_id=None):
        return TimetableService.ensure_periods_for_class(class_id)

    @staticmethod
    def get_consecutive_period_block(start_period_id, required_period_count, periods=None):
        periods = periods or TimetableService.get_ordered_periods()
        ordered_periods = sorted(periods, key=lambda period: period.order_index)
        start_index = next((index for index, period in enumerate(ordered_periods) if period.id == start_period_id), None)
        if start_index is None:
            return []

        block = []
        for offset in range(required_period_count):
            period_index = start_index + offset
            if period_index >= len(ordered_periods):
                return []

            period = ordered_periods[period_index]
            if getattr(period, 'is_break', False):
                return []

            if block and period.order_index != block[-1].order_index + 1:
                return []

            block.append(period)

        return block

    @staticmethod
    def get_conflict_records(data, current_slot_id=None, required_period_count=None):
        normalized_data = TimetableService.normalize_slot_payload(data)
        term_aliases = TimetableService.get_term_aliases(normalized_data.get('term'))
        periods = TimetableService.get_ordered_periods(normalized_data.get('class_id'))

        if required_period_count is None:
            if current_slot_id:
                required_period_count = 1
            else:
                subject = Subject.query.get(normalized_data.get('subject_id'))
                required_period_count = TimetableService.calculate_required_period_count(subject)

        period_block = TimetableService.get_consecutive_period_block(
            normalized_data.get('period_id'),
            required_period_count,
            periods,
        )

        if not period_block:
            return {
                'period_block': [],
                'class_conflict': None,
                'teacher_conflict': None,
                'required_period_count': required_period_count,
            }

        period_ids = [period.id for period in period_block]

        class_conflict_query = TimetableSlot.query.filter(
            TimetableSlot.class_id == normalized_data['class_id'],
            TimetableSlot.day_of_week == normalized_data['day_of_week'],
            TimetableSlot.academic_year == normalized_data['academic_year'],
            TimetableSlot.period_id.in_(period_ids),
        )
        teacher_conflict_query = TimetableSlot.query.filter(
            TimetableSlot.teacher_id == normalized_data['teacher_id'],
            TimetableSlot.day_of_week == normalized_data['day_of_week'],
            TimetableSlot.academic_year == normalized_data['academic_year'],
            TimetableSlot.period_id.in_(period_ids),
        )

        if term_aliases:
            class_conflict_query = class_conflict_query.filter(TimetableSlot.term.in_(term_aliases))
            teacher_conflict_query = teacher_conflict_query.filter(TimetableSlot.term.in_(term_aliases))

        if current_slot_id:
            class_conflict_query = class_conflict_query.filter(TimetableSlot.id != current_slot_id)
            teacher_conflict_query = teacher_conflict_query.filter(TimetableSlot.id != current_slot_id)

        return {
            'period_block': period_block,
            'class_conflict': class_conflict_query.order_by(TimetableSlot.period_id).first(),
            'teacher_conflict': teacher_conflict_query.order_by(TimetableSlot.period_id).first(),
            'required_period_count': required_period_count,
        }

    @staticmethod
    def get_period_option_payload(class_id=None, subject_id=None, teacher_id=None, day_of_week=None, term=None, academic_year=None, current_slot_id=None):
        class_obj = Class.query.get(class_id) if class_id else None
        periods = TimetableService.get_ordered_periods(class_id)
        subject = Subject.query.get(subject_id) if subject_id else None
        required_period_count = 1 if current_slot_id else TimetableService.calculate_required_period_count(subject)
        class_start_time, _ = TimetableService.get_class_schedule_bounds(class_obj)
        recommended_period_id = None
        serialized_periods = []

        for period in periods:
            period_block = TimetableService.get_consecutive_period_block(period.id, required_period_count, periods)
            blocked_reason = None
            disabled = False

            if getattr(period, 'is_break', False):
                disabled = True
                blocked_reason = 'Break periods cannot be assigned to lessons.'
            elif not period_block:
                disabled = True
                blocked_reason = f'Requires {required_period_count} consecutive timeframe(s).'
            elif class_id and day_of_week and academic_year:
                conflict_result = TimetableService.get_conflict_records(
                    {
                        'class_id': class_id,
                        'subject_id': subject_id or 0,
                        'teacher_id': teacher_id or 0,
                        'day_of_week': day_of_week,
                        'period_id': period.id,
                        'term': term,
                        'academic_year': academic_year,
                    },
                    current_slot_id=current_slot_id,
                    required_period_count=required_period_count,
                )
                if conflict_result['class_conflict']:
                    disabled = True
                    blocked_reason = f"Already assigned to {conflict_result['class_conflict'].subject.name} for this class."
                elif teacher_id and conflict_result['teacher_conflict']:
                    disabled = True
                    blocked_reason = f"Teacher is already assigned to {conflict_result['teacher_conflict'].class_.name} at this timeframe."

            block_start = period_block[0].start_time if period_block else period.start_time
            block_end = period_block[-1].end_time if period_block else period.end_time
            if recommended_period_id is None and not disabled and block_start >= class_start_time:
                recommended_period_id = period.id

            serialized_periods.append({
                'id': period.id,
                'name': period.name,
                'start': TimetableService.format_time_value(period.start_time),
                'end': TimetableService.format_time_value(period.end_time),
                'label': f"{TimetableService.format_time_value(block_start)} - {TimetableService.format_time_value(block_end)}",
                'disabled': disabled,
                'blocked_reason': blocked_reason,
                'span_period_ids': [item.id for item in period_block] if period_block else [],
            })

        return {
            'periods': serialized_periods,
            'meta': {
                'class_start_time': TimetableService.format_time_value(class_start_time),
                'required_period_count': required_period_count,
                'subject_credit_hours': getattr(subject, 'credit_hours', None),
                'recommended_period_id': recommended_period_id,
            }
        }

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
        return TimetableService.ensure_periods_for_class()

    @staticmethod
    def create_slot(data):
        """Create a timetable slot with conflict checking."""
        data = TimetableService.normalize_slot_payload(data)
        class_obj, subject, relationship_error = TimetableService.validate_slot_relationships(data)
        if relationship_error:
            return None, relationship_error
        required_period_count = TimetableService.calculate_required_period_count(subject)
        conflict_result = TimetableService.get_conflict_records(data, required_period_count=required_period_count)
        period_block = conflict_result['period_block']

        if not period_block:
            return None, f"Selected timeframe does not provide {required_period_count} consecutive hourly slot(s) from the class start schedule."

        if conflict_result['class_conflict']:
            return None, f"Class already has a lesson at this timeframe ({conflict_result['class_conflict'].subject.name})"

        if conflict_result['teacher_conflict']:
            return None, f"Teacher is already teaching {conflict_result['teacher_conflict'].class_.name} at this timeframe"

        try:
            created_slots = []
            for period in period_block:
                slot = TimetableSlot(
                    class_id=class_obj.id,
                    subject_id=subject.id,
                    teacher_id=data['teacher_id'],
                    period_id=period.id,
                    day_of_week=data['day_of_week'],
                    term=data['term'],
                    academic_year=data['academic_year'],
                    room_id=data.get('room_id'),
                )
                db.session.add(slot)
                created_slots.append(slot)
            db.session.commit()
            return created_slots[0], None
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
        conflict_result = TimetableService.get_conflict_records(data, current_slot_id=data.get('id'))

        if not conflict_result['period_block']:
            conflicts.append({
                'type': 'timeframe',
                'message': f"Selected timeframe does not provide {conflict_result['required_period_count']} consecutive hourly slot(s)."
            })
            return conflicts

        class_conflict = conflict_result['class_conflict']
        if class_conflict:
            conflicts.append({
                'type': 'class',
                'message': f"Class already has a lesson: {class_conflict.subject.name}"
            })

        teacher_conflict = conflict_result['teacher_conflict']
        if teacher_conflict:
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
