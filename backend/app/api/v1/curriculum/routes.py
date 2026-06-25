import json
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.curriculum import Curriculum, LearningObjective, CurriculumStandard, LearningObjectiveType
from app.models.curriculum_unit import CurriculumUnit
from app.models.enhanced_sba import EnhancedSBA
from app.models.progression_tracking import StudentProgression
from app.models.educational_level import EducationalLevel, CoreCompetency
from app.models.subject import Subject
from app.models.user import User
from . import curriculum_bp
from datetime import datetime
from sqlalchemy import and_, or_


def _parse_curriculum_standard(value):
    if value in (None, ''):
        return CurriculumStandard.STANDARDS_BASED

    normalized = str(value).strip()
    aliases = {
        'GHANA_SBC': CurriculumStandard.STANDARDS_BASED,
        'STANDARD_BASED': CurriculumStandard.STANDARDS_BASED,
        'STANDARDS_BASED': CurriculumStandard.STANDARDS_BASED,
        'COMPETENCY_BASED': CurriculumStandard.COMPETENCY_BASED,
        'STEM_FOCUSED': CurriculumStandard.STEM_FOCUSED,
        'CHARACTER_DEVELOPMENT': CurriculumStandard.CHARACTER_DEVELOPMENT,
    }
    if normalized in aliases:
        return aliases[normalized]

    try:
        return CurriculumStandard(normalized.lower())
    except ValueError as exc:
        allowed = ', '.join(standard.value for standard in CurriculumStandard)
        raise ValueError(f'Invalid curriculum_standard. Allowed values: {allowed}') from exc


def _serialize_curriculum_unit(unit):
    return {
        'id': unit.id,
        'curriculum_id': unit.curriculum_id,
        'title': unit.title,
        'description': unit.description,
        'objectives': unit.objectives,
        'resources': unit.resources,
        'duration_weeks': unit.duration_weeks,
        'sequence_order': unit.sequence_order,
        'created_at': unit.created_at.isoformat() if unit.created_at else None,
        'updated_at': unit.updated_at.isoformat() if unit.updated_at else None,
        # Legacy aliases kept for older clients/tests.
        'unit_number': unit.sequence_order,
        'unit_title': unit.title,
        'unit_description': unit.description,
        'week_number': unit.sequence_order,
        'start_week': unit.sequence_order,
        'end_week': unit.sequence_order + max(unit.duration_weeks - 1, 0),
        'key_concepts': [],
        'learning_activities': [],
        'resources_required': unit.resources,
        'formative_assessments': [],
        'summative_assessments': [],
        'is_active': True,
    }


