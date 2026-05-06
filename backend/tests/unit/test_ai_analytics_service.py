import pytest
import pandas as pd
import numpy as np
from unittest.mock import MagicMock, patch
from datetime import datetime
from app.services.ai_analytics_service import AIAnalyticsService

def test_calculate_risk_level():
    """Test risk level mapping logic."""
    # Medium risk: borderline score (below 60)
    assert AIAnalyticsService._calculate_risk_level(55, 'stable') == 'medium'
    
    # Low risk: above average score + stable trend
    assert AIAnalyticsService._calculate_risk_level(65, 'stable') == 'low'

def test_analyze_performance_trend():
    """Test trend analysis based on historical scores."""
    # Improving trend
    df_improving = pd.DataFrame({'score': [60, 65, 70, 75, 80]})
    trend_imp = AIAnalyticsService._analyze_performance_trend(df_improving)
    assert trend_imp['trend_direction'] == 'improving'
    assert trend_imp['recent_average'] == 70.0
    
    # Declining trend
    df_declining = pd.DataFrame({'score': [90, 85, 80, 75, 70]})
    trend_dec = AIAnalyticsService._analyze_performance_trend(df_declining)
    assert trend_dec['trend_direction'] == 'declining'
    
    # Stable trend
    df_stable = pd.DataFrame({'score': [75, 76, 75, 74, 75]})
    trend_stable = AIAnalyticsService._analyze_performance_trend(df_stable)
    assert trend_stable['trend_direction'] == 'stable'

@patch('app.services.ai_analytics_service.AIAnalyticsService._get_comprehensive_student_data')
@patch('app.services.ai_analytics_service.AIAnalyticsService._generate_early_warning_indicators')
@patch('app.services.ai_analytics_service.AIAnalyticsService._generate_intervention_recommendations')
def test_assess_student_risk(mock_interv, mock_early, mock_data):
    """Test full student risk assessment flow."""
    # Mock student data
    mock_data.return_value = {
        'student': MagicMock(id=1),
        'grades': [{'score': 40}, {'score': 45}, {'score': 35}],
        'attendance': [{'status': 'present'}, {'status': 'absent'}, {'status': 'absent'}]
    }
    mock_early.return_value = {'performance_decline': True}
    mock_interv.return_value = [{'title': 'Intervention Needed'}]
    
    result = AIAnalyticsService.assess_student_risk(1)
    
    assert result['student_id'] == 1
    assert result['risk_assessment_available'] == True
    assert result['overall_risk_score'] > 40 # Based on calculated weights
    assert 'risk_factors' in result
    assert result['risk_level'] in ['medium', 'high']

@patch('app.services.ai_analytics_service.AIAnalyticsService._get_student_historical_data')
def test_predict_student_performance_insufficient_data(mock_hist):
    """Test prediction behavior when data is scarce."""
    mock_hist.return_value = [{'score': 90}, {'score': 95}] # Only 2 points
    
    result = AIAnalyticsService.predict_student_performance(1)
    
    assert result['prediction_available'] == False
    assert 'Insufficient data points' in result['error']

@patch('app.services.ai_analytics_service.AIAnalyticsService._get_student_historical_data')
@patch('app.services.ai_analytics_service.AIAnalyticsService._train_performance_model')
def test_predict_student_performance_success(mock_train, mock_hist):
    """Test successful performance prediction flow."""
    # Mock 10 historical points
    mock_hist.return_value = [{'score': 70, 'date': datetime.now()} for _ in range(10)]
    
    # Mock model and results
    mock_model = MagicMock()
    mock_model.predict.return_value = [75.0]
    mock_scaler = MagicMock()
    mock_scaler.transform.return_value = np.array([[1]])
    
    mock_train.return_value = (mock_model, mock_scaler, 0.85)
    
    result = AIAnalyticsService.predict_student_performance(1)
    
    assert result['prediction_available'] == True
    assert result['predicted_score'] == 75.0
    assert result['confidence'] == 85.0
    assert 'recommendations' in result
