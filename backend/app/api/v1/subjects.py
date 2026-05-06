@subjects_bp.route('/<int:subject_id>', methods=['DELETE'])
@jwt_required()
@role_required(['admin', 'academic_coordinator'])
def delete_subject(subject_id):
    """Delete subject with validation and backup"""
    success, result = SubjectDeletionService.delete_subject_with_cascade(
        subject_id, create_backup_flag=True
    )
    
    if success:
        return jsonify({
            'success': True,
            'message': result['message'],
            'affected_records': result['affected_records']
        }), 200
    else:
        return jsonify({'success': False, 'error': result}), 400