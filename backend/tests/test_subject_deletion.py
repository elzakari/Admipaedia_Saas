class TestSubjectDeletion:
    def test_delete_subject_with_related_data(self):
        """Test deletion of subject with various related records"""
        # Create test data
        subject = self.create_test_subject()
        grade = self.create_test_grade(subject_id=subject.id)
        exam = self.create_test_exam(subject_id=subject.id)
        
        # Test deletion
        success, result = SubjectDeletionService.delete_subject_with_cascade(subject.id)
        
        assert success
        assert Grade.query.get(grade.id) is None
        assert Exam.query.get(exam.id) is None
        
    def test_backup_and_restore(self):
        """Test backup creation and restoration"""
        # Implementation for backup/restore testing
        pass