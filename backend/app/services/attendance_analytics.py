from decimal import Decimal
from typing import Dict, List, Any, Optional
from datetime import datetime, date
import calendar
from app.extensions import db
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.class_ import Class
from sqlalchemy import func

class AttendanceAnalytics:
    """Service class for compiling precise attendance analytics using Decimal logic."""
    
    @staticmethod
    def get_presence_rate(present: int, late: int, absent: int, excused: int) -> Decimal:
        """
        Calculate present rate = (present + late) / total.
        Uses Decimal to prevent rounding drift.
        """
        total = present + late + absent + excused
        if total == 0:
            return Decimal('0.00')
        return (Decimal(present + late) / Decimal(total) * Decimal('100.00')).quantize(Decimal('0.01'))
        
    @staticmethod
    def get_monthly_student_stats(student_id: int, year: int, month: int) -> Dict[str, Any]:
        """
        Compute monthly stats for a student.
        """
        start_date = date(year, month, 1)
        _, last_day = calendar.monthrange(year, month)
        end_date = date(year, month, last_day)
        
        # Query attendance records
        records = Attendance.query_scoped().filter(
            Attendance.student_id == student_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).all()
        
        present = sum(1 for r in records if r.status == 'present')
        late = sum(1 for r in records if r.status == 'late')
        absent = sum(1 for r in records if r.status == 'absent')
        excused = sum(1 for r in records if r.status == 'excused')
        
        rate = AttendanceAnalytics.get_presence_rate(present, late, absent, excused)
        
        return {
            "student_id": student_id,
            "year": year,
            "month": month,
            "present_count": present,
            "late_count": late,
            "absent_count": absent,
            "excused_count": excused,
            "total_records": len(records),
            "presence_rate": rate
        }

    @staticmethod
    def get_monthly_class_stats(class_id: int, year: int, month: int) -> Dict[str, Any]:
        """
        Compute monthly stats for a class.
        """
        start_date = date(year, month, 1)
        _, last_day = calendar.monthrange(year, month)
        end_date = date(year, month, last_day)
        
        # Query all attendance records for students in this class
        records = Attendance.query_scoped().filter(
            Attendance.class_id == class_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).all()
        
        present = sum(1 for r in records if r.status == 'present')
        late = sum(1 for r in records if r.status == 'late')
        absent = sum(1 for r in records if r.status == 'absent')
        excused = sum(1 for r in records if r.status == 'excused')
        
        rate = AttendanceAnalytics.get_presence_rate(present, late, absent, excused)
        
        # Daily trends
        daily_trends = []
        for day in range(1, last_day + 1):
            day_date = date(year, month, day)
            day_records = [r for r in records if r.date == day_date]
            if not day_records:
                continue
            dp = sum(1 for r in day_records if r.status == 'present')
            dl = sum(1 for r in day_records if r.status == 'late')
            da = sum(1 for r in day_records if r.status == 'absent')
            de = sum(1 for r in day_records if r.status == 'excused')
            drate = AttendanceAnalytics.get_presence_rate(dp, dl, da, de)
            daily_trends.append({
                "date": day_date.strftime("%Y-%m-%d"),
                "day": day,
                "presence_rate": drate,
                "present": dp,
                "late": dl,
                "absent": da,
                "excused": de
            })
            
        return {
            "class_id": class_id,
            "year": year,
            "month": month,
            "present_count": present,
            "late_count": late,
            "absent_count": absent,
            "excused_count": excused,
            "total_records": len(records),
            "presence_rate": rate,
            "daily_trends": daily_trends
        }

    @staticmethod
    def get_monthly_branch_stats(branch_id: str, year: int, month: int, class_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Compute monthly stats for an entire branch (or class filter).
        """
        start_date = date(year, month, 1)
        _, last_day = calendar.monthrange(year, month)
        end_date = date(year, month, last_day)
        
        query = Attendance.query_scoped()
        if branch_id:
            import uuid
            try:
                b_uuid = uuid.UUID(str(branch_id))
                query = query.filter(Attendance.branch_id == b_uuid)
            except ValueError:
                pass
                
        if class_id:
            query = query.filter(Attendance.class_id == class_id)
            
        records = query.filter(
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).all()
        
        present = sum(1 for r in records if r.status == 'present')
        late = sum(1 for r in records if r.status == 'late')
        absent = sum(1 for r in records if r.status == 'absent')
        excused = sum(1 for r in records if r.status == 'excused')
        
        rate = AttendanceAnalytics.get_presence_rate(present, late, absent, excused)
        
        # Daily trends
        daily_trends = []
        for day in range(1, last_day + 1):
            day_date = date(year, month, day)
            day_records = [r for r in records if r.date == day_date]
            if not day_records:
                continue
            dp = sum(1 for r in day_records if r.status == 'present')
            dl = sum(1 for r in day_records if r.status == 'late')
            da = sum(1 for r in day_records if r.status == 'absent')
            de = sum(1 for r in day_records if r.status == 'excused')
            drate = AttendanceAnalytics.get_presence_rate(dp, dl, da, de)
            daily_trends.append({
                "date": day_date.strftime("%Y-%m-%d"),
                "day": day,
                "presence_rate": drate,
                "present": dp,
                "late": dl,
                "absent": da,
                "excused": de
            })
            
        return {
            "branch_id": str(branch_id),
            "year": year,
            "month": month,
            "present_count": present,
            "late_count": late,
            "absent_count": absent,
            "excused_count": excused,
            "total_records": len(records),
            "presence_rate": rate,
            "daily_trends": daily_trends
        }
