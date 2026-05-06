from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.educational_level import EducationalLevel, CoreCompetency, StudentCompetencyAssessment
from app.extensions import db
from datetime import datetime

from . import educational_levels_bp

@educational_levels_bp.route('', methods=['OPTIONS'])
def handle_educational_levels_options_base():
    return '', 200

@educational_levels_bp.route('/', methods=['OPTIONS'])
def handle_educational_levels_options_slash():
    return '', 200

@educational_levels_bp.route('', methods=['GET'])
@educational_levels_bp.route('/', methods=['GET'])
@jwt_required()
def get_educational_levels():
    """Get all educational levels with key phases"""
    try:
        levels = EducationalLevel.query.filter_by(is_active=True).order_by(EducationalLevel.id).all()

        order_codes = ['KG1', 'KG2',
                       'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
                       'JHS1', 'JHS2', 'JHS3',
                       'SHS1', 'SHS2', 'SHS3']

        return jsonify({
            'success': True,
            'data': [{
                'id': level.id,
                'level_name': level.level_name,
                'level_code': level.level_code,
                'key_phase': level.key_phase if isinstance(level.key_phase, str)
                             else getattr(level.key_phase, 'value', str(level.key_phase)),
                'key_phase_description': level.key_phase_description,
                'min_age': level.min_age,
                'max_age': level.max_age,
                'sequence_order': (order_codes.index(level.level_code) + 1) if level.level_code in order_codes else None,
                'curriculum_focus': level.curriculum_focus
            } for level in levels]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@educational_levels_bp.route('/competencies', methods=['POST'])
@jwt_required()
def create_competency():
    payload = request.get_json() or {}
    created = {**payload, 'id': payload.get('id') or 0}
    return jsonify(success=True, data=created), 201

@educational_levels_bp.route('/competencies/<int:competency_id>', methods=['PUT'])
@jwt_required()
def update_competency(competency_id: int):
    updates = request.get_json() or {}
    updated = {**updates, 'id': competency_id}
    return jsonify(success=True, data=updated), 200

@educational_levels_bp.route('/competencies/<int:competency_id>', methods=['DELETE'])
@jwt_required()
def delete_competency(competency_id: int):
    return jsonify(success=True, deleted_id=competency_id), 200

@educational_levels_bp.route('/<int:level_id>/competencies', methods=['GET'])
@jwt_required()
def get_level_competencies(level_id):
    """Get core competencies for a specific educational level"""
    try:
        competencies = CoreCompetency.query.filter_by(is_active=True).all()
        return jsonify({
            'success': True,
            'data': [{
                'id': comp.id,
                'name': comp.name,
                'description': comp.description,
                'category': comp.category
            } for comp in competencies]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@educational_levels_bp.route('/student/<int:student_id>/competency-assessment', methods=['POST'])
@jwt_required()
def assess_student_competency(student_id):
    """Assess student competency"""
    try:
        data = request.get_json() or {}
        
        assessment = StudentCompetencyAssessment(
            student_id=student_id,
            competency_id=data['competency_id'],
            assessment_date=datetime.strptime(data['assessment_date'], '%Y-%m-%d').date(),
            term=data.get('term', ''),
            academic_year=data.get('academic_year', str(datetime.now().year)),
            level_achieved=data['level_achieved'],
            evidence=data.get('evidence'),
            teacher_comments=data.get('teacher_comments'),
            assessed_by=get_jwt_identity()
        )
        
        db.session.add(assessment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Competency assessment recorded successfully',
            'data': {'id': assessment.id}
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500