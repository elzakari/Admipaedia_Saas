from datetime import datetime

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models import GradingStandard, GradingScheme, GradeBoundary
from app.services.enhanced_grading_service import EnhancedGradingService
from app.utils.rbac_decorators import require_permission

from . import grading_bp


@grading_bp.route('/standards', methods=['GET'])
@jwt_required()
@require_permission('grade.read')
def get_grading_standards():
    """Return grading standards as enum-backed compatibility data."""
    try:
        standards = [
            {
                'id': standard.name,
                'name': standard.name.replace('_', ' ').title(),
                'code': standard.value,
                'description': standard.value.replace('_', ' ').title(),
            }
            for standard in GradingStandard
        ]
        return jsonify({'success': True, 'data': standards}), 200
    except Exception as exc:
        return jsonify({'success': False, 'message': str(exc)}), 500


@grading_bp.route('/schemes/<int:educational_level_id>', methods=['GET'])
@jwt_required()
@require_permission('grade.read')
def get_grading_schemes(educational_level_id):
    """Return active grading schemes for an educational level."""
    try:
        schemes = GradingScheme.query.filter_by(
            educational_level_id=educational_level_id,
            is_active=True,
        ).order_by(GradingScheme.is_default.desc(), GradingScheme.name.asc()).all()

        result = []
        for scheme in schemes:
            boundaries = GradeBoundary.query.filter_by(grading_scheme_id=scheme.id).order_by(
                GradeBoundary.sequence_order.asc()
            ).all()
            result.append({
                'id': scheme.id,
                'name': scheme.name,
                'grading_standard': scheme.standard.value,
                'boundaries': [{
                    'grade': boundary.grade_symbol,
                    'grade_name': boundary.grade_name,
                    'min_score': boundary.min_score,
                    'max_score': boundary.max_score,
                    'grade_point': boundary.grade_points,
                    'is_passing': boundary.is_passing,
                } for boundary in boundaries],
            })

        return jsonify({'success': True, 'data': result}), 200
    except Exception as exc:
        return jsonify({'success': False, 'message': str(exc)}), 500


@grading_bp.route('/student/<int:student_id>/grade', methods=['POST'])
@jwt_required()
@require_permission('grade.create')
def record_enhanced_grade(student_id):
    """Compatibility wrapper around enhanced grade creation."""
    try:
        data = request.get_json() or {}
        required_fields = [
            'subject_id',
            'class_id',
            'assessment_type_id',
            'grading_scheme_id',
            'raw_score',
            'total_marks',
            'assessment_name',
            'assessment_date',
            'term',
            'academic_year',
        ]
        missing = [field for field in required_fields if field not in data]
        if missing:
            return jsonify({'success': False, 'message': f"Missing required fields: {', '.join(missing)}"}), 400

        try:
            assessment_date = datetime.strptime(data['assessment_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid assessment_date format. Use YYYY-MM-DD'}), 400

        grade, error = EnhancedGradingService.create_enhanced_grade(
            student_id=student_id,
            subject_id=int(data['subject_id']),
            class_id=int(data['class_id']),
            assessment_type_id=int(data['assessment_type_id']),
            grading_scheme_id=int(data['grading_scheme_id']),
            raw_score=float(data['raw_score']),
            total_marks=float(data['total_marks']),
            assessment_name=data['assessment_name'],
            assessment_date=assessment_date,
            term=data['term'],
            academic_year=data['academic_year'],
            teacher_id=int(get_jwt_identity()),
            weight=float(data.get('weight', 1.0)),
            teacher_comments=data.get('teacher_comments'),
        )
        if error:
            return jsonify({'success': False, 'message': error}), 400

        return jsonify({
            'success': True,
            'message': 'Grade recorded successfully',
            'data': {
                'id': grade.id,
                'grade': grade.grade_symbol,
                'grade_symbol': grade.grade_symbol,
                'grade_point': grade.grade_points,
                'grade_points': grade.grade_points,
                'weighted_score': grade.percentage * float(grade.weight or 1.0),
                'percentage': grade.percentage,
            },
        }), 201
    except Exception as exc:
        return jsonify({'success': False, 'message': str(exc)}), 500


@grading_bp.route('/student/<int:student_id>/final-grade', methods=['POST'])
@jwt_required()
@require_permission('grade.approve')
def calculate_final_grade(student_id):
    """Compatibility wrapper around final grade calculation."""
    try:
        data = request.get_json() or {}
        required_fields = ['subject_id', 'class_id', 'grading_scheme_id', 'term', 'academic_year']
        missing = [field for field in required_fields if field not in data]
        if missing:
            return jsonify({'success': False, 'message': f"Missing required fields: {', '.join(missing)}"}), 400

        final_grade, error = EnhancedGradingService.calculate_final_grade(
            student_id=student_id,
            subject_id=int(data['subject_id']),
            class_id=int(data['class_id']),
            term=data['term'],
            academic_year=data['academic_year'],
            external_exam_score=float(data['external_score']) if data.get('external_score') is not None else None,
            grading_scheme_id=int(data['grading_scheme_id']),
            computed_by=int(get_jwt_identity()),
        )
        if error:
            return jsonify({'success': False, 'message': error}), 400

        return jsonify({
            'success': True,
            'message': 'Final grade calculated successfully',
            'data': {
                'id': final_grade.id,
                'class_score': final_grade.class_score_average,
                'external_score': final_grade.external_exam_score,
                'final_score': final_grade.final_percentage,
                'final_grade': final_grade.final_grade_symbol,
                'grade_point': final_grade.final_grade_points,
                'class_score_average': final_grade.class_score_average,
                'external_exam_score': final_grade.external_exam_score,
                'final_percentage': final_grade.final_percentage,
                'final_grade_symbol': final_grade.final_grade_symbol,
                'final_grade_points': final_grade.final_grade_points,
            },
        }), 201
    except Exception as exc:
        return jsonify({'success': False, 'message': str(exc)}), 500
