from app import create_app
from app.models.subject import Subject
from app.models.grade import Grade
from app.models.exam import Exam
from app.models.external_exams import ExternalExamResult

app = create_app()
with app.app_context():
    # Check all subjects
    subjects = Subject.query.all()
    print(f"Total subjects: {len(subjects)}")
    for subject in subjects:
        print(f"ID: {subject.id}, Code: {subject.code}, Name: {subject.name}")
    
    # Check if subject ID 10 exists
    subject_10 = Subject.query.get(10)
    if subject_10:
        print(f"\nSubject ID 10: {subject_10.code} - {subject_10.name}")
        
        # Check related records
        grades_count = Grade.query.filter_by(subject_id=10).count()
        exams_count = Exam.query.filter_by(subject_id=10).count()
        external_count = ExternalExamResult.query.filter_by(subject_id=10).count()
        
        print(f"Related records - Grades: {grades_count}, Exams: {exams_count}, External: {external_count}")
    else:
        print("\nSubject ID 10 does not exist in the database")