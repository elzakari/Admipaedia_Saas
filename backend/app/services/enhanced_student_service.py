import structlog
import pandas as pd
import os
from werkzeug.utils import secure_filename
from flask import current_app
from app.extensions import db
from app.models.class_ import Class
from app.models.student import Student
from app.models.user import User
from app.models.parent import Parent
from app.models.attendance import Attendance
from app.services.auth_service import AuthService
from app.services.student_service import StudentService
from datetime import datetime, timedelta, date
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func, and_, case
import uuid

logger = structlog.get_logger()

class EnhancedStudentService(StudentService):
    """Enhanced service for advanced student operations."""
    
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    UPLOAD_FOLDER = 'uploads/profile_pictures'
    
    @staticmethod
    def allowed_file(filename):
        """Check if file extension is allowed."""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in EnhancedStudentService.ALLOWED_EXTENSIONS
    
    @staticmethod
    def create_student_with_user(student_data, user_data=None):
        """Create a new student with integrated user creation."""
        try:
            # If user_data is provided, create a new user first
            if user_data:
                # Generate username if not provided
                if 'username' not in user_data:
                    base_username = f"{student_data['admission_number']}_student"
                    user_data['username'] = base_username
                
                # Set default role for student
                user_data['roles'] = ['student']
                
                # Create user account
                user = AuthService.register_user(
                    username=user_data['username'],
                    email=user_data['email'],
                    password=user_data['password'],
                    roles=user_data.get('roles', ['student'])
                )
                
                if not user:
                    return None, "Failed to create user account"
                
                student_data['user_id'] = user.id
            
            # Create student profile
            student, error = StudentService.create_student(student_data)
            
            if error:
                # Rollback user creation if student creation fails
                if user_data and 'user_id' in student_data:
                    user_to_delete = User.query.get(student_data['user_id'])
                    if user_to_delete:
                        db.session.delete(user_to_delete)
                        db.session.commit()
                return None, error
            
            logger.info("Student created with integrated user account", 
                       student_id=student.id, user_id=student.user_id)
            
            return student, None
            
        except Exception as e:
            db.session.rollback()
            logger.error("Error creating student with user", error=str(e))
            return None, f"Failed to create student: {str(e)}"
    
    @staticmethod
    def upload_profile_picture(student_id, file):
        """Upload and save student profile picture."""
        try:
            student = Student.query.get(student_id)
            if not student:
                return None, "Student not found"
            
            if file and EnhancedStudentService.allowed_file(file.filename):
                # Generate unique filename
                filename = secure_filename(file.filename)
                unique_filename = f"{student_id}_{uuid.uuid4().hex}_{filename}"
                
                # Create upload directory if it doesn't exist
                upload_path = os.path.join(current_app.root_path, EnhancedStudentService.UPLOAD_FOLDER)
                os.makedirs(upload_path, exist_ok=True)
                
                # Save file
                file_path = os.path.join(upload_path, unique_filename)
                file.save(file_path)
                
                # Update student record with profile picture path
                student.profile_picture = f"{EnhancedStudentService.UPLOAD_FOLDER}/{unique_filename}"
                db.session.commit()
                
                logger.info("Profile picture uploaded", student_id=student_id, filename=unique_filename)
                return student.profile_picture, None
            
            return None, "Invalid file type. Only PNG, JPG, JPEG, and GIF files are allowed."
            
        except Exception as e:
            db.session.rollback()
            logger.error("Error uploading profile picture", error=str(e))
            return None, f"Failed to upload profile picture: {str(e)}"
    
    @staticmethod
    def bulk_import_students(file_path, create_users=False, update_existing=False):
        """Import students from CSV/Excel file with option to update existing records."""
        try:
            # Read file based on extension
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                return None, "Unsupported file format. Use CSV or Excel files."
            
            # Validate required columns
            required_columns = ['admission_number', 'first_name', 'last_name', 'date_of_birth', 'gender']
            if create_users:
                required_columns.extend(['email'])
            
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return None, f"Missing required columns: {', '.join(missing_columns)}"
            
            successful_imports = []
            failed_imports = []
            updated_records = []
            
            # Process in batches for better performance
            batch_size = 100
            for i in range(0, len(df), batch_size):
                batch_df = df[i:i+batch_size]
                # Process batch
                for index, row in batch_df.iterrows():
                    try:
                        # Check if student already exists
                        existing_student = Student.query.filter_by(admission_number=str(row['admission_number'])).first()
                        
                        if existing_student and update_existing:
                            # Update existing student
                            for column in df.columns:
                                if column != 'admission_number' and hasattr(existing_student, column) and pd.notna(row[column]):
                                    value = row[column]
                                    if column == 'date_of_birth':
                                        value = pd.to_datetime(value).date()
                                    setattr(existing_student, column, value)
                            
                            db.session.commit()
                            updated_records.append({
                                'row': index + 1,
                                'student_id': existing_student.id,
                                'admission_number': existing_student.admission_number
                            })
                            continue
                        elif existing_student and not update_existing:
                            failed_imports.append({
                                'row': index + 1,
                                'admission_number': str(row['admission_number']),
                                'error': "Student already exists and update_existing is False"
                            })
                            continue
                        
                        # Prepare student data for new student
                        student_data = {
                            'admission_number': str(row['admission_number']),
                            'first_name': str(row['first_name']),
                            'last_name': str(row['last_name']),
                            'date_of_birth': pd.to_datetime(row['date_of_birth']).date(),
                            'gender': str(row['gender']).lower(),
                        }
                        
                        # Add optional fields if present
                        optional_fields = [
                            'middle_name', 'email', 'phone', 'address', 'class_id', 'parent_id',
                            'place_of_birth', 'religious_denomination', 'nationality', 'blood_group',
                            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
                            'medical_conditions', 'allergies', 'special_needs', 'previous_school',
                            'achievements', 'extracurricular_activities'
                        ]
                        
                        for field in optional_fields:
                            if field in df.columns and pd.notna(row[field]):
                                student_data[field] = str(row[field]) if field not in ['class_id', 'parent_id'] else int(row[field])
                        
                        if create_users:
                            # Prepare user data
                            user_data = {
                                'email': str(row['email']),
                                'username': str(row.get('username', row['admission_number'])),
                                'password': str(row.get('password', 'DefaultPass123!'))
                            }
                            
                            student, error = EnhancedStudentService.create_student_with_user(student_data, user_data)
                        else:
                            # Use existing user_id if provided
                            if 'user_id' in df.columns and pd.notna(row['user_id']):
                                student_data['user_id'] = int(row['user_id'])
                            
                            student, error = StudentService.create_student(student_data)
                        
                        if error:
                            failed_imports.append({
                                'row': index + 1,
                                'admission_number': student_data['admission_number'],
                                'error': error
                            })
                        else:
                            successful_imports.append({
                                'row': index + 1,
                                'student_id': student.id,
                                'admission_number': student.admission_number
                            })
                            
                    except Exception as e:
                        failed_imports.append({
                            'row': index + 1,
                            'admission_number': row.get('admission_number', 'Unknown'),
                            'error': str(e)
                        })
            
            result = {
                'successful_count': len(successful_imports),
                'failed_count': len(failed_imports),
                'updated_count': len(updated_records),
                'successful_imports': successful_imports,
                'failed_imports': failed_imports,
                'updated_records': updated_records
            }
            
            logger.info("Bulk import completed", 
                       successful=len(successful_imports), 
                       failed=len(failed_imports),
                       updated=len(updated_records))
            
            return result, None
            
        except Exception as e:
            logger.error("Error in bulk import", error=str(e))
            return None, f"Failed to import students: {str(e)}"
    
    @staticmethod
    def get_student_analytics(student_id, date_from=None, date_to=None):
        """Get comprehensive analytics for a student."""
        try:
            student = Student.query.get(student_id)
            if not student:
                return None, "Student not found"
            
            # Set default date range (last 30 days)
            if not date_from:
                date_from = datetime.now() - timedelta(days=30)
            if not date_to:
                date_to = datetime.now()
            
            # Attendance analytics
            attendance_query = Attendance.query.filter(
                and_(
                    Attendance.student_id == student_id,
                    Attendance.date >= date_from,
                    Attendance.date <= date_to
                )
            )
            
            total_days = attendance_query.count()
            present_days = attendance_query.filter(Attendance.status == 'present').count()
            absent_days = attendance_query.filter(Attendance.status == 'absent').count()
            late_days = attendance_query.filter(Attendance.status == 'late').count()
            
            # Late counts as present for the rate calculation
            attendance_rate = ((present_days + late_days) / total_days * 100) if total_days > 0 else 0
            
            # Performance analytics
            from app.models.grade import Grade
            from app.models.subject import Subject
            
            performance_query = db.session.query(
                func.avg(Grade.percentage).label('avg_score'),
                func.count(Grade.id).label('total_exams')
            ).filter(Grade.student_id == student_id)
            
            perf_stats = performance_query.first()
            
            subjects_perf = db.session.query(
                Subject.name.label('subject'),
                func.avg(Grade.percentage).label('average_score')
            ).join(Grade, Grade.subject_id == Subject.id)\
             .filter(Grade.student_id == student_id)\
             .group_by(Subject.id, Subject.name).all()
            
            performance_data = {
                'average_grade': float(perf_stats.avg_score) if perf_stats and perf_stats.avg_score else 0,
                'total_exams': perf_stats.total_exams if perf_stats else 0,
                'subjects_performance': [
                    {'subject': p.subject, 'average_score': float(p.average_score)} 
                    for p in subjects_perf
                ]
            }
            
            # Get weekly attendance trends
            week_expr = func.date_trunc('week', Attendance.date)
            weekly_attendance = db.session.query(
                week_expr.label('week_date'),
                func.count(Attendance.id).label('total'),
                func.sum(func.cast(Attendance.status == 'present', db.Integer)).label('present')
            ).filter(
                and_(
                    Attendance.student_id == student_id,
                    Attendance.date >= date_from,
                    Attendance.date <= date_to
                )
            ).group_by(week_expr).all()

            trends = []
            for week_data in weekly_attendance:
                week_val = week_data.week_date
                if week_val:
                    trends.append({
                        'week': week_val.isoformat() if hasattr(week_val, 'isoformat') else str(week_val),
                        'rate': (week_data.present / week_data.total * 100) if week_data.total > 0 else 0
                    })
            
            analytics = {
                'student_id': student_id,
                'period': {
                    'from': date_from.isoformat(),
                    'to': date_to.isoformat()
                },
                'attendance': {
                    'total_days': total_days,
                    'present_days': present_days,
                    'absent_days': absent_days,
                    'late_days': late_days,
                    'attendance_rate': round(attendance_rate, 2)
                },
                'performance': performance_data,
                'trends': {
                    'weekly_attendance': trends
                }
            }
            
            return analytics, None
            
        except Exception as e:
            logger.error("Error getting student analytics", error=str(e))
            return None, f"Failed to get analytics: {str(e)}"
    
    @staticmethod
    def get_overall_analytics_summary(tenant_id=None, class_id=None, date_from=None, date_to=None):
        """Get overall analytics summary for all students or a specific class."""
        try:
            from app.models.student import Student
            from app.models.attendance import Attendance
            from app.models.class_ import Class
            from app.models.grade import Grade
            from sqlalchemy import func, case

            # 1. Total Students
            student_query = Student.query
            if tenant_id is not None:
                student_query = student_query.filter(Student.tenant_id == tenant_id)
            if class_id:
                student_query = student_query.filter(Student.class_id == class_id)
            total_students = student_query.count()

            # 2. Average Attendance Rate
            attendance_query = Attendance.query.join(Student)
            if tenant_id is not None:
                attendance_query = attendance_query.filter(Student.tenant_id == tenant_id)
            if class_id:
                attendance_query = attendance_query.filter(Student.class_id == class_id)
            
            if date_from:
                attendance_query = attendance_query.filter(Attendance.date >= (date_from.date() if hasattr(date_from, 'date') else date_from))
            if date_to:
                attendance_query = attendance_query.filter(Attendance.date <= (date_to.date() if hasattr(date_to, 'date') else date_to))

            total_attendance = attendance_query.count()
            present_attendance = attendance_query.filter(Attendance.status.in_(['present', 'late'])).count()
            avg_attendance = (present_attendance / total_attendance * 100) if total_attendance > 0 else 0

            # 3. Average Performance (overall average grade percentage)
            performance_query = db.session.query(func.avg(Grade.percentage)).join(Student)
            if tenant_id is not None:
                performance_query = performance_query.filter(Student.tenant_id == tenant_id)
            if class_id:
                performance_query = performance_query.filter(Student.class_id == class_id)
            overall_avg_performance = float(performance_query.scalar() or 0)

            # 4. At-risk students (attendance below threshold)
            threshold = 80
            present_days_expr = func.sum(case((Attendance.status.in_(['present', 'late']), 1), else_=0)).label('present_days')
            attendance_rollup = db.session.query(
                Student.id.label('student_id'),
                func.count(Attendance.id).label('total_days'),
                present_days_expr,
            ).join(Attendance, Attendance.student_id == Student.id)
            if tenant_id is not None:
                attendance_rollup = attendance_rollup.filter(Student.tenant_id == tenant_id)
            if class_id:
                attendance_rollup = attendance_rollup.filter(Student.class_id == class_id)
            if date_from:
                attendance_rollup = attendance_rollup.filter(Attendance.date >= date_from.date() if hasattr(date_from, 'date') else date_from)
            if date_to:
                attendance_rollup = attendance_rollup.filter(Attendance.date <= date_to.date() if hasattr(date_to, 'date') else date_to)
            attendance_rollup = attendance_rollup.group_by(Student.id)

            at_risk_students_count = 0
            for row in attendance_rollup.all():
                total = int(row.total_days or 0)
                present = int(row.present_days or 0)
                if total <= 0:
                    continue
                rate = (present / total) * 100
                if rate < threshold:
                    at_risk_students_count += 1

            # 5. Class Performance
            class_performance = []
            classes_query = Class.query
            if tenant_id is not None:
                classes_query = classes_query.filter(Class.tenant_id == tenant_id)
            classes = classes_query.all()
            for cls in classes:
                # Average percentage for this class
                avg_query = db.session.query(func.avg(Grade.percentage)).join(Student).filter(Student.class_id == cls.id)
                if tenant_id is not None:
                    avg_query = avg_query.filter(Student.tenant_id == tenant_id)
                avg_percentage = avg_query.scalar() or 0
                class_performance.append({
                    'class_name': cls.name,
                    'average_score': float(avg_percentage)
                })

            # 6. Academic Trends (Monthly average scores)
            dialect = None
            try:
                dialect = db.session.bind.dialect.name if db.session.bind else None
            except Exception:
                dialect = None
            if dialect == 'postgresql':
                month_expr = func.date_trunc('month', Grade.created_at)
            elif dialect == 'sqlite':
                month_expr = func.strftime('%Y-%m-01', Grade.created_at)
            else:
                month_expr = func.date(Grade.created_at)

            trends_query = db.session.query(month_expr.label('month'), func.avg(Grade.percentage).label('avg_score')).join(Student)
            if tenant_id is not None:
                trends_query = trends_query.filter(Student.tenant_id == tenant_id)
            if class_id:
                trends_query = trends_query.filter(Student.class_id == class_id)

            academic_trends = trends_query.group_by(month_expr).order_by(month_expr).all()
            
            trends_data = []
            for t in academic_trends:
                if t.month:
                    trends_data.append({
                        'date': t.month.isoformat() if hasattr(t.month, 'isoformat') else str(t.month),
                        'average_score': float(t.avg_score)
                    })

            summary = {
                'total_students': total_students,
                'average_attendance_rate': float(avg_attendance),
                'average_performance_score': float(overall_avg_performance),
                'at_risk_students_count': int(at_risk_students_count),
                'class_performance': class_performance,
                'trends': trends_data
            }

            return summary, None

        except Exception as e:
            logger.error("Error getting analytics summary", error=str(e))
            return None, f"Failed to get summary: {str(e)}"

    @staticmethod
    def link_student_to_parent(student_id, parent_id):
        """Link a student to a parent account."""
        try:
            student = Student.query.get(student_id)
            if not student:
                return None, "Student not found"
            
            parent = Parent.query.get(parent_id)
            if not parent:
                return None, "Parent not found"
            
            # Update student's parent_id
            student.parent_id = parent_id
            db.session.commit()
            
            logger.info("Student linked to parent", student_id=student_id, parent_id=parent_id)
            return student, None
            
        except Exception as e:
            db.session.rollback()
            logger.error("Error linking student to parent", error=str(e))
            return None, f"Failed to link student to parent: {str(e)}"
    
    @staticmethod
    def get_students_by_parent(parent_id):
        """Get all students linked to a parent with optimized query."""
        try:
            # Use joinedload to prevent N+1 queries when accessing related data
            from sqlalchemy.orm import joinedload
            
            students = Student.query.options(
                joinedload(Student.user),
                joinedload(Student.class_),
                joinedload(Student.parent)
            ).filter_by(parent_id=parent_id).all()
            
            return students, None
            
        except Exception as e:
            logger.error("Error getting students by parent", error=str(e))
            return None, f"Failed to get students: {str(e)}"
    
    @staticmethod
    def generate_student_report(student_id, report_type='comprehensive'):
        """Generate comprehensive student report."""
        try:
            student = Student.query.get(student_id)
            if not student:
                return None, "Student not found"
            
            # Get analytics data
            analytics, error = EnhancedStudentService.get_student_analytics(student_id)
            if error:
                return None, error
            
            # Basic student information
            report = {
                'student_info': {
                    'id': student.id,
                    'admission_number': student.admission_number,
                    'user': {
                        'username': student.user.username,
                        'email': student.user.email
                    } if student.user else None,
                    'date_of_birth': student.date_of_birth.isoformat(),
                    'gender': student.gender,
                    'address': student.address,
                    'class_id': student.class_id,
                    'parent_id': student.parent_id
                },
                'analytics': analytics,
                'generated_at': datetime.now().isoformat(),
                'report_type': report_type
            }
            
            return report, None
            
        except Exception as e:
            logger.error("Error generating student report", error=str(e))
            return None, f"Failed to generate report: {str(e)}"
    
    @staticmethod
    def export_students_to_csv(class_id=None, grade_level=None, status=None, fields=None):
        """Export students to CSV file with optional filtering and field selection."""
        try:
            # Build query with filters
            query = Student.query
            
            if class_id:
                query = query.filter(Student.class_id == class_id)
                
            if grade_level:
                # Assuming Class model is imported or available via relationship
                query = query.join(Student.class_).filter(Class.grade_level == grade_level)
                
            if status:
                query = query.filter(Student.status == status)
                
            students = query.all()
            
            if not students:
                return None, "No students found matching the criteria"
            
            # Define default fields if none specified
            default_fields = [
                'id', 'admission_number', 'first_name', 'last_name', 'middle_name',
                'date_of_birth', 'gender', 'email', 'phone', 'address', 'class_id', 'status'
            ]
            
            export_fields = fields if fields else default_fields
            
            # Create a DataFrame from student data
            data = []
            for student in students:
                student_data = {}
                for field in export_fields:
                    if hasattr(student, field):
                        value = getattr(student, field)
                        # Format date fields
                        if isinstance(value, (date, datetime)):
                            value = value.isoformat()
                        student_data[field] = value
                data.append(student_data)
            
            df = pd.DataFrame(data)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"students_export_{timestamp}.csv"
            rel_path = os.path.join('uploads', 'exports', filename)
            file_path = os.path.join(current_app.root_path, rel_path)
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Save to CSV
            df.to_csv(file_path, index=False)
            
            return rel_path.replace('\\', '/'), None
            
        except Exception as e:
            logger.error("Error exporting students", error=str(e))
            return None, f"Failed to export students: {str(e)}"

    @staticmethod
    def export_students_to_excel(class_id=None, grade_level=None, status=None, fields=None):
        """Export students to Excel file with optional filtering and field selection."""
        try:
            # Similar to CSV export but with Excel output
            # Build query with filters
            query = Student.query
            
            if class_id:
                query = query.filter(Student.class_id == class_id)
                
            if grade_level and hasattr(Class, 'grade_level'):
                query = query.join(Class).filter(Class.grade_level == grade_level)
                
            if status:
                query = query.filter(Student.status == status)
                
            students = query.all()
            
            if not students:
                return None, "No students found matching the criteria"
            
            # Define default fields if none specified
            default_fields = [
                'id', 'admission_number', 'first_name', 'last_name', 'middle_name',
                'date_of_birth', 'gender', 'email', 'phone', 'address', 'class_id', 'status'
            ]
            
            export_fields = fields if fields else default_fields
            
            # Create a DataFrame from student data
            data = []
            for student in students:
                student_data = {}
                for field in export_fields:
                    if hasattr(student, field):
                        value = getattr(student, field)
                        # Format date fields
                        if isinstance(value, (date, datetime)):
                            value = value.isoformat()
                        student_data[field] = value
                data.append(student_data)
            
            df = pd.DataFrame(data)
            
            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"students_export_{timestamp}.xlsx"
            rel_path = os.path.join('uploads', 'exports', filename)
            file_path = os.path.join(current_app.root_path, rel_path)
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Save to Excel
            df.to_excel(file_path, index=False)
            
            return rel_path.replace('\\', '/'), None
            
        except Exception as e:
            logger.error("Error exporting students to Excel", error=str(e))
            return None, f"Failed to export students to Excel: {str(e)}"
