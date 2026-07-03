import structlog
from app.extensions import db
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.class_ import Class
from app.models.subject import Subject
from datetime import datetime, date
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import and_, func
from app.services.cache_service import get_cache_service
from app.schemas.attendance import AttendanceSchema

logger = structlog.get_logger()
cache_service = get_cache_service()
attendance_schema = AttendanceSchema()

class AttendanceService:
    """Service for attendance-related operations."""

    @staticmethod
    def _validate_subject_context(class_, subject_id):
        """Validate optional subject context without making it part of daily uniqueness."""
        if not subject_id:
            return None, None

        subject = Subject.query.get(subject_id)
        if not subject:
            return None, "Subject not found"

        if getattr(class_, 'tenant_id', None) and getattr(subject, 'tenant_id', None):
            if getattr(class_, 'tenant_id', None) != getattr(subject, 'tenant_id', None):
                return None, "Subject is outside the selected class tenant context"

        return subject, None
    
    @staticmethod
    def get_all_attendances(page=1, per_page=20, class_id=None, student_id=None, subject_id=None, date_from=None, date_to=None, status=None):
        """Get all attendances with optional filtering and pagination."""
        from sqlalchemy.orm import joinedload
        
        query = Attendance.query.options(
            joinedload(Attendance.student).joinedload(Student.user),
            joinedload(Attendance.class_),
            joinedload(Attendance.subject)
        )
        
        if class_id:
            query = query.filter(Attendance.class_id == class_id)
            
        if student_id:
            query = query.filter(Attendance.student_id == student_id)

        if subject_id:
            query = query.filter(Attendance.subject_id == subject_id)
            
        if date_from:
            query = query.filter(Attendance.date >= date_from)
            
        if date_to:
            query = query.filter(Attendance.date <= date_to)
            
        if status:
            query = query.filter(Attendance.status == status)
            
        return query.order_by(Attendance.date.desc(), Attendance.student_id).paginate(page=page, per_page=per_page)
    
    @staticmethod
    def get_attendance_by_id(attendance_id):
        """Get an attendance record by ID."""
        from sqlalchemy.orm import joinedload
        
        # Try to get DTO from cache first
        cache_key = f"attendance:dto:{attendance_id}"
        cached_attendance = cache_service.get(cache_key)
        if cached_attendance:
            return cached_attendance
        
        # If not in cache, query database
        attendance = Attendance.query.options(
            joinedload(Attendance.student).joinedload(Student.user),
            joinedload(Attendance.class_),
            joinedload(Attendance.subject)
        ).get(attendance_id)
        
        # Cache the result if found (as DTO)
        if attendance:
            cache_service.set(cache_key, attendance_schema.dump(attendance), ttl=cache_service.SHORT_TTL)
        
        return attendance
    
    @staticmethod
    def get_attendance_by_student_date(student_id, date_val, class_id=None, subject_id=None):
        """Get the canonical daily attendance record for a student."""
        from sqlalchemy.orm import joinedload
        
        query = Attendance.query.options(
            joinedload(Attendance.student).joinedload(Student.user),
            joinedload(Attendance.class_),
            joinedload(Attendance.subject)
        ).filter(
            Attendance.student_id == student_id,
            Attendance.date == date_val
        )
        
        if class_id:
            query = query.filter(Attendance.class_id == class_id)
            
        return query.first()
    
    @staticmethod
    def create_attendance(attendance_data):
        """Create a new attendance record."""
        try:
            # Check if student exists
            student = Student.query.get(attendance_data['student_id'])
            if not student:
                return None, "Student not found"
            
            # Check if class exists
            class_ = Class.query.get(attendance_data['class_id'])
            if not class_:
                return None, "Class not found"
            if getattr(student, 'class_id', None) != getattr(class_, 'id', None):
                return None, "Student is not assigned to the selected class"
            
            _, subject_error = AttendanceService._validate_subject_context(class_, attendance_data.get('subject_id'))
            if subject_error:
                return None, subject_error
            
            # Check if attendance record already exists for this student on this date
            existing = AttendanceService.get_attendance_by_student_date(
                attendance_data['student_id'],
                attendance_data['date'],
                attendance_data.get('class_id')
            )
            
            if existing:
                return None, "Attendance record already exists for this student on this date"
            
            new_attendance = Attendance(**attendance_data)
            db.session.add(new_attendance)
            db.session.commit()
            
            # Use the ID from the committed object
            attendance_id = new_attendance.id
            cache_service.delete(f"attendance:dto:{attendance_id}")
            
            logger.info("Attendance created", attendance_id=attendance_id, student_id=new_attendance.student_id)
            return new_attendance, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error creating attendance", error=str(e))
            return None, str(e)
    
    @staticmethod
    def update_attendance(attendance_id, attendance_data):
        """Update an existing attendance record."""
        try:
            attendance = Attendance.query.get(attendance_id)
            if not attendance:
                return None, "Attendance record not found"
            
            for key, value in attendance_data.items():
                setattr(attendance, key, value)
            
            attendance.updated_at = datetime.utcnow()
            db.session.commit()
            cache_service.delete(f"attendance:dto:{attendance_id}")
            
            logger.info("Attendance updated", attendance_id=attendance.id)
            return attendance, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error updating attendance", error=str(e), attendance_id=attendance_id)
            return None, str(e)
    
    @staticmethod
    def delete_attendance(attendance_id):
        """Delete an attendance record."""
        try:
            attendance = Attendance.query.get(attendance_id)
            if not attendance:
                return False, "Attendance record not found"
            
            db.session.delete(attendance)
            db.session.commit()
            cache_service.delete(f"attendance:dto:{attendance_id}")
            
            logger.info("Attendance deleted", attendance_id=attendance_id)
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error deleting attendance", error=str(e), attendance_id=attendance_id)
            return False, str(e)
    
    @staticmethod
    def bulk_create_attendance(bulk_data):
        """Create multiple attendance records at once."""
        try:
            # Check if class exists
            class_ = Class.query.get(bulk_data['class_id'])
            if not class_:
                return None, "Class not found"
            
            subject_id = bulk_data.get('subject_id')
            _, subject_error = AttendanceService._validate_subject_context(class_, subject_id)
            if subject_error:
                return None, subject_error
            
            created_attendances = []
            for attendance_item in bulk_data['attendances']:
                # Create a complete attendance record
                attendance_data = {
                    'student_id': attendance_item['student_id'],
                    'class_id': bulk_data['class_id'],
                    'subject_id': subject_id,
                    'date': bulk_data['date'],
                    'status': attendance_item['status'],
                    'remarks': attendance_item.get('remarks'),
                    'recorded_by': bulk_data.get('recorded_by')
                }
                
                # Check if student exists
                student = Student.query.get(attendance_data['student_id'])
                if not student:
                    continue  # Skip this record if student doesn't exist
                if getattr(student, 'class_id', None) != getattr(class_, 'id', None):
                    continue
                
                # Check if attendance record already exists
                existing = AttendanceService.get_attendance_by_student_date(
                    attendance_data['student_id'],
                    attendance_data['date'],
                    attendance_data['class_id'],
                    attendance_data.get('class_id')
                )
                
                if existing:
                    # Update existing record instead of creating a new one
                    for key, value in attendance_data.items():
                        if key not in ['student_id', 'class_id', 'subject_id', 'date']:
                            setattr(existing, key, value)
                    if not existing.subject_id and attendance_data.get('subject_id'):
                        existing.subject_id = attendance_data['subject_id']
                    existing.updated_at = datetime.utcnow()
                    created_attendances.append(existing)
                else:
                    # Create new attendance record
                    new_attendance = Attendance(**attendance_data)
                    db.session.add(new_attendance)
                    created_attendances.append(new_attendance)
            
            db.session.commit()
            # Invalidate related cached aggregates
            cache_service.delete_pattern("student:dto:*")
            cache_service.delete_pattern("class:dto:*")
            
            logger.info("Bulk attendance created", count=len(created_attendances))
            return created_attendances, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error creating bulk attendance", error=str(e))
            return None, str(e)
    
    @staticmethod
    def get_attendance_stats(class_id=None, student_id=None, date_from=None, date_to=None):
        """Get attendance statistics."""
        try:
            query = db.session.query(
                Attendance.status,
                func.count(Attendance.id).label('count')
            )
            
            if class_id:
                query = query.filter(Attendance.class_id == class_id)
                
            if student_id:
                query = query.filter(Attendance.student_id == student_id)
                
            if date_from:
                query = query.filter(Attendance.date >= date_from)
                
            if date_to:
                query = query.filter(Attendance.date <= date_to)
            
            stats = query.group_by(Attendance.status).all()
            
            result = {
                'total': sum(stat.count for stat in stats),
                'present': 0,
                'absent': 0,
                'late': 0,
                'excused': 0
            }
            
            for stat in stats:
                result[stat.status] = stat.count
            
            # Calculate percentages
            if result['total'] > 0:
                result['present_percentage'] = (result['present'] / result['total']) * 100
                result['absent_percentage'] = (result['absent'] / result['total']) * 100
                result['late_percentage'] = (result['late'] / result['total']) * 100
                result['excused_percentage'] = (result['excused'] / result['total']) * 100
            else:
                result['present_percentage'] = 0
                result['absent_percentage'] = 0
                result['late_percentage'] = 0
                result['excused_percentage'] = 0
            
            return result, None
        except SQLAlchemyError as e:
            logger.error("Error getting attendance stats", error=str(e))
            return None, str(e)
    
    @staticmethod
    def get_student_attendance_report(student_id, date_from=None, date_to=None, class_id=None, subject_id=None):
        """Generate a detailed attendance report for a student."""
        try:
            query = Attendance.query.filter(Attendance.student_id == student_id)
            
            if date_from:
                query = query.filter(Attendance.date >= date_from)
            
            if date_to:
                query = query.filter(Attendance.date <= date_to)
            
            if class_id:
                query = query.filter(Attendance.class_id == class_id)
            
            if subject_id:
                query = query.filter(Attendance.subject_id == subject_id)
            
            # Order by date
            query = query.order_by(Attendance.date.desc())
            
            attendances = query.all()
            
            # Calculate statistics
            total_days = len(attendances)
            present_days = sum(1 for a in attendances if a.status == 'present')
            absent_days = sum(1 for a in attendances if a.status == 'absent')
            late_days = sum(1 for a in attendances if a.status == 'late')
            excused_days = sum(1 for a in attendances if a.status == 'excused')
            
            attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0
            
            # Group by month for trend analysis
            monthly_data = {}
            for attendance in attendances:
                month_key = attendance.date.strftime('%Y-%m')
                if month_key not in monthly_data:
                    monthly_data[month_key] = {'total': 0, 'present': 0, 'absent': 0, 'late': 0, 'excused': 0}
                
                monthly_data[month_key]['total'] += 1
                monthly_data[month_key][attendance.status] += 1
            
            # Convert to list for easier frontend consumption
            monthly_trends = [
                {
                    'month': month,
                    'total': data['total'],
                    'present': data['present'],
                    'absent': data['absent'],
                    'late': data['late'],
                    'excused': data['excused'],
                    'attendance_rate': (data['present'] / data['total'] * 100) if data['total'] > 0 else 0
                }
                for month, data in monthly_data.items()
            ]
            
            # Sort by month
            monthly_trends.sort(key=lambda x: x['month'])
            
            report = {
                'student_id': student_id,
                'period': {
                    'from': date_from.isoformat() if date_from else None,
                    'to': date_to.isoformat() if date_to else None
                },
                'summary': {
                    'total_days': total_days,
                    'present_days': present_days,
                    'absent_days': absent_days,
                    'late_days': late_days,
                    'excused_days': excused_days,
                    'attendance_rate': round(attendance_rate, 2)
                },
                'monthly_trends': monthly_trends,
                'records': [
                    {
                        'id': a.id,
                        'date': a.date.isoformat(),
                        'status': a.status,
                        'class_id': a.class_id,
                        'subject_id': a.subject_id,
                        'remarks': a.remarks
                    }
                    for a in attendances
                ]
            }
            
            return report, None
        
        except Exception as e:
            logger.error("Error generating student attendance report", error=str(e))
            return None, f"Failed to generate attendance report: {str(e)}"
    
    @staticmethod
    def bulk_mark_attendance(class_id, date, attendances, recorded_by=None):
        """Mark attendance for multiple students in a class at once."""
        try:
            # Validate inputs
            if not class_id:
                return None, "Class ID is required"
            
            if not date:
                return None, "Date is required"
            
            if not attendances or not isinstance(attendances, list):
                return None, "Attendances must be a non-empty list"
            
            # Convert date string to date object if needed
            if isinstance(date, str):
                try:
                    date = datetime.strptime(date, '%Y-%m-%d').date()
                except ValueError:
                    return None, "Invalid date format. Use YYYY-MM-DD"
            
            # Begin transaction
            created_records = []
            updated_records = []
            
            for attendance_data in attendances:
                student_id = attendance_data.get('student_id')
                status = attendance_data.get('status')
                subject_id = attendance_data.get('subject_id')
                remarks = attendance_data.get('remarks')
                
                if not student_id or not status:
                    continue  # Skip invalid entries
                
                # Daily attendance is canonical per student + class + date.
                existing = Attendance.query.filter(
                    Attendance.student_id == student_id,
                    Attendance.date == date,
                    Attendance.class_id == class_id
                )
                existing = existing.first()
                
                if existing:
                    # Update existing record
                    existing.status = status
                    if remarks is not None:
                        existing.remarks = remarks
                    if not existing.subject_id and subject_id:
                        existing.subject_id = subject_id
                    updated_records.append(existing)
                else:
                    # Create new record
                    new_attendance = Attendance(
                        student_id=student_id,
                        class_id=class_id,
                        subject_id=subject_id,
                        date=date,
                        status=status,
                        remarks=remarks,
                        recorded_by=recorded_by
                    )
                    db.session.add(new_attendance)
                    created_records.append(new_attendance)
            
            db.session.commit()
            
            return {
                'created': len(created_records),
                'updated': len(updated_records),
                'total': len(created_records) + len(updated_records)
            }, None
        
        except Exception as e:
            db.session.rollback()
            logger.error("Error in bulk mark attendance", error=str(e))
            return None, f"Failed to mark attendance: {str(e)}"


    @staticmethod
    def get_advanced_attendance_analytics(class_id=None, date_from=None, date_to=None):
        """Generate advanced attendance analytics for a class."""
        try:
            from datetime import datetime, timedelta
            import pandas as pd
            
            # Build base query
            query = db.session.query(
                Attendance.student_id,
                Attendance.date,
                Attendance.status
            )
            
            if class_id:
                query = query.filter(Attendance.class_id == class_id)
                
            if date_from:
                query = query.filter(Attendance.date >= date_from)
                
            if date_to:
                query = query.filter(Attendance.date <= date_to)
                
            attendances = query.all()
            
            if not attendances:
                # Return empty stats structure instead of an error message to avoid 400 Bad Request
                return {
                    'daily_stats': {},
                    'student_stats': {},
                    'overall_stats': {
                        'total_records': 0,
                        'present_records': 0,
                        'absent_records': 0,
                        'late_records': 0,
                        'excused_records': 0,
                        'overall_attendance_rate': 0,
                        'date_range': {
                            'start': date_from.strftime('%Y-%m-%d') if date_from else None,
                            'end': date_to.strftime('%Y-%m-%d') if date_to else None,
                            'total_days': 0
                        }
                    }
                }, None
                
            # Convert to DataFrame for easier analysis
            df = pd.DataFrame([(a.student_id, a.date, a.status) for a in attendances],
                             columns=['student_id', 'date', 'status'])
            
            # Get unique students and dates
            students = df['student_id'].unique()
            dates = sorted(df['date'].unique())
            
            # Calculate attendance trends over time
            daily_stats = {}
            for date in dates:
                day_df = df[df['date'] == date]
                total = len(day_df)
                present = len(day_df[day_df['status'] == 'present'])
                absent = len(day_df[day_df['status'] == 'absent'])
                late = len(day_df[day_df['status'] == 'late'])
                excused = len(day_df[day_df['status'] == 'excused'])
                
                daily_stats[date.strftime('%Y-%m-%d')] = {
                    'total': total,
                    'present': present,
                    'absent': absent,
                    'late': late,
                    'excused': excused,
                    'attendance_rate': (present / total * 100) if total > 0 else 0
                }
            
            # Calculate student-wise attendance
            student_stats = {}
            for student_id in students:
                student_df = df[df['student_id'] == student_id]
                total_days = len(student_df)
                present_days = len(student_df[student_df['status'] == 'present'])
                absent_days = len(student_df[student_df['status'] == 'absent'])
                late_days = len(student_df[student_df['status'] == 'late'])
                excused_days = len(student_df[student_df['status'] == 'excused'])
                
                # Get student details
                student = Student.query.get(student_id)
                student_name = f"{student.first_name} {student.last_name}" if student else f"Student {student_id}"
                
                student_stats[student_id] = {
                    'student_id': student_id,
                    'student_name': student_name,
                    'total_days': total_days,
                    'present_days': present_days,
                    'absent_days': absent_days,
                    'late_days': late_days,
                    'excused_days': excused_days,
                    'attendance_rate': (present_days / total_days * 100) if total_days > 0 else 0,
                    'consecutive_absences': AttendanceService._calculate_consecutive_absences(student_df)
                }
            
            # Calculate overall statistics
            total_records = len(df)
            present_records = len(df[df['status'] == 'present'])
            absent_records = len(df[df['status'] == 'absent'])
            late_records = len(df[df['status'] == 'late'])
            excused_records = len(df[df['status'] == 'excused'])
            
            overall_stats = {
                'total_records': total_records,
                'present_records': present_records,
                'absent_records': absent_records,
                'late_records': late_records,
                'excused_records': excused_records,
                'overall_attendance_rate': (present_records / total_records * 100) if total_records > 0 else 0,
                'date_range': {
                    'start': dates[0].strftime('%Y-%m-%d') if dates else None,
                    'end': dates[-1].strftime('%Y-%m-%d') if dates else None,
                    'total_days': len(dates)
                }
            }
            
            return {
                'daily_stats': daily_stats,
                'student_stats': student_stats,
                'overall_stats': overall_stats
            }, None
            
        except Exception as e:
            return None, f"Failed to generate attendance analytics: {str(e)}"
            
    @staticmethod
    def _calculate_consecutive_absences(student_df):
        """Helper method to calculate the longest streak of consecutive absences."""
        if student_df.empty:
            return 0
            
        # Sort by date
        student_df = student_df.sort_values('date')
        
        # Consider both 'absent' and 'late' as absences for this calculation
        absences = student_df['status'].isin(['absent'])
        
        # Calculate consecutive absences
        max_streak = 0
        current_streak = 0
        
        for absent in absences:
            if absent:
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 0
                
        return max_streak


    @staticmethod
    def get_attendance_trends(class_id=None, student_id=None, date_from=None, date_to=None):
        """Get attendance trends over time (daily breakdown)."""
        try:
            query = db.session.query(
                Attendance.date,
                Attendance.status,
                func.count(Attendance.id).label('count')
            ).group_by(Attendance.date, Attendance.status)
            
            if class_id:
                query = query.filter(Attendance.class_id == class_id)
            
            if student_id:
                query = query.filter(Attendance.student_id == student_id)
            
            if date_from:
                query = query.filter(Attendance.date >= date_from)
            
            if date_to:
                query = query.filter(Attendance.date <= date_to)
            
            results = query.all()
            
            # Process results into a structure: {date: {present: x, absent: y, ...}}
            trends = {}
            for row in results:
                date_str = row.date.strftime('%Y-%m-%d')
                if date_str not in trends:
                    trends[date_str] = {'present': 0, 'absent': 0, 'late': 0, 'excused': 0, 'total': 0}
                
                trends[date_str][row.status] = row.count
                trends[date_str]['total'] += row.count
                
            # Calculate rates
            for date_str, data in trends.items():
                if data['total'] > 0:
                    data['attendance_rate'] = round((data['present'] / data['total'] * 100), 2)
                else:
                    data['attendance_rate'] = 0
            
            # Sort by date
            sorted_trends = dict(sorted(trends.items()))
            
            return sorted_trends, None
        except Exception as e:
            logger.error("Error getting attendance trends", error=str(e))
            return None, str(e)

    @staticmethod
    def get_at_risk_students(class_id=None, threshold=80):
        """Identify students with attendance rate below a threshold."""
        try:
            # Subquery to calculate attendance rates per student
            subquery = db.session.query(
                Attendance.student_id,
                func.count(Attendance.id).label('total_days'),
                func.sum(func.cast(Attendance.status == 'present', db.Integer)).label('present_days')
            ).group_by(Attendance.student_id).subquery()
            
            query = db.session.query(
                Student,
                subquery.c.total_days,
                subquery.c.present_days
            ).join(subquery, Student.id == subquery.c.student_id)
            
            if class_id:
                query = query.filter(Student.class_id == class_id)
            
            results = query.all()
            
            at_risk_students = []
            for student, total, present in results:
                if total == 0:
                    continue
                
                rate = (present / total) * 100
                if rate < threshold:
                    at_risk_students.append({
                        'student_id': student.id,
                        'name': f"{student.first_name} {student.last_name}",
                        'admission_number': student.admission_number,
                        'attendance_rate': round(rate, 2),
                        'total_days': total,
                        'present_days': present,
                        'absent_days': total - present
                    })
            
            return at_risk_students, None
        except Exception as e:
            logger.error("Error getting at-risk students", error=str(e))
            return None, str(e)
            
    @staticmethod
    def sync_offline_attendance(attendance_data_list, recorded_by):
        """Sync attendance data collected offline."""
        try:
            synced_count = 0
            errors = []
            
            for item in attendance_data_list:
                try:
                    # Validate date
                    if isinstance(item.get('date'), str):
                        item['date'] = datetime.strptime(item['date'], '%Y-%m-%d').date()
                        
                    # Check for duplicates
                    existing = Attendance.query.filter_by(
                        student_id=item['student_id'],
                        date=item['date'],
                        class_id=item['class_id']
                    ).first()
                    
                    if existing:
                        # Update existing
                        existing.status = item['status']
                        existing.remarks = item.get('remarks')
                        existing.recorded_by = recorded_by
                        if not existing.subject_id and item.get('subject_id'):
                            existing.subject_id = item.get('subject_id')
                        existing.updated_at = datetime.utcnow()
                    else:
                        # Create new
                        new_record = Attendance(
                            student_id=item['student_id'],
                            class_id=item['class_id'],
                            subject_id=item.get('subject_id'),
                            date=item['date'],
                            status=item['status'],
                            remarks=item.get('remarks'),
                            recorded_by=recorded_by
                        )
                        db.session.add(new_record)
                    
                    synced_count += 1
                except Exception as e:
                    errors.append({'student_id': item.get('student_id'), 'error': str(e)})
            
            db.session.commit()
            return {'synced': synced_count, 'errors': errors}, None
            
        except Exception as e:
            db.session.rollback()
            logger.error("Error syncing offline attendance", error=str(e))
            return None, str(e)