def _serialize_curriculum(curriculum, include_details=False):
    educational_level = curriculum.educational_level
    subject = curriculum.subject

    curriculum_data = {
        'id': curriculum.id,
        'title': curriculum.title,
        'description': curriculum.description,
        'grade_level': educational_level.level_name if educational_level else None,
        'educational_level_id': curriculum.educational_level_id,
        'educational_level': {
            'id': educational_level.id,
            'name': educational_level.level_name,
            'code': educational_level.level_code,
            'key_phase': educational_level.key_phase,
            'age_range': (
                f"{educational_level.min_age}-{educational_level.max_age}"
                if educational_level and educational_level.min_age is not None and educational_level.max_age is not None
                else None
            ),
        } if educational_level else None,
        'subject_id': curriculum.subject_id,
        'subject_name': subject.name if subject else None,
        'subject': {
            'id': subject.id,
            'name': subject.name,
            'code': subject.code,
        } if subject else None,
        'curriculum_standard': curriculum.curriculum_standard.value if curriculum.curriculum_standard else None,
        'academic_year': curriculum.academic_year,
        'term': curriculum.term,
        'duration_weeks': curriculum.duration_weeks,
        'competency_weights': {
            'critical_thinking': curriculum.critical_thinking_weight,
            'creativity': curriculum.creativity_weight,
            'communication': curriculum.communication_weight,
            'collaboration': curriculum.collaboration_weight,
        },
        'assessment_config': {
            'sba_percentage': curriculum.sba_percentage,
            'external_exam_percentage': curriculum.external_exam_percentage,
        },
        'created_by': curriculum.created_by,
        'status': curriculum.status,
        'created_at': curriculum.created_at.isoformat() if curriculum.created_at else None,
        'updated_at': curriculum.updated_at.isoformat() if curriculum.updated_at else None,
        'learning_objectives_count': len(curriculum.learning_objectives),
        'units_count': len(curriculum.units),
    }

    if include_details:
        curriculum_data['learning_objectives'] = [{
            'id': obj.id,
            'objective_code': obj.objective_code,
            'objective_text': obj.objective_text,
            'objective_type': obj.objective_type.value,
            'core_competency_ids': obj.core_competency_ids,
            'subject_competency_ids': obj.subject_competency_ids,
            'assessment_criteria': obj.assessment_criteria,
            'performance_indicators': obj.performance_indicators,
            'sequence_order': obj.sequence_order,
            'prerequisite_objectives': obj.prerequisite_objectives,
            'is_active': obj.is_active,
        } for obj in curriculum.learning_objectives]
        curriculum_data['units'] = [_serialize_curriculum_unit(unit) for unit in curriculum.units]
        curriculum_data['creator'] = {
            'id': curriculum.creator.id,
            'name': curriculum.creator.get_full_name() if hasattr(curriculum.creator, 'get_full_name') else curriculum.creator.username,
        } if curriculum.creator else None
        curriculum_data['approver'] = {
            'id': curriculum.approver.id,
            'name': curriculum.approver.get_full_name() if hasattr(curriculum.approver, 'get_full_name') else curriculum.approver.username,
        } if curriculum.approver else None

    return curriculum_data


def _coerce_text(value):
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, (list, dict)):
        return json.dumps(value)
    return str(value)

@curriculum_bp.route('', methods=['GET'])
@curriculum_bp.route('/', methods=['GET'])
@jwt_required()
def get_curricula():
    """Get all curricula with optional filtering"""
    try:
        # Query parameters
        educational_level_id = request.args.get('educational_level_id', type=int)
        subject_id = request.args.get('subject_id', type=int)
        academic_year = request.args.get('academic_year')
        term = request.args.get('term')
        status = request.args.get('status')
        curriculum_standard = request.args.get('curriculum_standard')
        
        # Base query
        query = Curriculum.query
        
        # Apply filters
        if educational_level_id:
            query = query.filter(Curriculum.educational_level_id == educational_level_id)
        if subject_id:
            query = query.filter(Curriculum.subject_id == subject_id)
        if academic_year:
            query = query.filter(Curriculum.academic_year == academic_year)
        if term:
            query = query.filter(Curriculum.term == term)
        if status:
            query = query.filter(Curriculum.status == status)
        if curriculum_standard:
            query = query.filter(Curriculum.curriculum_standard == curriculum_standard)
        
        curricula = query.all()
        
        result = [_serialize_curriculum(curriculum) for curriculum in curricula]
        
        return jsonify({
            'success': True,
            'data': result,
            'curricula': result,
            'total': len(result)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving curricula: {str(e)}'
        }), 500

@curriculum_bp.route('/<int:curriculum_id>', methods=['GET'])
@jwt_required()
def get_curriculum(curriculum_id):
    """Get detailed curriculum information"""
    try:
        curriculum = Curriculum.query.get_or_404(curriculum_id)
        
        curriculum_data = _serialize_curriculum(curriculum, include_details=True)
        
        return jsonify({
            'success': True,
            'data': curriculum_data,
            'curriculum': curriculum_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving curriculum: {str(e)}'
        }), 500

