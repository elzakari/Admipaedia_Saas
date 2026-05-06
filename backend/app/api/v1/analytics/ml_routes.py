"""
Machine Learning Analytics API Routes for ADMIPAEDIA
Provides endpoints for ML-powered analytics and insights
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

from app.services.ml_training_service import MLTrainingService
from app.utils.response import success_response, error_response
from app.utils.rbac_decorators import require_permission

logger = logging.getLogger(__name__)

ml_bp = Blueprint('ml_training', __name__)

@ml_bp.route('/models/train/performance', methods=['POST'])
@jwt_required()
@require_permission('manage_system')
def train_performance_model():
    """Train the student performance prediction model"""
    try:
        retrain = request.json.get('retrain', False) if request.json else False
        
        result = MLTrainingService.train_performance_prediction_model(retrain=retrain)
        
        if result['status'] == 'success':
            return success_response(
                data=result,
                message="Performance prediction model training completed"
            )
        else:
            return error_response(
                message=result.get('message', 'Training failed'),
                errors=result
            )
            
    except Exception as e:
        logger.error(f"Error training performance model: {str(e)}")
        return error_response(
            message="Failed to train performance model",
            errors=str(e)
        )

@ml_bp.route('/models/train/risk', methods=['POST'])
@jwt_required()
@require_permission('manage_system')
def train_risk_model():
    """Train the student risk assessment model"""
    try:
        retrain = request.json.get('retrain', False) if request.json else False
        
        result = MLTrainingService.train_risk_assessment_model(retrain=retrain)
        
        if result['status'] == 'success':
            return success_response(
                data=result,
                message="Risk assessment model training completed"
            )
        else:
            return error_response(
                message=result.get('message', 'Training failed'),
                errors=result
            )
            
    except Exception as e:
        logger.error(f"Error training risk model: {str(e)}")
        return error_response(
            message="Failed to train risk model",
            errors=str(e)
        )

@ml_bp.route('/models/retrain-all', methods=['POST'])
@jwt_required()
@require_permission('manage_system')
def retrain_all_models():
    """Retrain all ML models with latest data"""
    try:
        result = MLTrainingService.retrain_all_models()
        
        if result['status'] == 'success':
            return success_response(
                data=result,
                message="All models retrained successfully"
            )
        else:
            return error_response(
                message=result.get('message', 'Retraining failed'),
                errors=result
            )
            
    except Exception as e:
        logger.error(f"Error retraining models: {str(e)}")
        return error_response(
            message="Failed to retrain models",
            errors=str(e)
        )

@ml_bp.route('/models/status', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def get_model_status():
    """Get status of all ML models"""
    try:
        result = MLTrainingService.get_model_status()
        
        return success_response(
            data=result,
            message="Model status retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting model status: {str(e)}")
        return error_response(
            message="Failed to get model status",
            errors=str(e)
        )

@ml_bp.route('/models/evaluate', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def evaluate_models():
    """Evaluate ML model performance"""
    try:
        result = MLTrainingService.evaluate_model_performance()
        
        return success_response(
            data=result,
            message="Model evaluation completed"
        )
        
    except Exception as e:
        logger.error(f"Error evaluating models: {str(e)}")
        return error_response(
            message="Failed to evaluate models",
            errors=str(e)
        )