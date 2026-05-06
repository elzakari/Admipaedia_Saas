@socketio.on('subject_deleted')
def handle_subject_deletion(data):
    """Broadcast subject deletion to relevant users"""
    emit('subject_deleted', {
        'subject_id': data['subject_id'],
        'subject_name': data['subject_name'],
        'deleted_by': data['user_id'],
        'timestamp': datetime.utcnow().isoformat()
    }, room=f"department_{data['department_id']}")