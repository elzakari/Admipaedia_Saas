from app import create_app
from app.extensions import db
from app.services.subject_service import SubjectService
from app.models.grade import Grade
from app.models.exam import Exam
from app.models.external_exams import ExternalExamResult

app = create_app()

with app.app_context():
    subject_id = 10
    
    print(f"Attempting to delete subject {subject_id}...")
    
    # First, check what's blocking the deletion
    grade_count = Grade.query.filter_by(subject_id=subject_id).count()
    exam_count = Exam.query.filter_by(subject_id=subject_id).count()
    external_result_count = ExternalExamResult.query.filter_by(subject_id=subject_id).count()
    
    print(f"Related records found:")
    print(f"  - Grades: {grade_count}")
    print(f"  - Exams: {exam_count}")
    print(f"  - External Exam Results: {external_result_count}")
    
    if grade_count > 0 or exam_count > 0 or external_result_count > 0:
        print("\nCleaning up related records...")
        
        # Delete related records
        Grade.query.filter_by(subject_id=subject_id).delete()
        Exam.query.filter_by(subject_id=subject_id).delete()
        ExternalExamResult.query.filter_by(subject_id=subject_id).delete()
        
        print("Related records cleaned up.")
    
    # Now attempt deletion
    success, error = SubjectService.delete_subject(subject_id)
    
    if success:
        print(f"✅ Subject {subject_id} deleted successfully!")
    else:
        print(f"❌ Failed to delete subject {subject_id}: {error}")