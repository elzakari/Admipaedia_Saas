import pytest

def test_student_complete_workflow(auth_client):
    """Test the complete student workflow from creation to deletion."""
    # 1. Create a class first
    class_response = auth_client.post('/api/v1/classes', json={
        'name': 'Test Class',
        'grade_level': '10',
        'academic_year': '2023-2024',
        'section': 'A',
        'capacity': 30
    })
    
    assert class_response.status_code == 201
    class_id = class_response.json['class']['id']
    
    # 2. Create a student
    student_response = auth_client.post('/api/v1/students', json={
        'name': 'Test Student',
        'email': 'student@example.com',
        'admission_number': 'ADM001',
        'date_of_birth': '2005-01-01',
        'gender': 'male',
        'address': '123 Test St',
        'phone': '1234567890'
    })
    
    assert student_response.status_code == 201
    student_id = student_response.json['student']['id']
    
    # 3. Assign student to class
    assign_response = auth_client.put(f'/api/v1/students/{student_id}/assign-class', json={
        'class_id': class_id
    })
    
    assert assign_response.status_code == 200
    assert assign_response.json['student']['class_id'] == class_id
    
    # 4. Get student details
    get_response = auth_client.get(f'/api/v1/students/{student_id}')
    
    assert get_response.status_code == 200
    assert get_response.json['student']['name'] == 'Test Student'
    assert get_response.json['student']['class_id'] == class_id
    
    # 5. Update student
    update_response = auth_client.put(f'/api/v1/students/{student_id}', json={
        'name': 'Updated Student',
        'phone': '0987654321'
    })
    
    assert update_response.status_code == 200
    assert update_response.json['student']['name'] == 'Updated Student'
    assert update_response.json['student']['phone'] == '0987654321'
    
    # 6. Delete student
    delete_response = auth_client.delete(f'/api/v1/students/{student_id}')
    
    assert delete_response.status_code == 200
    assert delete_response.json['success'] is True
    
    # 7. Verify student is deleted
    verify_response = auth_client.get(f'/api/v1/students/{student_id}')
    assert verify_response.status_code == 404