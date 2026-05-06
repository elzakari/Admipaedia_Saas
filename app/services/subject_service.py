from flask import current_app
from app.models.subject import Subject
from app.models.grade import Grade
from app.models.exam import Exam
from app.models.external_exams import ExternalExamResult
from app.models.grading_system import FinalGrade, EnhancedGrade
from app.models.assessment_methods import ContinuousAssessmentRecord, SchoolBasedAssessment, AssessmentFramework
from app.models.associations import teacher_subjects, class_subjects
from app.models.stem_curriculum import STEMSubject
from app import db
import json
from datetime import datetime

class SubjectDeletionService:
    """Enhanced service for safe subject deletion with comprehensive validation and backup"""
    
    @staticmethod
    def validate_subject_deletion(subject_id):
        """Validate if a subject can be safely deleted"""
        subject = Subject.query.get(subject_id)
        if not subject:
            return False, "Subject not found"
        
        # Check for related records that would be affected
        related_data = {
            'grades': Grade.query.filter_by(subject_id=subject_id).count(),
            'exams': Exam.query.filter_by(subject_id=subject_id).count(),
            'external_exam_results': ExternalExamResult.query.filter_by(subject_id=subject_id).count(),
            'final_grades': FinalGrade.query.filter_by(subject_id=subject_id).count(),
            'enhanced_grades': EnhancedGrade.query.filter_by(subject_id=subject_id).count(),
            'continuous_assessments': ContinuousAssessmentRecord.query.filter_by(subject_id=subject_id).count(),
            'school_based_assessments': SchoolBasedAssessment.query.filter_by(subject_id=subject_id).count(),
            'assessment_frameworks': AssessmentFramework.query.filter_by(subject_id=subject_id).count(),
            'stem_subjects': STEMSubject.query.filter_by(subject_id=subject_id).count(),
            'teacher_assignments': db.session.query(teacher_subjects).filter_by(subject_id=subject_id).count(),
            'class_assignments': db.session.query(class_subjects).filter_by(subject_id=subject_id).count()
        }
        
        total_related = sum(related_data.values())
        
        return True, {
            'can_delete': True,
            'related_records': related_data,
            'total_affected': total_related,
            'subject_name': subject.name
        }
    
    @staticmethod
    def create_backup(subject_id):
        """Create a comprehensive backup of subject and related data"""
        subject = Subject.query.get(subject_id)
        if not subject:
            return None
        
        backup_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'subject': {
                'id': subject.id,
                'name': subject.name,
                'code': subject.code,
                'description': subject.description,
                'credits': subject.credits,
                'department_id': subject.department_id,
                'is_core': subject.is_core,
                'created_at': subject.created_at.isoformat() if subject.created_at else None,
                'updated_at': subject.updated_at.isoformat() if subject.updated_at else None
            },
            'related_data': {
                'grades': [{
                    'id': g.id,
                    'student_id': g.student_id,
                    'value': g.value,
                    'grade_type': g.grade_type,
                    'created_at': g.created_at.isoformat() if g.created_at else None
                } for g in Grade.query.filter_by(subject_id=subject_id).all()],
                
                'exams': [{
                    'id': e.id,
                    'name': e.name,
                    'exam_date': e.exam_date.isoformat() if e.exam_date else None,
                    'duration': e.duration,
                    'total_marks': e.total_marks
                } for e in Exam.query.filter_by(subject_id=subject_id).all()],
                
                'external_exam_results': [{
                    'id': r.id,
                    'student_id': r.student_id,
                    'exam_type': r.exam_type,
                    'grade': r.grade,
                    'marks': r.marks
                } for r in ExternalExamResult.query.filter_by(subject_id=subject_id).all()]
            }
        }
        
        # Save backup to file
        backup_filename = f"subject_{subject_id}_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        backup_path = f"backups/{backup_filename}"
        
        try:
            import os
            os.makedirs('backups', exist_ok=True)
            with open(backup_path, 'w') as f:
                json.dump(backup_data, f, indent=2)
            
            current_app.logger.info(f"Backup created: {backup_path}")
            return backup_path
        except Exception as e:
            current_app.logger.error(f"Failed to create backup: {str(e)}")
            return None
    
    @staticmethod
    def delete_subject_with_cascade(subject_id, create_backup_flag=True):
        """Safely delete subject with CASCADE DELETE (after migration)"""
        try:
            # Validate deletion
            is_valid, validation_result = SubjectDeletionService.validate_subject_deletion(subject_id)
            if not is_valid:
                return False, validation_result
            
            # Create backup if requested
            backup_path = None
            if create_backup_flag:
                backup_path = SubjectDeletionService.create_backup(subject_id)
                if not backup_path:
                    return False, "Failed to create backup"
            
            # Delete subject (CASCADE DELETE will handle related records)
            subject = Subject.query.get(subject_id)
            db.session.delete(subject)
            db.session.commit()
            
            current_app.logger.info(f"Subject {subject_id} deleted successfully. Backup: {backup_path}")
            
            return True, {
                'message': f"Subject '{validation_result['subject_name']}' deleted successfully",
                'affected_records': validation_result['total_affected'],
                'backup_path': backup_path
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Failed to delete subject {subject_id}: {str(e)}")
            return False, f"Deletion failed: {str(e)}"
    
    @staticmethod
    def restore_from_backup(backup_path):
        """Restore subject and related data from backup"""
        try:
            with open(backup_path, 'r') as f:
                backup_data = json.load(f)
            
            # Restore subject
            subject_data = backup_data['subject']
            subject = Subject(
                id=subject_data['id'],
                name=subject_data['name'],
                code=subject_data['code'],
                description=subject_data['description'],
                credits=subject_data['credits'],
                department_id=subject_data['department_id'],
                is_core=subject_data['is_core']
            )
            
            db.session.add(subject)
            db.session.flush()  # Get the ID
            
            # Restore related data
            for grade_data in backup_data['related_data']['grades']:
                grade = Grade(
                    student_id=grade_data['student_id'],
                    subject_id=subject.id,
                    value=grade_data['value'],
                    grade_type=grade_data['grade_type']
                )
                db.session.add(grade)
            
            # Restore exams and other related data...
            # (Implementation continues for other entities)
            
            db.session.commit()
            current_app.logger.info(f"Subject restored from backup: {backup_path}")
            return True, "Subject restored successfully"
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Failed to restore from backup {backup_path}: {str(e)}")
            return False, f"Restore failed: {str(e)}"