from typing import List
from app.services.subject_service import SubjectService
from app.extensions import db

class BulkSubjectService:
    @staticmethod
    def bulk_delete_subjects(subject_ids: List[int], user_id: int, tenant_id=None):
        """Delete multiple subjects with transaction safety"""
        try:
            results = []
            for subject_id in subject_ids:
                success, result = SubjectService.delete_subject(subject_id, tenant_id=tenant_id)
                results.append({'subject_id': subject_id, 'success': success, 'result': result})
            
            db.session.commit()
            return True, results
        except Exception as e:
            db.session.rollback()
            return False, str(e)
