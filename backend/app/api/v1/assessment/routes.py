from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import (
    AssessmentFramework, AssessmentTask, AssessmentRubric,
    SchoolBasedAssessment, DifferentiatedAssessment, ContinuousAssessmentRecord
)
from app.extensions import db
from . import assessment_bp
from datetime import datetime

@assessment_bp.route('/frameworks/<int:educational_level_id>', methods=['GET'])
@jwt_required()
def get_assessment_frameworks(educational_level_id):
    """Get assessment frameworks for educational level"""
    try:
        frameworks = AssessmentFramework.query.filter_by(
            educational_level_id=educational_level_id,
            is_active=True
        ).all()
        
        return jsonify({
            'success': True,
            'data': [{
                'id': fw.id,
                'name': fw.name,
                'framework_type': fw.framework_type,
                'description': fw.description,
                'assessment_criteria': fw.assessment_criteria,
                'scoring_rubric': fw.scoring_rubric
            } for fw in frameworks]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@assessment_bp.route('/sba', methods=['POST'])
@jwt_required()
def create_school_based_assessment():
    """Create School-Based Assessment"""
    try:
        data = request.get_json()
        
        sba = SchoolBasedAssessment(
            title=data['title'],
            subject_id=data['subject_id'],
            class_id=data['class_id'],
            assessment_type=data['assessment_type'],
            description=data.get('description'),
            total_marks=data['total_marks'],
            duration_minutes=data.get('duration_minutes'),
            assessment_date=datetime.strptime(data['assessment_date'], '%Y-%m-%d').date(),
            instructions=data.get('instructions'),
            marking_scheme=data.get('marking_scheme', {}),
            teacher_id=get_jwt_identity(),
            term=data.get('term'),
            academic_year=data.get('academic_year')
        )
        
        db.session.add(sba)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'School-Based Assessment created successfully',
            'data': {'id': sba.id}
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@assessment_bp.route('/continuous/<int:student_id>', methods=['POST'])
@jwt_required()
def record_continuous_assessment(student_id):
    """Record continuous assessment"""
    try:
        data = request.get_json()
        
        record = ContinuousAssessmentRecord(
            student_id=student_id,
            subject_id=data['subject_id'],
            assessment_date=datetime.strptime(data['assessment_date'], '%Y-%m-%d').date(),
            assessment_type=data['assessment_type'],
            score=data['score'],
            max_score=data['max_score'],
            feedback=data.get('feedback'),
            teacher_id=get_jwt_identity(),
            term=data.get('term'),
            academic_year=data.get('academic_year')
        )
        
        db.session.add(record)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Continuous assessment recorded successfully',
            'data': {'id': record.id}
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500