@curriculum_bp.route('/', methods=['POST'])
@jwt_required()
def create_curriculum():
    """Create a new curriculum"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'educational_level_id', 'subject_id', 'academic_year', 'term']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Validate competency weights sum to 100
        educational_level = EducationalLevel.query.get(data['educational_level_id'])
        subject = Subject.query.get(data['subject_id'])
        if not educational_level:
            return jsonify({'success': False, 'message': 'Educational level not found'}), 400
        if not subject:
            return jsonify({'success': False, 'message': 'Subject not found'}), 400

        # Validate competency weights sum to 100
        weights = {
            'critical_thinking_weight': data.get('critical_thinking_weight', 25.0),
            'creativity_weight': data.get('creativity_weight', 25.0),
            'communication_weight': data.get('communication_weight', 25.0),
            'collaboration_weight': data.get('collaboration_weight', 25.0)
        }
        
        if sum(weights.values()) != 100.0:
            return jsonify({
                'success': False,
                'message': 'Competency weights must sum to 100%'
            }), 400
        
        # Validate assessment percentages sum to 100
        sba_percentage = data.get('sba_percentage', 40.0)
        external_exam_percentage = data.get('external_exam_percentage', 60.0)
        
        if sba_percentage + external_exam_percentage != 100.0:
            return jsonify({
                'success': False,
                'message': 'SBA and external exam percentages must sum to 100%'
            }), 400
        
        # Create curriculum
        curriculum = Curriculum(
            title=data['title'],
            description=data.get('description'),
            educational_level_id=data['educational_level_id'],
            subject_id=data['subject_id'],
            curriculum_standard=_parse_curriculum_standard(data.get('curriculum_standard')),
            academic_year=data['academic_year'],
            term=data['term'],
            duration_weeks=data.get('duration_weeks', 13),
            critical_thinking_weight=weights['critical_thinking_weight'],
            creativity_weight=weights['creativity_weight'],
            communication_weight=weights['communication_weight'],
            collaboration_weight=weights['collaboration_weight'],
            sba_percentage=sba_percentage,
            external_exam_percentage=external_exam_percentage,
            created_by=current_user_id,
            status=data.get('status', 'draft')
        )
        
        db.session.add(curriculum)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Curriculum created successfully',
            'data': _serialize_curriculum(curriculum, include_details=True),
            'curriculum': _serialize_curriculum(curriculum, include_details=True),
        }), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error creating curriculum: {str(e)}'
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error creating curriculum: {str(e)}'
        }), 500


@curriculum_bp.route('/<int:curriculum_id>', methods=['PUT'])
@jwt_required()
def update_curriculum(curriculum_id):
    """Update an existing curriculum"""
    try:
        curriculum = Curriculum.query.get_or_404(curriculum_id)
        data = request.get_json() or {}

        if 'title' in data:
            curriculum.title = data['title']
        if 'description' in data:
            curriculum.description = data.get('description')
        if 'educational_level_id' in data:
            curriculum.educational_level_id = data['educational_level_id']
        if 'subject_id' in data:
            curriculum.subject_id = data['subject_id']
        if 'curriculum_standard' in data:
            curriculum.curriculum_standard = _parse_curriculum_standard(data.get('curriculum_standard'))
        if 'academic_year' in data:
            curriculum.academic_year = data['academic_year']
        if 'term' in data:
            curriculum.term = data['term']
        if 'duration_weeks' in data:
            curriculum.duration_weeks = data['duration_weeks']
        if 'critical_thinking_weight' in data:
            curriculum.critical_thinking_weight = data['critical_thinking_weight']
        if 'creativity_weight' in data:
            curriculum.creativity_weight = data['creativity_weight']
        if 'communication_weight' in data:
            curriculum.communication_weight = data['communication_weight']
        if 'collaboration_weight' in data:
            curriculum.collaboration_weight = data['collaboration_weight']
        if 'sba_percentage' in data:
            curriculum.sba_percentage = data['sba_percentage']
        if 'external_exam_percentage' in data:
            curriculum.external_exam_percentage = data['external_exam_percentage']
        if 'status' in data:
            curriculum.status = data['status']

        db.session.commit()
        serialized = _serialize_curriculum(curriculum, include_details=True)
        return jsonify({
            'success': True,
            'message': 'Curriculum updated successfully',
            'data': serialized,
            'curriculum': serialized,
        }), 200
    except ValueError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error updating curriculum: {str(e)}'}), 500


@curriculum_bp.route('/<int:curriculum_id>', methods=['DELETE'])
@jwt_required()
def delete_curriculum(curriculum_id):
    """Delete a curriculum"""
    try:
        curriculum = Curriculum.query.get_or_404(curriculum_id)
        db.session.delete(curriculum)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Curriculum deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error deleting curriculum: {str(e)}'}), 500


@curriculum_bp.route('/<int:curriculum_id>/units', methods=['GET'])
@jwt_required()
def get_curriculum_units(curriculum_id):
    """Get units for a curriculum"""
    try:
        curriculum = Curriculum.query.get_or_404(curriculum_id)
        units = [_serialize_curriculum_unit(unit) for unit in curriculum.units]
        return jsonify({
            'success': True,
            'data': units,
            'units': units,
            'total': len(units),
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error retrieving curriculum units: {str(e)}'}), 500


@curriculum_bp.route('/<int:curriculum_id>/units', methods=['POST'])
@curriculum_bp.route('/units', methods=['POST'])
@jwt_required()
def create_curriculum_unit(curriculum_id=None):
    """Create a curriculum unit"""
    try:
        data = request.get_json() or {}
        resolved_curriculum_id = curriculum_id or data.get('curriculum_id')
        if not resolved_curriculum_id:
            return jsonify({'success': False, 'message': 'curriculum_id is required'}), 400

        Curriculum.query.get_or_404(resolved_curriculum_id)

        title = data.get('title') or data.get('unit_title')
        if not title:
            return jsonify({'success': False, 'message': 'title is required'}), 400

        sequence_order = data.get('sequence_order')
        if sequence_order in (None, ''):
            sequence_order = data.get('week_number') or data.get('unit_number') or 1

        duration_weeks = data.get('duration_weeks')
        if duration_weeks in (None, ''):
            start_week = data.get('start_week')
            end_week = data.get('end_week')
            if start_week is not None and end_week is not None:
                duration_weeks = max(int(end_week) - int(start_week) + 1, 1)
            else:
                duration_weeks = 1

        unit = CurriculumUnit(
            curriculum_id=resolved_curriculum_id,
            title=title,
            description=data.get('description') or data.get('unit_description'),
            objectives=_coerce_text(data.get('objectives') or data.get('key_concepts') or data.get('learning_activities')),
            resources=_coerce_text(data.get('resources') or data.get('resources_required')),
            duration_weeks=int(duration_weeks),
            sequence_order=int(sequence_order),
        )

        db.session.add(unit)
        db.session.commit()
        serialized = _serialize_curriculum_unit(unit)
        return jsonify({
            'success': True,
            'message': 'Curriculum unit created successfully',
            'data': serialized,
            'unit': serialized,
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error creating curriculum unit: {str(e)}'}), 500


@curriculum_bp.route('/units/<int:unit_id>', methods=['PUT'])
@jwt_required()
def update_curriculum_unit(unit_id):
    """Update a curriculum unit"""
    try:
        unit = CurriculumUnit.query.get_or_404(unit_id)
        data = request.get_json() or {}

        if 'curriculum_id' in data:
            unit.curriculum_id = data['curriculum_id']
        if 'title' in data or 'unit_title' in data:
            unit.title = data.get('title') or data.get('unit_title')
        if 'description' in data or 'unit_description' in data:
            unit.description = data.get('description') or data.get('unit_description')
        if 'objectives' in data or 'key_concepts' in data or 'learning_activities' in data:
            unit.objectives = _coerce_text(data.get('objectives') or data.get('key_concepts') or data.get('learning_activities'))
        if 'resources' in data or 'resources_required' in data:
            unit.resources = _coerce_text(data.get('resources') or data.get('resources_required'))
        if 'duration_weeks' in data:
            unit.duration_weeks = int(data['duration_weeks'])
        elif 'start_week' in data and 'end_week' in data:
            unit.duration_weeks = max(int(data['end_week']) - int(data['start_week']) + 1, 1)
        if 'sequence_order' in data:
            unit.sequence_order = int(data['sequence_order'])
        elif 'week_number' in data:
            unit.sequence_order = int(data['week_number'])

        db.session.commit()
        serialized = _serialize_curriculum_unit(unit)
        return jsonify({
            'success': True,
            'message': 'Curriculum unit updated successfully',
            'data': serialized,
            'unit': serialized,
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error updating curriculum unit: {str(e)}'}), 500


@curriculum_bp.route('/units/<int:unit_id>', methods=['DELETE'])
@jwt_required()
def delete_curriculum_unit(unit_id):
    """Delete a curriculum unit"""
    try:
        unit = CurriculumUnit.query.get_or_404(unit_id)
        db.session.delete(unit)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Curriculum unit deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error deleting curriculum unit: {str(e)}'}), 500

@curriculum_bp.route('/<int:curriculum_id>/learning-objectives', methods=['GET'])
@jwt_required()
def get_learning_objectives(curriculum_id):
    """Get learning objectives for a curriculum"""
    try:
        curriculum = Curriculum.query.get_or_404(curriculum_id)
        
        objectives = []
        for obj in curriculum.learning_objectives:
            objectives.append({
                'id': obj.id,
                'objective_code': obj.objective_code,
                'objective_text': obj.objective_text,
                'objective_type': obj.objective_type.value,
                'core_competency_ids': obj.core_competency_ids,
                'subject_competency_ids': obj.subject_competency_ids,
                'assessment_criteria': obj.assessment_criteria,
                'performance_indicators': obj.performance_indicators,
                'sequence_order': obj.sequence_order,
                'prerequisite_objectives': obj.prerequisite_objectives,
                'is_active': obj.is_active,
                'created_at': obj.created_at.isoformat(),
                'updated_at': obj.updated_at.isoformat()
            })
        
        # Sort by sequence order
        objectives.sort(key=lambda x: x['sequence_order'])
        
        return jsonify({
            'success': True,
            'data': objectives,
            'total': len(objectives)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving learning objectives: {str(e)}'
        }), 500

@curriculum_bp.route('/<int:curriculum_id>/learning-objectives', methods=['POST'])
@jwt_required()
def create_learning_objective(curriculum_id):
    """Create a new learning objective for a curriculum"""
    try:
        curriculum = Curriculum.query.get_or_404(curriculum_id)
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['objective_code', 'objective_text', 'objective_type', 'sequence_order']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Check if objective code already exists for this curriculum
        existing_objective = LearningObjective.query.filter_by(
            curriculum_id=curriculum_id,
            objective_code=data['objective_code']
        ).first()
        
        if existing_objective:
            return jsonify({
                'success': False,
                'message': 'Objective code already exists for this curriculum'
            }), 400
        
        # Create learning objective
        objective = LearningObjective(
            curriculum_id=curriculum_id,
            objective_code=data['objective_code'],
            objective_text=data['objective_text'],
            objective_type=LearningObjectiveType(data['objective_type']),
            core_competency_ids=data.get('core_competency_ids'),
            subject_competency_ids=data.get('subject_competency_ids'),
            assessment_criteria=data.get('assessment_criteria'),
            performance_indicators=data.get('performance_indicators'),
            sequence_order=data['sequence_order'],
            prerequisite_objectives=data.get('prerequisite_objectives'),
            is_active=data.get('is_active', True)
        )
        
        db.session.add(objective)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Learning objective created successfully',
            'data': {
                'id': objective.id,
                'objective_code': objective.objective_code,
                'objective_text': objective.objective_text
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error creating learning objective: {str(e)}'
        }), 500

@curriculum_bp.route('/competency-mapping/<int:student_id>', methods=['GET'])
@jwt_required()
def get_student_competency_mapping(student_id):
    """Get competency mapping and progress for a student"""
    try:
        # Get student's current curricula
        current_year = datetime.now().year
        
        # Get student's enhanced SBA records
        sba_records = EnhancedSBA.query.filter_by(
            student_id=student_id,
            academic_year=str(current_year)
        ).all()
        
        # Get student's progression record
        progression = StudentProgression.query.filter_by(
            student_id=student_id,
            academic_year=str(current_year)
        ).first()
        
        competency_data = {
            'student_id': student_id,
            'academic_year': str(current_year),
            'core_competencies': {
                'critical_thinking': 0.0,
                'creativity': 0.0,
                'communication': 0.0,
                'collaboration': 0.0
            },
            'subject_competencies': {},
            'overall_progress': 0.0,
            'sba_summary': [],
            'progression_status': None
        }
        
        # Calculate competency averages from SBA records
        if sba_records:
            total_records = len(sba_records)
            competency_sums = {
                'critical_thinking': 0.0,
                'creativity': 0.0,
                'communication': 0.0,
                'collaboration': 0.0
            }
            
            for sba in sba_records:
                if sba.core_competencies_scores:
                    for competency, score in sba.core_competencies_scores.items():
                        if competency in competency_sums:
                            competency_sums[competency] += score
                
                # Add subject-specific data
                subject_name = sba.subject.name if sba.subject else 'Unknown'
                competency_data['subject_competencies'][subject_name] = {
                    'total_sba_score': sba.total_sba_score,
                    'class_exercises_score': sba.class_exercises_score,
                    'homework_score': sba.homework_score,
                    'project_score': sba.project_score,
                    'test_score': sba.test_score,
                    'practical_score': sba.practical_score,
                    'oral_score': sba.oral_score
                }
                
                competency_data['sba_summary'].append({
                    'subject': subject_name,
                    'term': sba.term,
                    'total_score': sba.total_sba_score,
                    'assessment_date': sba.assessment_date.isoformat() if sba.assessment_date else None
                })
            
            # Calculate averages
            for competency in competency_sums:
                competency_data['core_competencies'][competency] = competency_sums[competency] / total_records
        
        # Add progression information
        if progression:
            competency_data['progression_status'] = {
                'current_level': progression.current_educational_level.level_name if progression.current_educational_level else None,
                'next_level': progression.next_educational_level.level_name if progression.next_educational_level else None,
                'overall_average': progression.overall_academic_average,
                'attendance_percentage': progression.attendance_percentage,
                'core_competencies_average': progression.core_competencies_average,
                'character_development_score': progression.character_development_score,
                'promotion_status': progression.promotion_status.value if progression.promotion_status else None,
                'promotion_decision_date': progression.promotion_decision_date.isoformat() if progression.promotion_decision_date else None
            }
            
            competency_data['overall_progress'] = progression.overall_academic_average or 0.0
        
        return jsonify({
            'success': True,
            'data': competency_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving competency mapping: {str(e)}'
        }), 500

@curriculum_bp.route('/standards', methods=['GET'])
@jwt_required()
def get_curriculum_standards():
    """Get available curriculum standards"""
    try:
        standards = [{
            'value': standard.value,
            'name': standard.name.replace('_', ' ').title()
        } for standard in CurriculumStandard]
        
        objective_types = [{
            'value': obj_type.value,
            'name': obj_type.name.replace('_', ' ').title()
        } for obj_type in LearningObjectiveType]
        
        return jsonify({
            'success': True,
            'data': {
                'curriculum_standards': standards,
                'learning_objective_types': objective_types
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving curriculum standards: {str(e)}'
        }), 500

@curriculum_bp.route('', methods=['OPTIONS'])
@curriculum_bp.route('/', methods=['OPTIONS'])
def handle_options():
    """Handle preflight OPTIONS requests."""
    return '', 200
