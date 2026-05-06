from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import (
    GradingStandard, GradingScheme, GradeBoundary, 
    EnhancedGrade, FinalGrade, AssessmentType
)
from app.extensions import db
from app.utils.rbac_decorators import require_permission, require_role
from . import grading_bp
from datetime import datetime

@grading_bp.route('/standards', methods=['GET'])
@jwt_required()
@require_permission('grade.read')
def get_grading_standards():
    """Get all grading standards (BECE, WASSCE, etc.)"""
    try:
        standards = GradingStandard.query.filter_by(is_active=True).all()
        return jsonify({
            'success': True,
            'data': [{
                'id': std.id,
                'name': std.name,
                'code': std.code,
                'description': std.description
            } for std in standards]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@grading_bp.route('/schemes/<int:educational_level_id>', methods=['GET'])
@jwt_required()
@require_permission('grade.read')
def get_grading_schemes(educational_level_id):
    """Get grading schemes for educational level"""
    try:
        schemes = GradingScheme.query.filter_by(
            educational_level_id=educational_level_id,
            is_active=True
        ).all()
        
        result = []
        for scheme in schemes:
            boundaries = GradeBoundary.query.filter_by(grading_scheme_id=scheme.id).all()
            result.append({
                'id': scheme.id,
                'name': scheme.name,
                'grading_standard': scheme.grading_standard.name,
                'boundaries': [{
                    'grade': b.grade,
                    'min_score': b.min_score,
                    'max_score': b.max_score,
                    'grade_point': b.grade_point,
                    'interpretation': b.interpretation
                } for b in boundaries]
            })
        
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@grading_bp.route('/student/<int:student_id>/grade', methods=['POST'])
@jwt_required()
@require_permission('grade.create')
def record_enhanced_grade(student_id):
    """Record enhanced grade with continuous assessment"""
    try:
        data = request.get_json()
        
        grade = EnhancedGrade(
            student_id=student_id,
            subject_id=data['subject_id'],
            assessment_type_id=data['assessment_type_id'],
            grading_scheme_id=data['grading_scheme_id'],
            raw_score=data['raw_score'],
            assessment_date=datetime.strptime(data['assessment_date'], '%Y-%m-%d').date(),
            teacher_id=get_jwt_identity(),
            term=data.get('term'),
            academic_year=data.get('academic_year')
        )
        
        # Calculate weighted score and grade
        assessment_type = AssessmentType.query.get(data['assessment_type_id'])
        grade.weighted_score = (data['raw_score'] * assessment_type.weight_percentage) / 100
        
        # Determine grade based on scheme boundaries
        scheme = GradingScheme.query.get(data['grading_scheme_id'])
        boundaries = GradeBoundary.query.filter_by(grading_scheme_id=scheme.id).all()
        
        for boundary in boundaries:
            if boundary.min_score <= data['raw_score'] <= boundary.max_score:
                grade.grade = boundary.grade
                grade.grade_point = boundary.grade_point
                break
        
        db.session.add(grade)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Grade recorded successfully',
            'data': {
                'id': grade.id,
                'grade': grade.grade,
                'weighted_score': grade.weighted_score
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@grading_bp.route('/student/<int:student_id>/final-grade', methods=['POST'])
@jwt_required()
@require_permission('grade.approve')
def calculate_final_grade(student_id):
    """Calculate final grade with 40% class score + 60% external exam"""
    try:
        data = request.get_json()
        
        # Calculate final score (40% class + 60% external)
        class_score = data.get('class_score', 0)
        external_score = data.get('external_score', 0)
        final_score = (class_score * 0.4) + (external_score * 0.6)
        
        # Determine final grade
        scheme = GradingScheme.query.get(data['grading_scheme_id'])
        boundaries = GradeBoundary.query.filter_by(grading_scheme_id=scheme.id).all()
        
        final_grade_value = 'F9'
        grade_point = 0.0
        
        for boundary in boundaries:
            if boundary.min_score <= final_score <= boundary.max_score:
                final_grade_value = boundary.grade
                grade_point = boundary.grade_point
                break
        
        final_grade = FinalGrade(
            student_id=student_id,
            subject_id=data['subject_id'],
            grading_scheme_id=data['grading_scheme_id'],
            class_score=class_score,
            external_score=external_score,
            final_score=final_score,
            final_grade=final_grade_value,
            grade_point=grade_point,
            term=data['term'],
            academic_year=data['academic_year']
        )
        
        db.session.add(final_grade)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Final grade calculated successfully',
            'data': {
                'id': final_grade.id,
                'final_score': final_score,
                'final_grade': final_grade_value,
                'grade_point': grade_point
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500