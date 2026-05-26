import uuid
from datetime import time
from app.extensions import db
from app.models.timetable import TimetableSlot, Period
from app.models.class_ import Class
from app.models.teacher import Teacher

class TimetableEngine:
    @staticmethod
    def check_conflicts(tenant_id: uuid.UUID, branch_id: uuid.UUID, data: dict, current_slot_id: int = None) -> list[str]:
        """
        Scans timetable database to find conflicts for a proposed timetable slot placement.
        Returns a list of clear warning strings detailing conflicts if any exist.
        """
        # Resolve UUIDs
        t_id = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id
        b_id = uuid.UUID(str(branch_id)) if isinstance(branch_id, str) else branch_id

        # 1. Resolve proposed period's time boundaries
        period_id = data.get('period_id')
        proposed_period = Period.query.get(period_id)
        if not proposed_period:
            return ["Proposed period not found."]

        target_start = proposed_period.start_time
        target_end = proposed_period.end_time
        day_of_week = data.get('day_of_week')
        term = data.get('term')
        academic_year = data.get('academic_year')
        
        teacher_id = data.get('teacher_id')
        class_id = data.get('class_id')
        room_id = data.get('room_id')

        conflicts = []

        # 2. Teacher Clash Check (Tenant-Wide - Catch Travelling Educators)
        teacher_clash_q = db.session.query(TimetableSlot)\
            .join(Period, Period.id == TimetableSlot.period_id)\
            .join(Class, Class.id == TimetableSlot.class_id)\
            .filter(
                Class.tenant_id == t_id,
                TimetableSlot.teacher_id == teacher_id,
                TimetableSlot.day_of_week == day_of_week,
                TimetableSlot.term == term,
                TimetableSlot.academic_year == academic_year,
                Period.start_time < target_end,
                Period.end_time > target_start
            )
        
        if current_slot_id:
            teacher_clash_q = teacher_clash_q.filter(TimetableSlot.id != current_slot_id)
            
        teacher_clash = teacher_clash_q.first()
        if teacher_clash:
            teacher = Teacher.query.get(teacher_id)
            teacher_name = teacher.full_name if teacher else f"Teacher #{teacher_id}"
            conflicts.append(
                f"Teacher '{teacher_name}' is already scheduled at an overlapping time on {day_of_week} "
                f"teaching Class '{teacher_clash.class_.name}' (Period: {teacher_clash.period.name})."
            )

        # 3. Room Clash Check (Branch-Isolated)
        if room_id:
            room_clash_q = db.session.query(TimetableSlot)\
                .join(Period, Period.id == TimetableSlot.period_id)\
                .join(Class, Class.id == TimetableSlot.class_id)\
                .filter(
                    Class.tenant_id == t_id,
                    Class.branch_id == b_id,
                    TimetableSlot.room_id == room_id,
                    TimetableSlot.day_of_week == day_of_week,
                    TimetableSlot.term == term,
                    TimetableSlot.academic_year == academic_year,
                    Period.start_time < target_end,
                    Period.end_time > target_start
                )
            
            if current_slot_id:
                room_clash_q = room_clash_q.filter(TimetableSlot.id != current_slot_id)
                
            room_clash = room_clash_q.first()
            if room_clash:
                conflicts.append(
                    f"Room '{room_id}' is already booked at an overlapping time on {day_of_week} "
                    f"for Class '{room_clash.class_.name}' subject '{room_clash.subject.name}'."
                )

        # 4. Class Group Clash Check (Branch-Isolated)
        class_clash_q = db.session.query(TimetableSlot)\
            .join(Period, Period.id == TimetableSlot.period_id)\
            .join(Class, Class.id == TimetableSlot.class_id)\
            .filter(
                Class.tenant_id == t_id,
                Class.branch_id == b_id,
                TimetableSlot.class_id == class_id,
                TimetableSlot.day_of_week == day_of_week,
                TimetableSlot.term == term,
                TimetableSlot.academic_year == academic_year,
                Period.start_time < target_end,
                Period.end_time > target_start
            )
        
        if current_slot_id:
            class_clash_q = class_clash_q.filter(TimetableSlot.id != current_slot_id)
            
        class_clash = class_clash_q.first()
        if class_clash:
            conflicts.append(
                f"Class Group '{class_clash.class_.name}' is already scheduled for subject '{class_clash.subject.name}' "
                f"at an overlapping time on {day_of_week}."
            )

        return conflicts
