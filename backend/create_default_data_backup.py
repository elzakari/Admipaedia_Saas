import random
import string
from datetime import datetime, timedelta
from app import create_app
from app.extensions import db, bcrypt
from app.models.user import User, Role
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.parent import Parent
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.attendance import Attendance
from app.models.exam import Exam
from app.models.grade import Grade
from app.models.associations import teacher_subjects, class_subjects

# Helper functions
def random_date(start_date, end_date):
    time_between_dates = end_date - start_date
    days_between_dates = time_between_dates.days
    random_number_of_days = random.randrange(days_between_dates)
    return start_date + timedelta(days=random_number_of_days)

def random_phone():
    return f"+1-{random.randint(200, 999)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}"

def random_address():
    streets = ["Main St", "Oak Avenue", "Maple Road", "Cedar Lane", "Pine Street", "Elm Boulevard"]
    cities = ["Springfield", "Riverdale", "Lakeside", "Hillcrest", "Meadowbrook", "Forestville"]
    return f"{random.randint(100, 9999)} {random.choice(streets)}, {random.choice(cities)}"

def create_default_data():
    print("Creating default data...")
    
    # Clear existing data (optional - comment out if you want to keep existing data)
    # This is in reverse order of dependencies to avoid foreign key constraint errors
    Grade.query.delete()
    Exam.query.delete()
    Attendance.query.delete()
    db.session.execute(class_subjects.delete())
    db.session.execute(teacher_subjects.delete())
    Student.query.delete()
    Parent.query.delete()
    Class.query.delete()  # Move this before Teacher.query.delete()
    Teacher.query.delete()
    Subject.query.delete()
    User.query.delete()
    Role.query.delete()
    
    # Create roles
    roles = {
        'admin': Role(name='admin', description='Administrator with full access'),
        'teacher': Role(name='teacher', description='Teacher with access to classes and grades'),
        'student': Role(name='student', description='Student with limited access'),
        'parent': Role(name='parent', description='Parent with access to their children\'s data')
    }
    
    for role in roles.values():
        db.session.add(role)
    
    # Create admin user
    admin_user = User(
        username='admin',
        email='admin@admipaedia.com',
        password_hash=bcrypt.generate_password_hash('Admin@123').decode('utf-8'),
        role='admin',
        status='active',
        last_login=datetime.utcnow()
    )
    db.session.add(admin_user)
    
    # Create subjects
    subjects = [
        Subject(name='Mathematics', code='MATH101', description='Basic mathematics including algebra and geometry', department='Mathematics', credit_hours=4),
        Subject(name='English Literature', code='ENG101', description='Study of classic and modern literature', department='English', credit_hours=3),
        Subject(name='Physics', code='PHY101', description='Introduction to physics concepts', department='Science', credit_hours=4),
        Subject(name='Chemistry', code='CHEM101', description='Basic chemistry principles', department='Science', credit_hours=4),
        Subject(name='Biology', code='BIO101', description='Study of living organisms', department='Science', credit_hours=3),
        Subject(name='History', code='HIST101', description='World history overview', department='Social Studies', credit_hours=3),
        Subject(name='Geography', code='GEO101', description='Study of Earth and human geography', department='Social Studies', credit_hours=3),
        Subject(name='Computer Science', code='CS101', description='Introduction to programming', department='Technology', credit_hours=4),
        Subject(name='Physical Education', code='PE101', description='Sports and physical fitness', department='Athletics', credit_hours=2),
        Subject(name='Art', code='ART101', description='Visual arts and creativity', department='Arts', credit_hours=2),
        Subject(name='Music', code='MUS101', description='Music theory and practice', department='Arts', credit_hours=2),
    ]
    
    for subject in subjects:
        db.session.add(subject)
    
    # Create teachers
    teachers = []
    for i in range(1, 16):  # Create 15 teachers
        teacher_user = User(
            username=f'teacher{i}',
            email=f'teacher{i}@admipaedia.com',
            password_hash=bcrypt.generate_password_hash('Teacher@123').decode('utf-8'),
            role='teacher',
            status='active',
            last_login=random_date(datetime.utcnow() - timedelta(days=30), datetime.utcnow())
        )
        db.session.add(teacher_user)
        db.session.flush()  # To get the ID
        
        teacher = Teacher(
            user_id=teacher_user.id,
            employee_id=f'EMP{1000+i}',
            first_name=f'Teacher{i}First',
            last_name=f'Teacher{i}Last',
            date_of_birth=random_date(datetime(1970, 1, 1), datetime(1995, 12, 31)).date(),
            gender=random.choice(['Male', 'Female']),
            address=random_address(),
            phone_number=random_phone(),
            qualification=random.choice(['B.Ed', 'M.Ed', 'Ph.D', 'M.Sc', 'B.Sc']),
            specialization=random.choice(['Mathematics', 'Science', 'Languages', 'Arts', 'Social Studies']),
            joining_date=random_date(datetime(2015, 1, 1), datetime(2023, 12, 31)).date(),
            status='active'
        )
        db.session.add(teacher)
        teachers.append(teacher)
    
    # Create classes
    grades = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th']
    sections = ['A', 'B', 'C']
    classes = []
    
    for grade in grades:
        for section in sections:
            class_name = f'{grade} Grade {section}'
            class_obj = Class(
                name=class_name,
                grade_level=grade,
                section=section,
                academic_year='2023-2024',
                capacity=30,
                teacher_id=random.choice(teachers).id
            )
            db.session.add(class_obj)
            classes.append(class_obj)
    
    db.session.flush()  # To get IDs for classes
    
    # Assign subjects to teachers
    for teacher in teachers:
        # Each teacher teaches 2-4 subjects
        teacher_subject_count = random.randint(2, 4)
        selected_subjects = random.sample(subjects, teacher_subject_count)
        
        for subject in selected_subjects:
            is_primary = random.choice([True, False])
            db.session.execute(
                teacher_subjects.insert().values(
                    teacher_id=teacher.id,
                    subject_id=subject.id,
                    assigned_date=datetime.utcnow(),
                    is_primary=is_primary
                )
            )
    
    # Assign subjects to classes
    for class_obj in classes:
        # Each class has 6-8 subjects
        class_subject_count = random.randint(6, 8)
        selected_subjects = random.sample(subjects, class_subject_count)
        
        for subject in selected_subjects:
            db.session.execute(
                class_subjects.insert().values(
                    class_id=class_obj.id,
                    subject_id=subject.id,
                    assigned_date=datetime.utcnow()
                )
            )
    
    # Create parents
    parents = []
    for i in range(1, 101):  # Create 100 parents
        parent_user = User(
            username=f'parent{i}',
            email=f'parent{i}@example.com',
            password_hash=bcrypt.generate_password_hash('Parent@123').decode('utf-8'),
            role='parent',
            status='active',
            last_login=random_date(datetime.utcnow() - timedelta(days=30), datetime.utcnow())
        )
        db.session.add(parent_user)
        db.session.flush()  # To get the ID
        
        parent = Parent(
            user_id=parent_user.id,
            occupation=random.choice(['Engineer', 'Doctor', 'Teacher', 'Lawyer', 'Business Owner', 'Accountant']),
            address=random_address(),
            emergency_contact=random_phone(),
            relationship=random.choice(['Father', 'Mother', 'Guardian'])
        )
        db.session.add(parent)
        parents.append(parent)
    
    # Create students
    students = []
    blood_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    
    for i in range(1, 301):  # Create 300 students
        student_user = User(
            username=f'student{i}',
            email=f'student{i}@admipaedia.com',
            password_hash=bcrypt.generate_password_hash('Student@123').decode('utf-8'),
            role='student',
            status='active',
            last_login=random_date(datetime.utcnow() - timedelta(days=30), datetime.utcnow())
        )
        db.session.add(student_user)
        db.session.flush()  # To get the ID
        
        # Assign to a random class and parent
        assigned_class = random.choice(classes)
        assigned_parent = random.choice(parents)
        
        student = Student(
            user_id=student_user.id,
            admission_number=f'ADM{2000+i}',
            date_of_birth=random_date(datetime(2005, 1, 1), datetime(2015, 12, 31)).date(),
            gender=random.choice(['Male', 'Female']),
            address=assigned_parent.address,  # Same address as parent
            class_id=assigned_class.id,
            parent_id=assigned_parent.id
        )
        db.session.add(student)
        students.append(student)
    
    db.session.flush()  # To get IDs for students
    
    # Create exams
    exams = []
    exam_types = ['Midterm', 'Final', 'Quiz', 'Project']
    
    for class_obj in classes:
        # Get subjects for this class
        class_subject_ids = db.session.query(class_subjects.c.subject_id).filter(class_subjects.c.class_id == class_obj.id).all()
        class_subject_ids = [id[0] for id in class_subject_ids]
        
        for subject_id in class_subject_ids:
            for exam_type in exam_types:
                exam_date = random_date(datetime(2023, 9, 1), datetime(2024, 5, 31))
                exam = Exam(
                    title=f'{exam_type} - {subjects[subject_id-1].name}',
                    description=f'{exam_type} examination for {subjects[subject_id-1].name}',
                    exam_date=exam_date,
                    duration=random.choice([60, 90, 120]),  # minutes
                    total_marks=random.choice([50, 100]),
                    passing_marks=random.choice([25, 50]),
                    class_id=class_obj.id,
                    subject_id=subject_id,
                    created_by=admin_user.id,
                    status=random.choice(['scheduled', 'completed']) if exam_date > datetime.utcnow() else 'completed'
                )
                db.session.add(exam)
                exams.append(exam)
    
    db.session.flush()  # To get IDs for exams
    
    # Create grades for completed exams
    for exam in exams:
        if exam.status == 'completed':
            # Get students in this class
            class_students = [s for s in students if s.class_id == exam.class_id]
            
            for student in class_students:
                # Generate a random grade
                marks = random.uniform(exam.passing_marks * 0.7, exam.total_marks)
                percentage = (marks / exam.total_marks) * 100
                
                # Determine grade letter based on percentage
                if percentage >= 90:
                    grade_letter = 'A+'
                elif percentage >= 80:
                    grade_letter = 'A'
                elif percentage >= 70:
                    grade_letter = 'B+'
                elif percentage >= 60:
                    grade_letter = 'B'
                elif percentage >= 50:
                    grade_letter = 'C'
                elif percentage >= 40:
                    grade_letter = 'D'
                else:
                    grade_letter = 'F'
                
                grade = Grade(
                    student_id=student.id,
                    exam_id=exam.id,
                    marks_obtained=round(marks, 2),
                    percentage=round(percentage, 2),
                    grade_letter=grade_letter,
                    remarks=random.choice(['Excellent', 'Good effort', 'Needs improvement', 'Satisfactory', '']),
                    graded_by=random.choice(teachers).user_id
                )
                db.session.add(grade)
    
    # Create attendance records
    attendance_statuses = ['present', 'absent', 'late', 'excused']
    
    # Generate attendance for the past 30 school days (excluding weekends)
    current_date = datetime.utcnow().date()
    for i in range(1, 31):
        day = current_date - timedelta(days=i)
        
        # Skip weekends
        if day.weekday() >= 5:  # 5 is Saturday, 6 is Sunday
            continue
        
        for student in students:
            # Students are present most of the time
            status = random.choices(
                attendance_statuses,
                weights=[0.85, 0.05, 0.05, 0.05],  # 85% present, 5% each for other statuses
                k=1
            )[0]
            
            attendance = Attendance(
                student_id=student.id,
                class_id=student.class_id,
                subject_id=random.choice(subjects).id,
                date=day,
                status=status,
                remarks=f"Student was {status}" if status != 'present' else "",
                recorded_by=random.choice(teachers).user_id
            )
            db.session.add(attendance)
    
    # Commit all changes
    db.session.commit()
    print("Default data created successfully!")

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        create_default_data()