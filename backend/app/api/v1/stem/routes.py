from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import (
    STEMDomain, STEMSubject, STEMLearningModule, 
    STEMProject, STEMAssessment, STEMResourceCenter
)
from app.extensions import db
from . import stem_bp

@stem_bp.route('/domains', methods=['GET'])
@jwt_required()
def get_stem_domains():
    """Get all STEM domains"""
    try:
        domains = STEMDomain.query.filter_by(is_active=True).all()
        return jsonify({
            'success': True,
            'data': [{
                'id': domain.id,
                'name': domain.name,
                'code': domain.code,
                'description': domain.description,
                'color_code': domain.color_code
            } for domain in domains]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@stem_bp.route('/subjects/<int:educational_level_id>', methods=['GET'])
@jwt_required()
def get_stem_subjects(educational_level_id):
    """Get STEM subjects for educational level"""
    try:
        subjects = STEMSubject.query.filter_by(
            educational_level_id=educational_level_id,
            is_active=True
        ).all()
        
        return jsonify({
            'success': True,
            'data': [{
                'id': subj.id,
                'subject_name': subj.subject.name,
                'stem_domain': subj.stem_domain.name,
                'integration_level': subj.integration_level,
                'practical_hours_per_week': subj.practical_hours_per_week,
                'theory_hours_per_week': subj.theory_hours_per_week
            } for subj in subjects]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@stem_bp.route('/projects', methods=['POST'])
@jwt_required()
def create_stem_project():
    """Create new STEM project"""
    try:
        data = request.get_json()
        
        project = STEMProject(
            title=data['title'],
            description=data['description'],
            stem_domain_id=data['stem_domain_id'],
            educational_level_id=data['educational_level_id'],
            difficulty_level=data['difficulty_level'],
            estimated_duration_hours=data['estimated_duration_hours'],
            learning_objectives=data.get('learning_objectives', []),
            required_materials=data.get('required_materials', []),
            assessment_criteria=data.get('assessment_criteria', []),
            teacher_id=get_jwt_identity()
        )
        
        db.session.add(project)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'STEM project created successfully',
            'data': {'id': project.id}
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500