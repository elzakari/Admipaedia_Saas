import pytest
import json
from datetime import datetime
from unittest.mock import patch, MagicMock

@pytest.mark.usefixtures('app_context', 'db_isolation')
class TestAIAnalyticsAPI:
    
    def test_predict_student_performance_api_no_data(self, auth_client, student_factory):
        """Test student performance prediction API with a new student (no data)."""
        student = student_factory()
        
        # Correct path from analytics/ai_routes.py
        response = auth_client.get(f'/api/v1/ai-analytics/predictions/student/{student.id}')
        
        # Should return error in data but success True (depending on how success_response works)
        # Actually, success_response always returns success: True
        assert response.status_code == 200
        assert response.json['success'] is True
        assert 'prediction_available' in response.json['data']
        assert response.json['data']['prediction_available'] is False

    @patch('app.services.ai_analytics_service.AIAnalyticsService.predict_student_performance')
    def test_predict_student_performance_api_mocked(self, mock_predict, auth_client, student_factory):
        """Test student performance prediction API with mocked service results."""
        student = student_factory()
        mock_predict.return_value = {
            'student_id': student.id,
            'prediction_available': True,
            'predicted_score': 82.5,
            'confidence': 90.0
        }
        
        response = auth_client.get(f'/api/v1/ai-analytics/predictions/student/{student.id}')
        
        assert response.status_code == 200
        assert response.json['success'] is True
        assert response.json['data']['predicted_score'] == 82.5

    def test_assess_student_risk_api(self, auth_client, student_factory):
        """Test student risk assessment API."""
        student = student_factory()
        
        # Correct path from analytics/ai_routes.py
        response = auth_client.get(f'/api/v1/ai-analytics/risk-assessment/student/{student.id}')
        
        assert response.status_code == 200
        assert response.json['success'] is True
        assert 'risk_assessment_available' in response.json['data']

    def test_batch_predictions_api(self, auth_client, student_factory):
        """Test batch predictions for multiple students."""
        s1 = student_factory()
        s2 = student_factory()
        
        payload = {
            'type': 'student',
            'entity_ids': [s1.id, s2.id],
            'period': 30
        }
        
        # Correct path from analytics/ai_routes.py
        response = auth_client.post('/api/v1/ai-analytics/predictions/batch', json=payload)
        
        assert response.status_code == 200
        assert response.json['success'] is True
        assert 'data' in response.json

    def test_school_wide_insights_api(self, auth_client, sample_class, student_factory):
        """Test school-wide insights API with data setup."""
        # Ensure at least one class and student exist
        student = student_factory(class_id=sample_class.id)
        
        response = auth_client.get('/api/v1/ai-analytics/insights/school-wide')
        
        assert response.status_code == 200
        assert response.json['success'] is True
        # If no predictions can be generated, it might return success: True with an error message in data or False
        # Let's check the service logic for generate_school_insights
        if response.json['data'].get('school_insights_available'):
            assert 'risk_summary' in response.json['data']
        else:
            # It's still a successful API call even if insights couldn't be generated
            assert 'school_insights_available' in response.json['data']
