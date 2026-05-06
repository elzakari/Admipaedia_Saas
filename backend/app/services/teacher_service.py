import structlog
from app.extensions import db
from app.models.teacher import Teacher
from app.models.user import User
from datetime import datetime, timedelta
from app.models.teacher_attendance import TeacherAttendance
from sqlalchemy.exc import SQLAlchemyError
# Import at the top level
from app.websockets.teachers import broadcast_teacher_update
from app.services.cache_service import get_cache_service
from app.schemas.teacher import TeacherSchema

logger = structlog.get_logger()
cache_service = get_cache_service()
teacher_schema = TeacherSchema()

class TeacherService:
    """Service for teacher-related operations."""
    
    @staticmethod
    def get_all_teachers(page=1, per_page=20, status=None, specialization=None, search=None, tenant_id=None):
        """Get all teachers with optional filtering and pagination."""
        from sqlalchemy.orm import joinedload
        import traceback
        
        try:
            query = Teacher.query.options(
                joinedload(Teacher.user),
                joinedload(Teacher.subjects)
            )

            if tenant_id is not None and hasattr(Teacher, 'tenant_id'):
                query = query.filter(Teacher.tenant_id == tenant_id)
            
            if status and status.strip():
                query = query.filter(Teacher.status == status)
                
            if specialization and specialization.strip():
                query = query.filter(Teacher.specialization.ilike(f"%{specialization.strip()}%"))

            if search and str(search).strip():
                s = f"%{str(search).strip()}%"
                query = query.join(User).filter(
                    (Teacher.first_name.ilike(s)) |
                    (Teacher.last_name.ilike(s)) |
                    (Teacher.employee_id.ilike(s)) |
                    (User.email.ilike(s))
                )
                
            return query.order_by(Teacher.last_name).paginate(page=page, per_page=per_page, error_out=False)
        except Exception as e:
            logger.error("Error in get_all_teachers", error=str(e), traceback=traceback.format_exc())
            # Return an empty pagination-like object or re-raise
            raise
    
    @staticmethod
    def get_teacher_by_id(teacher_id):
        """Get a teacher by ID. Always returns a Teacher model instance."""
        from sqlalchemy.orm import joinedload
        
        # Query database
        teacher = Teacher.query.options(
            joinedload(Teacher.user),
            joinedload(Teacher.subjects)
        ).get(teacher_id)
        
        # Cache the DTO if found
        if teacher:
            cache_key = f"teacher:dto:{teacher_id}"
            cache_service.set(cache_key, teacher_schema.dump(teacher), ttl=600)
        
        return teacher

    @staticmethod
    def get_teacher_dto(teacher_id):
        """Get a teacher DTO (dict) by ID, using cache if available."""
        cache_key = f"teacher:dto:{teacher_id}"
        cached_teacher = cache_service.get(cache_key)
        if cached_teacher:
            return cached_teacher
            
        teacher = TeacherService.get_teacher_by_id(teacher_id)
        if teacher:
            return teacher_schema.dump(teacher)
        return None
    
    @staticmethod
    def get_teacher_by_user_id(user_id):
        """Get a teacher by user ID."""
        return Teacher.query.filter_by(user_id=user_id).first()
    
    @staticmethod
    def get_teacher_by_employee_id(employee_id):
        """Get a teacher by employee ID."""
        return Teacher.query.filter_by(employee_id=employee_id).first()
    
    @staticmethod
    def create_teacher(data, tenant_id=None):
        """Create a new teacher."""
        try:
            # Handle user creation from email if user_id not provided
            user_id = data.get('user_id')
            if not user_id:
                # Create user from email if provided
                email = data.get('email')
                if not email:
                    return None, "Email is required to create teacher"
                
                # Check if user exists by email
                user = User.query.filter_by(email=email).first()
                if not user:
                    # Create new user
                    user = User(
                        email=email,
                        first_name=data.get('first_name', ''),
                        last_name=data.get('last_name', ''),
                        role='teacher'
                    )
                    user.set_password_hash('Password123!')
                    db.session.add(user)
                    db.session.flush()  # Get user ID without committing
                
                user_id = user.id
                data['user_id'] = user_id
            else:
                # Check if user exists
                user = User.query.get(user_id)
                if not user:
                    return None, "User not found"
    
            # Generate employee_id if not provided; otherwise validate uniqueness
            if not data.get('employee_id'):
                from app.models.staff import Staff
                # Auto-generate if missing
                generated = Teacher.generate_employee_id(tenant_id=tenant_id)
                while True:
                    tq = Teacher.query.filter_by(employee_id=generated)
                    sq = Staff.query.filter_by(employee_id=generated)
                    if tenant_id is not None and hasattr(Teacher, 'tenant_id'):
                        tq = tq.filter(Teacher.tenant_id == tenant_id)
                    if tenant_id is not None and hasattr(Staff, 'tenant_id'):
                        sq = sq.filter(Staff.tenant_id == tenant_id)
                    if not tq.first() and not sq.first():
                        break
                    generated = Teacher.generate_employee_id(tenant_id=tenant_id)
                data['employee_id'] = generated
            else:
                tq = Teacher.query.filter_by(employee_id=data['employee_id'])
                if tenant_id is not None and hasattr(Teacher, 'tenant_id'):
                    tq = tq.filter(Teacher.tenant_id == tenant_id)
                if tq.first():
                    return None, "Employee ID already exists"
    
            # Check if user already has a teacher profile
            if Teacher.query.filter_by(user_id=user_id).first():
                return None, "User already has a teacher profile"
    
            payload = dict(data)
            if tenant_id is not None and 'tenant_id' not in payload and hasattr(Teacher, 'tenant_id'):
                payload['tenant_id'] = tenant_id
            new_teacher = Teacher(**payload)
            db.session.add(new_teacher)
            try:
                from app.models.tenant import TenantMembership
                if tenant_id is not None:
                    existing = TenantMembership.query.filter_by(user_id=user_id, tenant_id=tenant_id).first()
                    if not existing:
                        db.session.add(TenantMembership(
                            tenant_id=tenant_id,
                            user_id=user_id,
                            role='teacher',
                            status='active'
                        ))
            except Exception:
                pass
            db.session.commit()
            cache_service.delete(f"teacher:dto:{new_teacher.id}")
    
            # Broadcast the event
            broadcast_teacher_update(new_teacher.id, 'teacher_created')
    
            logger.info("Teacher created", teacher_id=new_teacher.id, user_id=new_teacher.user_id)
            return new_teacher, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error creating teacher", error=str(e))
            return None, str(e)
    
    @staticmethod
    def update_teacher(teacher_id, teacher_data, tenant_id=None):
        """Update an existing teacher."""
        try:
            teacher = Teacher.query.get(teacher_id)
            if not teacher:
                return None, "Teacher not found"

            if tenant_id is not None and hasattr(teacher, 'tenant_id') and teacher.tenant_id != tenant_id:
                return None, "Teacher not found"
                
            # Check if employee_id is being changed and is unique
            if 'employee_id' in teacher_data and teacher_data['employee_id'] != teacher.employee_id:
                q = Teacher.query.filter_by(employee_id=teacher_data['employee_id'])
                if tenant_id is not None and hasattr(Teacher, 'tenant_id'):
                    q = q.filter(Teacher.tenant_id == tenant_id)
                if q.first():
                    return None, "Employee ID already exists"
            
            for key, value in teacher_data.items():
                setattr(teacher, key, value)
            
            teacher.updated_at = datetime.utcnow()
            db.session.commit()
            cache_service.delete(f"teacher:dto:{teacher_id}")
            
            # Broadcast the update event
            broadcast_teacher_update(teacher.id, 'teacher_updated')
            
            logger.info("Teacher updated", teacher_id=teacher.id)
            return teacher, None
        except Exception as e:
            db.session.rollback()
            logger.error("Error updating teacher", error=str(e), teacher_id=teacher_id)
            return None, str(e)
    
    @staticmethod
    def get_teacher_subjects(teacher_id):
        """Get subjects taught by a teacher."""
        try:
            teacher = Teacher.query.get(teacher_id)
            if not teacher:
                return None
            
            return teacher.subjects
        except Exception as e:
            logger.error("Error fetching teacher subjects", error=str(e), teacher_id=teacher_id)
            return None
    
    @staticmethod
    def delete_teacher(teacher_id):
        """Delete a teacher."""
        try:
            teacher = Teacher.query.get(teacher_id)
            if not teacher:
                return False, "Teacher not found"
                
            db.session.delete(teacher)
            db.session.commit()
            cache_service.delete(f"teacher:dto:{teacher_id}")
            
            # Broadcast the delete event
            broadcast_teacher_update(teacher_id, 'teacher_deleted')
            
            logger.info("Teacher deleted", teacher_id=teacher_id)
            return True, None
        except Exception as e:
            db.session.rollback()
            logger.error("Error deleting teacher", error=str(e), teacher_id=teacher_id)
            return False, str(e)
    
    @staticmethod
    def update_teacher_status(teacher_id, status):
        """Update a teacher's status."""
        try:
            teacher = Teacher.query.get(teacher_id)
            if not teacher:
                return None, "Teacher not found"
            
            teacher.status = status
            teacher.updated_at = datetime.utcnow()
            db.session.commit()
            cache_service.delete(f"teacher:dto:{teacher_id}")
            
            # Broadcast the status update event
            broadcast_teacher_update(teacher.id, 'teacher_updated')
            
            logger.info("Teacher status updated", teacher_id=teacher.id, status=status)
            return teacher, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error updating teacher status", error=str(e), teacher_id=teacher_id)
            return None, str(e)

    
    # Add these methods to the TeacherService class
    @staticmethod
    def get_teacher_attendance(teacher_id, page=1, per_page=20, start_date=None, end_date=None):
        """Get attendance records for a teacher with optional date filtering."""
        try:
            query = TeacherAttendance.query.filter(TeacherAttendance.teacher_id == teacher_id)
            
            if start_date:
                query = query.filter(TeacherAttendance.date >= start_date)
            
            if end_date:
                query = query.filter(TeacherAttendance.date <= end_date)
                
            return query.order_by(TeacherAttendance.date.desc()).paginate(page=page, per_page=per_page), None
        except Exception as e:
            logger.error("Error fetching teacher attendance", error=str(e), teacher_id=teacher_id)
            return None, str(e)
    
    @staticmethod
    def mark_teacher_attendance(teacher_id, attendance_data):
        """Mark attendance for a teacher."""
        try:
            # Check if teacher exists
            teacher = Teacher.query.get(teacher_id)
            if not teacher:
                return None, "Teacher not found"
            
            # Check if attendance record already exists for this date
            existing_attendance = TeacherAttendance.query.filter_by(
                teacher_id=teacher_id,
                date=attendance_data['date']
            ).first()
            
            if existing_attendance:
                # Update existing record
                for key, value in attendance_data.items():
                    setattr(existing_attendance, key, value)
                existing_attendance.updated_at = datetime.utcnow()
                db.session.commit()
                logger.info("Teacher attendance updated", teacher_id=teacher_id, date=attendance_data['date'])
                return existing_attendance, None
            else:
                # Create new record
                new_attendance = TeacherAttendance(
                    teacher_id=teacher_id,
                    **attendance_data
                )
                db.session.add(new_attendance)
                db.session.commit()
                logger.info("Teacher attendance created", teacher_id=teacher_id, date=attendance_data['date'])
                return new_attendance, None
        except Exception as e:
            db.session.rollback()
            logger.error("Error marking teacher attendance", error=str(e), teacher_id=teacher_id)
            return None, str(e)

    @staticmethod
    def get_teacher_stats(teacher_id):
        """Get summary statistics for a teacher."""
        try:
            from app.models.class_ import Class
            from app.models.student import Student
            from app.models.assignment import Assignment
            from app.models.exam import Exam
            from sqlalchemy import func

            teacher = Teacher.query.get(teacher_id)
            if not teacher:
                return None, "Teacher not found"

            # Get classes taught by teacher
            classes = Class.query.filter_by(teacher_id=teacher_id).all()
            total_classes = len(classes)
            
            # Get total students in those classes
            class_ids = [c.id for c in classes]
            total_students = Student.query.filter(Student.class_id.in_(class_ids)).count() if class_ids else 0
            
            # Get pending assignments
            pending_assignments = Assignment.query.filter(
                Assignment.teacher_id == teacher_id,
                Assignment.status == 'active',
                Assignment.due_date >= datetime.utcnow()
            ).count()
            
            # Get upcoming exams
            upcoming_exams = Exam.query.filter(
                Exam.class_id.in_(class_ids) if class_ids else False,
                Exam.status == 'scheduled',
                Exam.exam_date >= datetime.utcnow()
            ).count()

            return [
                {
                    'name': 'Total Classes',
                    'value': str(total_classes),
                    'trend': '+1',
                    'trendDirection': 'up'
                },
                {
                    'name': 'Students Taught',
                    'value': str(total_students),
                    'trend': '+12',
                    'trendDirection': 'up'
                },
                {
                    'name': 'Pending Assignments',
                    'value': str(pending_assignments),
                    'trend': '-2',
                    'trendDirection': 'down'
                },
                {
                    'name': 'Upcoming Exams',
                    'value': str(upcoming_exams),
                    'trend': '+3',
                    'trendDirection': 'up'
                }
            ], None
        except Exception as e:
            logger.error("Error fetching teacher stats", error=str(e), teacher_id=teacher_id)
            return None, str(e)

    @staticmethod
    def get_teacher_analytics(teacher_id):
        """Get detailed analytics for a teacher dashboard."""
        try:
            stats, error = TeacherService.get_teacher_stats(teacher_id)
            if error:
                return None, error

            # Attendance analytics (last 30 days)
            from app.models.teacher_attendance import TeacherAttendance
            from sqlalchemy import func
            
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=30)
            
            attendance_records = TeacherAttendance.query.filter(
                TeacherAttendance.teacher_id == teacher_id,
                TeacherAttendance.date >= start_date,
                TeacherAttendance.date <= end_date
            ).all()
            
            # Process attendance for chart
            attendance_data = []
            current_date = start_date
            while current_date <= end_date:
                record = next((r for r in attendance_records if r.date == current_date), None)
                attendance_data.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'status': record.status if record else 'absent'
                })
                current_date += timedelta(days=1)

            # Class performance analytics (mock or calculated)
            from app.models.class_ import Class
            classes = Class.query.filter_by(teacher_id=teacher_id).all()
            class_performance = []
            for c in classes:
                # In a real app, calculate average grade for the class
                class_performance.append({
                    'name': c.name,
                    'performance': 85  # Mock data
                })

            # Additional data expected by frontend
            # 1. Upcoming Lessons
            from app.models.timetable import TimetableSlot
            from app.models.subject import Subject
            
            upcoming_lessons = db.session.query(
                TimetableSlot.id,
                Subject.name.label('subject'),
                Class.name.label('class_name'),
                # TimetableSlot doesn't have start_time/end_time directly, it has period_id
                # We should join with Period
            ).join(Subject, TimetableSlot.subject_id == Subject.id)\
             .join(Class, TimetableSlot.class_id == Class.id)\
             .filter(TimetableSlot.teacher_id == teacher_id)\
             .limit(5).all()
            
            lessons_data = []
            for l in upcoming_lessons:
                lessons_data.append({
                    'id': l.id,
                    'subject': l.subject,
                    'class_name': l.class_name,
                    'start_time': '09:00', # Mock for now as Period join is needed
                    'end_time': '10:00',
                    'room': 'Room 101'
                })

            # 2. Recent Activities
            recent_activities = [
                {
                    'id': 1,
                    'title': 'Assignment Created',
                    'description': 'Created new assignment for 5th Grade C',
                    'timestamp': '2 hours ago',
                    'type': 'assignment'
                },
                {
                    'id': 2,
                    'title': 'Attendance Marked',
                    'description': 'Marked attendance for 4th Grade A',
                    'timestamp': '5 hours ago',
                    'type': 'attendance'
                }
            ]

            # 3. At-Risk Students
            at_risk_students = [
                {
                    'id': 101,
                    'name': 'John Doe',
                    'risk': 'high',
                    'reason': 'Consistently low assessment scores (below 40%)'
                },
                {
                    'id': 102,
                    'name': 'Jane Smith',
                    'risk': 'medium',
                    'reason': 'Frequent absences (3 in last week)'
                }
            ]

            pending_assignments_stat = next((s['value'] for s in stats if s['name'] == 'Pending Assignments'), '0')

            return {
                'stats': stats,
                'attendance': attendance_data,
                'classData': class_performance,
                'performance': [80, 82, 85, 84, 88, 85], # Mock trend data
                'upcomingLessons': lessons_data,
                'recentActivities': recent_activities,
                'atRiskStudents': at_risk_students,
                'pendingTasks': int(pending_assignments_stat)
            }, None
        except Exception as e:
            logger.error("Error fetching teacher analytics", error=str(e), teacher_id=teacher_id)
            return None, str(e)

    @staticmethod
    def get_teacher_ai_insights(teacher_id):
        """Generate AI-powered insights for a teacher."""
        try:
            teacher = Teacher.query.get(teacher_id)
            if not teacher:
                return None, "Teacher not found"

            # Mock AI data for now - in a real app, this would come from an AI model
            # or complex analysis of teacher data
            insights = {
                'performance_score': 88,
                'trend_data': {
                    '2024-01': 85,
                    '2024-02': 87,
                    '2024-03': 88
                },
                'performance_data': {
                    'factors': [
                        'Consistent attendance records',
                        'High student engagement in Grade 10',
                        'Timely assignment grading'
                    ]
                },
                'current_workload': 82,
                'recommended_workload': 75,
                'workload_suggestions': [
                    'Consider delegating Grade 9 administrative tasks',
                    'Optimize lesson planning using templates',
                    'Schedule focused grading blocks'
                ],
                'attendance_rate': 94,
                'participation_rate': 86,
                'strengths': [
                    'Clear communication of complex concepts',
                    'Excellent classroom management',
                    'Strong rapport with students'
                ],
                'improvement_areas': [
                    'Integration of digital tools in lessons',
                    'Differentiated instruction for diverse learners'
                ],
                'recommended_courses': [
                    'Advanced Digital Pedagogy',
                    'Inclusive Classroom Strategies',
                    'Data-Driven Instruction'
                ],
                'skill_gaps': [
                    'Virtual reality in education',
                    'Special needs identification'
                ],
                'career_path': 'Senior Academic Coordinator'
            }

            return insights, None
        except Exception as e:
            logger.error("Error generating teacher AI insights", error=str(e), teacher_id=teacher_id)
            return None, str(e)
