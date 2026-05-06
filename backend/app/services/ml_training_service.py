"""
Machine Learning Training Service for ADMIPAEDIA
Handles automated model training, evaluation, and deployment
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import logging
import pickle
import os
from pathlib import Path

from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import mean_squared_error, accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline
import joblib

from app.extensions import db
from app.models.student import Student
from app.models.grade import Grade
from app.models.attendance import Attendance
from app.models.exam import Exam
from app.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)

class MLTrainingService:
    """Service for training and managing machine learning models"""
    
    MODEL_DIR = Path("app/ml_models")
    PERFORMANCE_MODEL_PATH = MODEL_DIR / "performance_prediction_model.pkl"
    RISK_MODEL_PATH = MODEL_DIR / "risk_assessment_model.pkl"
    SCALER_PATH = MODEL_DIR / "feature_scaler.pkl"
    
    def __init__(self):
        # Ensure model directory exists
        self.MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    @staticmethod
    def prepare_performance_features(student_id: int, lookback_days: int = 90) -> Optional[pd.DataFrame]:
        """Prepare features for performance prediction model"""
        try:
            # Get student data
            student = Student.query.get(student_id)
            if not student:
                return None

            # Calculate date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=lookback_days)

            # Get grades data
            grades = Grade.query.filter(
                Grade.student_id == student_id,
                Grade.created_at >= start_date,
                Grade.created_at <= end_date
            ).all()

            # Get attendance data
            attendance_records = Attendance.query.filter(
                Attendance.student_id == student_id,
                Attendance.date >= start_date.date(),
                Attendance.date <= end_date.date()
            ).all()

            if not grades and not attendance_records:
                return None

            # Calculate features
            features = {
                'student_id': student_id,
                'avg_score': np.mean([g.percentage for g in grades]) if grades else 0,
                'score_std': np.std([g.percentage for g in grades]) if len(grades) > 1 else 0,
                'grade_count': len(grades),
                'attendance_rate': len([a for a in attendance_records if a.status == 'present']) / len(attendance_records) if attendance_records else 0,
                'days_since_last_grade': (end_date - max([g.created_at for g in grades])).days if grades else lookback_days,
                'trend_slope': MLTrainingService._calculate_trend_slope([g.percentage for g in grades]) if len(grades) > 2 else 0,
                'consistency_score': MLTrainingService._calculate_consistency([g.percentage for g in grades]) if len(grades) > 1 else 0,
                'recent_performance': np.mean([g.percentage for g in grades[-5:]]) if len(grades) >= 5 else (grades[-1].percentage if grades else 0)
            }

            return pd.DataFrame([features])

        except Exception as e:
            logger.error(f"Error preparing features for student {student_id}: {str(e)}")
            return None
    
    @staticmethod
    def _calculate_trend_slope(scores: List[float]) -> float:
        """Calculate the trend slope of scores over time"""
        if len(scores) < 2:
            return 0
        
        x = np.arange(len(scores))
        y = np.array(scores)
        
        # Simple linear regression slope
        slope = np.polyfit(x, y, 1)[0]
        return slope
    
    @staticmethod
    def _calculate_consistency(scores: List[float]) -> float:
        """Calculate consistency score (inverse of coefficient of variation)"""
        if len(scores) < 2:
            return 1.0
        
        mean_score = np.mean(scores)
        if mean_score == 0:
            return 0
        
        cv = np.std(scores) / mean_score
        consistency = 1 / (1 + cv)  # Higher consistency = lower variation
        return consistency
    
    @classmethod
    def train_performance_prediction_model(cls, retrain: bool = False) -> Dict[str, Any]:
        """Train student performance prediction models"""
        try:
            # Ensure model directory exists even when called as classmethod
            cls.MODEL_DIR.mkdir(parents=True, exist_ok=True)

            logger.info("Starting performance prediction model training...")

            # Check if model exists and retrain is not forced
            if cls.PERFORMANCE_MODEL_PATH.exists() and not retrain:
                logger.info("Performance model already exists. Use retrain=True to force retraining.")
                return {"status": "skipped", "message": "Model already exists"}

            # Collect training data
            training_data = []
            students = Student.query.all()

            for student in students:
                features_df = cls.prepare_performance_features(student.id, lookback_days=120)
                if features_df is not None and not features_df.empty:
                    # Get target variable (next grade)
                    next_grade = Grade.query.filter(
                        Grade.student_id == student.id,
                        Grade.created_at > datetime.utcnow() - timedelta(days=30)
                    ).first()

                    if next_grade:
                        features_df['target_score'] = next_grade.percentage
                        training_data.append(features_df)

            if not training_data:
                return {"status": "failed", "message": "No training data available"}

            # Combine all training data
            df = pd.concat(training_data, ignore_index=True)
            
            # Prepare features and target
            feature_columns = ['avg_score', 'score_std', 'grade_count', 'attendance_rate', 
                             'days_since_last_grade', 'trend_slope', 'consistency_score', 'recent_performance']
            
            X = df[feature_columns]
            y = df['target_score']
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Create and train model pipeline
            pipeline = Pipeline([
                ('scaler', StandardScaler()),
                ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
            ])
            
            # Hyperparameter tuning
            param_grid = {
                'regressor__n_estimators': [50, 100, 200],
                'regressor__max_depth': [10, 20, None],
                'regressor__min_samples_split': [2, 5, 10]
            }
            
            grid_search = GridSearchCV(pipeline, param_grid, cv=5, scoring='neg_mean_squared_error')
            grid_search.fit(X_train, y_train)
            
            # Get best model
            best_model = grid_search.best_estimator_
            
            # Evaluate model
            y_pred = best_model.predict(X_test)
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            
            # Cross-validation score
            cv_scores = cross_val_score(best_model, X, y, cv=5, scoring='neg_mean_squared_error')
            cv_rmse = np.sqrt(-cv_scores.mean())
            
            # Save model
            joblib.dump(best_model, cls.PERFORMANCE_MODEL_PATH)
            
            # Save feature names for later use
            feature_info = {
                'feature_columns': feature_columns,
                'training_date': datetime.utcnow().isoformat(),
                'model_type': 'RandomForestRegressor',
                'performance_metrics': {
                    'rmse': rmse,
                    'cv_rmse': cv_rmse,
                    'best_params': grid_search.best_params_
                }
            }
            
            with open(cls.MODEL_DIR / "performance_model_info.pkl", 'wb') as f:
                pickle.dump(feature_info, f)
            
            logger.info(f"Performance prediction model trained successfully. RMSE: {rmse:.2f}")
            
            return {
                "status": "success",
                "message": "Performance prediction model trained successfully",
                "metrics": {
                    "rmse": rmse,
                    "cv_rmse": cv_rmse,
                    "training_samples": len(df),
                    "best_params": grid_search.best_params_
                }
            }
            
        except Exception as e:
            logger.error(f"Error training performance prediction model: {str(e)}")
            return {"status": "failed", "message": str(e)}
    
    @classmethod
    def train_risk_assessment_model(cls, retrain: bool = False) -> Dict[str, Any]:
        """Train student risk assessment models"""
        try:
            # Ensure model directory exists even when called as classmethod
            cls.MODEL_DIR.mkdir(parents=True, exist_ok=True)

            logger.info("Starting risk assessment model training...")
            
            # Check if model exists and retrain is not forced
            if cls.RISK_MODEL_PATH.exists() and not retrain:
                logger.info("Risk model already exists. Use retrain=True to force retraining.")
                return {"status": "skipped", "message": "Model already exists"}
            
            # Collect training data for risk assessment
            training_data = []
            students = Student.query.all()
            
            for student in students:
                features_df = cls.prepare_performance_features(student.id, lookback_days=90)
                if features_df is not None and not features_df.empty:
                    # Calculate risk level based on multiple factors
                    risk_level = cls._calculate_risk_level(student.id)
                    features_df['risk_level'] = risk_level
                    training_data.append(features_df)
            
            if not training_data:
                return {"status": "failed", "message": "No training data available"}
            
            # Combine all training data
            df = pd.concat(training_data, ignore_index=True)
            
            # Prepare features and target
            feature_columns = ['avg_score', 'score_std', 'grade_count', 'attendance_rate', 
                             'days_since_last_grade', 'trend_slope', 'consistency_score', 'recent_performance']
            
            X = df[feature_columns]
            y = df['risk_level']
            
            # Encode risk levels
            le = LabelEncoder()
            y_encoded = le.fit_transform(y)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)
            
            # Create and train model pipeline
            pipeline = Pipeline([
                ('scaler', StandardScaler()),
                ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
            ])
            
            # Hyperparameter tuning
            param_grid = {
                'classifier__n_estimators': [50, 100, 200],
                'classifier__max_depth': [10, 20, None],
                'classifier__min_samples_split': [2, 5, 10]
            }
            
            grid_search = GridSearchCV(pipeline, param_grid, cv=5, scoring='accuracy')
            grid_search.fit(X_train, y_train)
            
            # Get best model
            best_model = grid_search.best_estimator_
            
            # Evaluate model
            y_pred = best_model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            # Cross-validation score
            cv_scores = cross_val_score(best_model, X, y_encoded, cv=5, scoring='accuracy')
            cv_accuracy = cv_scores.mean()
            
            # Save model and label encoder
            joblib.dump(best_model, cls.RISK_MODEL_PATH)
            joblib.dump(le, cls.MODEL_DIR / "risk_label_encoder.pkl")
            
            # Save feature names for later use
            feature_info = {
                'feature_columns': feature_columns,
                'training_date': datetime.utcnow().isoformat(),
                'model_type': 'RandomForestClassifier',
                'risk_levels': le.classes_.tolist(),
                'performance_metrics': {
                    'accuracy': accuracy,
                    'cv_accuracy': cv_accuracy,
                    'best_params': grid_search.best_params_
                }
            }
            
            with open(cls.MODEL_DIR / "risk_model_info.pkl", 'wb') as f:
                pickle.dump(feature_info, f)
            
            logger.info(f"Risk assessment model trained successfully. Accuracy: {accuracy:.2f}")
            
            return {
                "status": "success",
                "message": "Risk assessment model trained successfully",
                "metrics": {
                    "accuracy": accuracy,
                    "cv_accuracy": cv_accuracy,
                    "training_samples": len(df),
                    "best_params": grid_search.best_params_
                }
            }
            
        except Exception as e:
            logger.error(f"Error training risk assessment model: {str(e)}")
            return {"status": "failed", "message": str(e)}
    
    @staticmethod
    def _calculate_risk_level(student_id: int) -> str:
        """Calculate risk level based on student performance and attendance"""
        try:
            # Get recent data
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=60)
            
            # Get grades
            grades = Grade.query.filter(
                Grade.student_id == student_id,
                Grade.created_at >= start_date
            ).all()
            
            # Get attendance
            attendance_records = Attendance.query.filter(
                Attendance.student_id == student_id,
                Attendance.date >= start_date.date()
            ).all()
            
            # Calculate risk factors
            avg_score = np.mean([g.percentage for g in grades]) if grades else 50
            attendance_rate = len([a for a in attendance_records if a.status == 'present']) / len(attendance_records) if attendance_records else 0.5
            # Determine risk level
            if avg_score < 40 or attendance_rate < 0.6:
                return 'high'
            elif avg_score < 60 or attendance_rate < 0.8:
                return 'medium'
            else:
                return 'low'
                
        except Exception:
            return 'medium'  # Default to medium risk
    
    @classmethod
    def evaluate_model_performance(cls) -> Dict[str, Any]:
        """Evaluate and validate model accuracy"""
        try:
            results = {}
            
            # Evaluate performance prediction model
            if cls.PERFORMANCE_MODEL_PATH.exists():
                model = joblib.load(cls.PERFORMANCE_MODEL_PATH)
                
                # Load model info
                with open(cls.MODEL_DIR / "performance_model_info.pkl", 'rb') as f:
                    model_info = pickle.load(f)
                
                results['performance_model'] = {
                    'exists': True,
                    'training_date': model_info.get('training_date'),
                    'metrics': model_info.get('performance_metrics', {}),
                    'model_type': model_info.get('model_type')
                }
            else:
                results['performance_model'] = {'exists': False}
            
            # Evaluate risk assessment model
            if cls.RISK_MODEL_PATH.exists():
                model = joblib.load(cls.RISK_MODEL_PATH)
                
                # Load model info
                with open(cls.MODEL_DIR / "risk_model_info.pkl", 'rb') as f:
                    model_info = pickle.load(f)
                
                results['risk_model'] = {
                    'exists': True,
                    'training_date': model_info.get('training_date'),
                    'metrics': model_info.get('performance_metrics', {}),
                    'model_type': model_info.get('model_type'),
                    'risk_levels': model_info.get('risk_levels', [])
                }
            else:
                results['risk_model'] = {'exists': False}
            
            return {
                'status': 'success',
                'models': results,
                'evaluation_date': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error evaluating model performance: {str(e)}")
            return {"status": "failed", "message": str(e)}
    
    @classmethod
    def retrain_all_models(cls) -> Dict[str, Any]:
        """Retrain all ML models with latest data"""
        try:
            results = {}
            
            # Retrain performance prediction model
            perf_result = cls.train_performance_prediction_model(retrain=True)
            results['performance_model'] = perf_result
            
            # Retrain risk assessment model
            risk_result = cls.train_risk_assessment_model(retrain=True)
            results['risk_model'] = risk_result
            
            return {
                'status': 'success',
                'message': 'All models retrained successfully',
                'results': results,
                'retrain_date': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error retraining models: {str(e)}")
            return {"status": "failed", "message": str(e)}
    
    @classmethod
    def get_model_status(cls) -> Dict[str, Any]:
        """Get status of all ML models"""
        try:
            status = {
                'performance_model': {
                    'exists': cls.PERFORMANCE_MODEL_PATH.exists(),
                    'path': str(cls.PERFORMANCE_MODEL_PATH),
                    'last_modified': None
                },
                'risk_model': {
                    'exists': cls.RISK_MODEL_PATH.exists(),
                    'path': str(cls.RISK_MODEL_PATH),
                    'last_modified': None
                }
            }
            
            # Get last modified dates
            if status['performance_model']['exists']:
                status['performance_model']['last_modified'] = datetime.fromtimestamp(
                    cls.PERFORMANCE_MODEL_PATH.stat().st_mtime
                ).isoformat()
            
            if status['risk_model']['exists']:
                status['risk_model']['last_modified'] = datetime.fromtimestamp(
                    cls.RISK_MODEL_PATH.stat().st_mtime
                ).isoformat()
            
            return {
                'status': 'success',
                'models': status,
                'model_directory': str(cls.MODEL_DIR)
            }
            
        except Exception as e:
            logger.error(f"Error getting model status: {str(e)}")
            return {"status": "failed", "message": str(e)}