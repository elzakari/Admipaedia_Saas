from app import create_app
from app.extensions import db
from app.services.subject_service import SubjectService
from app.models.grade import Grade
from app.models.exam import Exam
from app.models.external_exams import ExternalExamResult
from app.models.subject import Subject

app = create_app()

with app.app_context():
    subject_id = 7
    
    # First, check if the subject exists
    subject = Subject.query.get(subject_id)
    if not subject:
        print(f"❌ Subject {subject_id} does not exist in the database")
        exit()
    
    print(f"Found subject: {subject.code} - {subject.name}")
    print(f"Attempting to delete subject {subject_id}...")
    
    # Check what's blocking the deletion
    grade_count = Grade.query.filter_by(subject_id=subject_id).count()
    exam_count = Exam.query.filter_by(subject_id=subject_id).count()
    external_result_count = ExternalExamResult.query.filter_by(subject_id=subject_id).count()
    
    print(f"\nRelated records found:")
    print(f"  - Grades: {grade_count}")
    print(f"  - Exams: {exam_count}")
    print(f"  - External Exam Results: {external_result_count}")
    
    if grade_count > 0 or exam_count > 0 or external_result_count > 0:
        print("\n⚠️  Related records found. Cleaning up...")
        
        # Delete related records
        if grade_count > 0:
            Grade.query.filter_by(subject_id=subject_id).delete()
            print(f"  ✅ Deleted {grade_count} grade records")
            
        if exam_count > 0:
            Exam.query.filter_by(subject_id=subject_id).delete()
            print(f"  ✅ Deleted {exam_count} exam records")
            
        if external_result_count > 0:
            ExternalExamResult.query.filter_by(subject_id=subject_id).delete()
            print(f"  ✅ Deleted {external_result_count} external exam result records")
        
        # Commit the cleanup
        db.session.commit()
        print("\n✅ Related records cleaned up successfully.")
    else:
        print("\n✅ No related records found.")
    
    # Now attempt deletion
    print(f"\nAttempting to delete subject {subject_id}...")
    success, error = SubjectService.delete_subject(subject_id)
    
    if success:
        print(f"✅ Subject {subject_id} ({subject.code} - {subject.name}) deleted successfully!")
    else:
        print(f"❌ Failed to delete subject {subject_id}: {error}")
        
        # If it still fails, try the force delete method
        print("\nTrying force delete method...")
        success, error = SubjectService.force_delete_subject(subject_id, cleanup_related=True)
        
        if success:
            print(f"✅ Subject {subject_id} force deleted successfully!")
        else:
            print(f"❌ Force delete also failed: {error}")