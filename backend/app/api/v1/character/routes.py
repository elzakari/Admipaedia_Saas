from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import (
    CharacterDomain, CharacterTrait, CharacterAssessment,
    CharacterActivity, CharacterDevelopmentPlan
)
from app.extensions import db
from . import character_bp
from datetime import datetime

@character_bp.route('/domains', methods=['GET'])
@jwt_required()
def get_character_domains():
    """Get all character development domains"""
    try:
        domains = CharacterDomain.query.filter_by(is_active=True).all()
        return jsonify({
            'success': True,
            'data': [{
                'id': domain.id,
                'name': domain.name,
                'description': domain.description,
                'cultural_context': domain.cultural_context
            } for domain in domains]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@character_bp.route('/traits/<int:educational_level_id>', methods=['GET'])
@jwt_required()
def get_character_traits(educational_level_id):
    """Get character traits for educational level"""
    try:
        traits = CharacterTrait.query.filter_by(
            educational_level_id=educational_level_id,
            is_active=True
        ).all()
        
        return jsonify({
            'success': True,
            'data': [{
                'id': trait.id,
                'name': trait.name,
                'domain': trait.domain.name,
                'description': trait.description,
                'behavioral_indicators': trait.behavioral_indicators,
                'assessment_criteria': trait.assessment_criteria
            } for trait in traits]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@character_bp.route('/student/<int:student_id>/assessment', methods=['POST'])
@jwt_required()
def assess_character_trait(student_id):
    """Assess student character trait"""
    try:
        data = request.get_json()
        
        assessment = CharacterAssessment(
            student_id=student_id,
            trait_id=data['trait_id'],
            assessment_date=datetime.strptime(data['assessment_date'], '%Y-%m-%d').date(),
            rating=data['rating'],
            evidence=data.get('evidence'),
            improvement_areas=data.get('improvement_areas', []),
            teacher_id=get_jwt_identity(),
            term=data.get('term'),
            academic_year=data.get('academic_year')
        )
        
        db.session.add(assessment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Character assessment recorded successfully',
            'data': {'id': assessment.id}
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500