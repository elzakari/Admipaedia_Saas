from flask import jsonify, request
from app.api.v1.academics import academics_bp
from app.utils.auth_utils import admin_required, teacher_required
from flask_jwt_extended import jwt_required
from app.extensions import logger
from flask import g
from app.utils.tenant_context import tenant_required
from app.services.curriculum_service import CurriculumService
from app.models.educational_level import EducationalLevel, CoreCompetency
from app.schemas.curriculum import CurriculumSchema, CurriculumCreateSchema, CurriculumUpdateSchema, CurriculumListSchema
from app.schemas.curriculum_unit import CurriculumUnitSchema, CurriculumUnitCreateSchema, CurriculumUnitUpdateSchema
from app.schemas.educational_level import EducationalLevelSchema, CoreCompetencySchema
from marshmallow import ValidationError

# Initialize schemas
curriculum_schema = CurriculumSchema()
curricula_schema = CurriculumListSchema(many=True)
curriculum_create_schema = CurriculumCreateSchema()
curriculum_update_schema = CurriculumUpdateSchema()

curriculum_unit_schema = CurriculumUnitSchema()
curriculum_units_schema = CurriculumUnitSchema(many=True)
curriculum_unit_create_schema = CurriculumUnitCreateSchema()
curriculum_unit_update_schema = CurriculumUnitUpdateSchema()

educational_level_schema = EducationalLevelSchema()
educational_levels_schema = EducationalLevelSchema(many=True)
core_competency_schema = CoreCompetencySchema()
core_competencies_schema = CoreCompetencySchema(many=True)

@academics_bp.route('/educational-levels', methods=['GET'])
@jwt_required()
def get_educational_levels():
    """Get all educational levels."""
    try:
        levels = EducationalLevel.query.filter_by(is_active=True).all()
        return jsonify({
            'success': True,
            'levels': educational_levels_schema.dump(levels)
        }), 200
    except Exception as e:
        logger.error(f"Error retrieving educational levels: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@academics_bp.route('/standard-grade-levels', methods=['GET'])
@jwt_required()
@tenant_required
def get_standard_grade_levels():
    """Get all standardized grade levels scoped to the tenant's educational system configuration."""
    try:
        from app.models.educational_system import GradeLevel
        from app.extensions import db
        import sqlalchemy.exc

        # Audit and handle missing parameter context gracefully
        tenant_id = getattr(g, 'tenant_id', None)
        levels = []
        if not tenant_id:
            logger.warning("get_standard_grade_levels: tenant_id context is missing. Falling back to defaults.")
        else:
            try:
                # Query scoped grade levels safely
                levels = GradeLevel.query_scoped().filter(GradeLevel.is_active == True).order_by(GradeLevel.numeric_value.asc()).all()
            except sqlalchemy.exc.SQLAlchemyError as db_err:
                logger.error(f"Database exception querying GradeLevel: {str(db_err)}")
                # Handled database exceptions gracefully with fallback list to avoid modal crashes
                levels = []

        if not levels:
            # Fallback sequence to match the attendance module
            levels_data = [{
                'id': f"Grade {i}",
                'name': f"Grade {i}",
                'order_index': i
            } for i in range(1, 13)]
        else:
            levels_data = [{
                'id': f"Grade {level.numeric_value}",
                'name': f"Grade {level.numeric_value}",
                'order_index': level.order_index
            } for level in levels]

        return jsonify({
            'success': True,
            'levels': levels_data
        }), 200
    except Exception as e:
        logger.error(f"Error retrieving standard grade levels: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@academics_bp.route('/core-competencies', methods=['GET'])
@jwt_required()
def get_core_competencies():
    """Get all core competencies."""
    try:
        competencies = CoreCompetency.query.filter_by(is_active=True).all()
        return jsonify({
            'success': True,
            'competencies': core_competencies_schema.dump(competencies)
        }), 200
    except Exception as e:
        logger.error(f"Error retrieving core competencies: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

from app.models.grading_system import GradingScheme, GradeBoundary
from app.schemas.grading import GradingSchemeSchema, GradeBoundarySchema

# Initialize schemas
grading_scheme_schema = GradingSchemeSchema()
grading_schemes_schema = GradingSchemeSchema(many=True)

@academics_bp.route('/grading-scheme', methods=['GET'])
@academics_bp.route('/grading-system', methods=['GET'])
@jwt_required()
@tenant_required
def get_grading_scheme():
    """Get the active grading scheme configuration."""
    try:
        from flask_jwt_extended import current_user, get_jwt_identity
        from app.models.tenant import Tenant
        from app.models.user import User
        School = Tenant

        # Dynamic query parameter check for template boundaries
        system_param = request.args.get('system')
        if system_param:
            sys_upper = system_param.upper()
            boundaries = []
            if sys_upper in ('GES', 'WAEC'):
                boundaries = [
                    {'grade': 'A1', 'description': 'Excellent', 'minScore': 80, 'maxScore': 100, 'gradePoint': 4.0},
                    {'grade': 'B2', 'description': 'Very Good', 'minScore': 75, 'maxScore': 79, 'gradePoint': 3.5},
                    {'grade': 'B3', 'description': 'Good', 'minScore': 70, 'maxScore': 74, 'gradePoint': 3.0},
                    {'grade': 'C4', 'description': 'Credit', 'minScore': 65, 'maxScore': 69, 'gradePoint': 2.5},
                    {'grade': 'C5', 'description': 'Credit', 'minScore': 60, 'maxScore': 64, 'gradePoint': 2.0},
                    {'grade': 'C6', 'description': 'Credit', 'minScore': 55, 'maxScore': 59, 'gradePoint': 1.5},
                    {'grade': 'D7', 'description': 'Pass', 'minScore': 50, 'maxScore': 54, 'gradePoint': 1.0},
                    {'grade': 'E8', 'description': 'Pass', 'minScore': 45, 'maxScore': 49, 'gradePoint': 0.5},
                    {'grade': 'F9', 'description': 'Fail', 'minScore': 0, 'maxScore': 44, 'gradePoint': 0.0},
                ]
            elif sys_upper == 'IB':
                boundaries = [
                    {'grade': '7', 'description': 'Excellent', 'minScore': 90, 'maxScore': 100, 'gradePoint': 7.0},
                    {'grade': '6', 'description': 'Very Good', 'minScore': 80, 'maxScore': 89, 'gradePoint': 6.0},
                    {'grade': '5', 'description': 'Good', 'minScore': 70, 'maxScore': 79, 'gradePoint': 5.0},
                    {'grade': '4', 'description': 'Satisfactory', 'minScore': 60, 'maxScore': 69, 'gradePoint': 4.0},
                    {'grade': '3', 'description': 'Mediocre', 'minScore': 50, 'maxScore': 59, 'gradePoint': 3.0},
                    {'grade': '2', 'description': 'Poor', 'minScore': 40, 'maxScore': 49, 'gradePoint': 2.0},
                    {'grade': '1', 'description': 'Very Poor', 'minScore': 0, 'maxScore': 39, 'gradePoint': 1.0},
                ]
            elif sys_upper == 'CAMBRIDGE':
                boundaries = [
                    {'grade': 'A*', 'description': 'Excellent', 'minScore': 90, 'maxScore': 100, 'gradePoint': 4.0},
                    {'grade': 'A', 'description': 'Very Good', 'minScore': 80, 'maxScore': 89, 'gradePoint': 3.8},
                    {'grade': 'B', 'description': 'Good', 'minScore': 70, 'maxScore': 79, 'gradePoint': 3.5},
                    {'grade': 'C', 'description': 'Satisfactory', 'minScore': 60, 'maxScore': 69, 'gradePoint': 3.0},
                    {'grade': 'D', 'description': 'Minimum Pass', 'minScore': 50, 'maxScore': 59, 'gradePoint': 2.0},
                    {'grade': 'E', 'description': 'Unsatisfactory Pass', 'minScore': 40, 'maxScore': 49, 'gradePoint': 1.0},
                    {'grade': 'U', 'description': 'Ungraded', 'minScore': 0, 'maxScore': 39, 'gradePoint': 0.0},
                ]
            elif sys_upper == 'APC':
                boundaries = [
                    {'grade': 'M', 'description': 'Maîtrisé', 'minScore': 16, 'maxScore': 20, 'gradePoint': 16.0},
                    {'grade': 'A', 'description': 'Acquis', 'minScore': 14, 'maxScore': 15.99, 'gradePoint': 14.0},
                    {'grade': 'EA', 'description': 'En cours d’Acquisition', 'minScore': 10, 'maxScore': 13.99, 'gradePoint': 10.0},
                    {'grade': 'NA', 'description': 'Non Acquis', 'minScore': 0, 'maxScore': 9.99, 'gradePoint': 0.0},
                ]
            else:
                boundaries = [
                    {'grade': 'A', 'description': 'Excellent', 'minScore': 80, 'maxScore': 100, 'gradePoint': 4.0},
                    {'grade': 'B', 'description': 'Very Good', 'minScore': 70, 'maxScore': 79, 'gradePoint': 3.5},
                    {'grade': 'C', 'description': 'Good', 'minScore': 60, 'maxScore': 69, 'gradePoint': 3.0},
                    {'grade': 'D', 'description': 'Satisfactory', 'minScore': 50, 'maxScore': 59, 'gradePoint': 2.5},
                    {'grade': 'E', 'description': 'Pass', 'minScore': 40, 'maxScore': 49, 'gradePoint': 2.0},
                    {'grade': 'F', 'description': 'Fail', 'minScore': 0, 'maxScore': 39, 'gradePoint': 0.0},
                ]
            return jsonify({
                'success': True,
                'gradingScheme': boundaries
            }), 200

        # Helper: check if tenant has grading scales
        def tenant_has_grading_scales(school_id):
            return GradingScheme.query.filter_by(tenant_id=school_id, is_active=True).count() > 0

        def seed_default_scale_for_system(school_id, system_template):
            from app.extensions import db
            from app.services.academic_configuration_service import AcademicConfigurationService
            from app.models.educational_system import EducationalSystemConfig, EducationalSystemTemplate
            from app.services.educational_system.service import EducationalSystemService
            from app.services.education_initializer import TenantEducationInitializer
            
            # Ensure EducationalSystemTemplate exists for APC
            if system_template == "APC":
                tpl = EducationalSystemTemplate.query.filter_by(system_key="APC").first()
                if not tpl:
                    try:
                        tpl = EducationalSystemTemplate(
                            country_code="TG",
                            system_key="APC",
                            name="Togo APC (Approche Par Compétence)",
                            description="Francophone structure utilizing APC rubric evaluation and 0-20 numeric aliasing",
                            config={
                                "phases": [
                                    {"name": "Primaire", "levels": ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"]},
                                    {"name": "Secondaire - Collège", "levels": ["6e", "5e", "4e", "3e"]},
                                    {"name": "Secondaire - Lycée", "levels": ["Seconde", "Première", "Terminale"]}
                                ],
                                "grading": {
                                    "type": "rubric",
                                    "scale": "0-20",
                                    "pass_mark": 10,
                                    "schemes": [
                                        {"name": "M", "min": 16.00, "max": 20.00, "point": 16.00, "description": "Maîtrisé"},
                                        {"name": "A", "min": 14.00, "max": 15.99, "point": 14.00, "description": "Acquis"},
                                        {"name": "EA", "min": 10.00, "max": 13.99, "point": 10.00, "description": "En cours d’Acquisition"},
                                        {"name": "NA", "min": 0.00, "max": 9.99, "point": 0.00, "description": "Non Acquis"}
                                    ]
                                },
                                "assessments": {
                                    "continuous_assessment_weight": 40,
                                    "exam_weight": 60
                                },
                                "locales": {"default": "fr", "supported": ["fr", "en"]}
                            }
                        )
                        db.session.add(tpl)
                        db.session.commit()
                    except Exception:
                        db.session.rollback()

            # Ensure EducationalSystemConfig and structural layers are set up
            cfg = EducationalSystemConfig.query.filter_by(tenant_id=school_id, is_active=True).first()
            if not cfg and system_template:
                try:
                    EducationalSystemService.apply_template_to_tenant(system_template, school_id)
                    TenantEducationInitializer.run_setup(school_id, system_template)
                except Exception:
                    pass
            
            # Run the harmonized config sync
            config = AcademicConfigurationService.build_harmonized_config(school_id)
            AcademicConfigurationService.sync_grading_scheme_from_config(school_id, config)

        # Resolve active school/tenant ID
        user_identity = get_jwt_identity()
        user_obj = User.query.get(user_identity) if user_identity else None
        
        school_id = g.tenant_id
        if not school_id and user_obj:
            school_id = user_obj.school_id
        elif not school_id and current_user and hasattr(current_user, 'school_id'):
            school_id = current_user.school_id

        if school_id:
            # Backend defensive fallback pattern
            school_profile = School.query.get(school_id)
            if school_profile:
                system_template = school_profile.education_system
                if not tenant_has_grading_scales(school_id):
                    seed_default_scale_for_system(school_id, system_template)

        scheme = GradingScheme.query.filter_by(tenant_id=g.tenant_id, is_active=True, is_default=True).first()
        
        # Fallback to first active scheme if no default
        if not scheme:
            scheme = GradingScheme.query.filter_by(tenant_id=g.tenant_id, is_active=True).first()

        if not scheme:
            scheme = GradingScheme.query.filter_by(tenant_id=None, is_active=True, is_default=True).first()

        if not scheme:
            scheme = GradingScheme.query.filter_by(tenant_id=None, is_active=True).first()
            
        if not scheme:
            # If no scheme in DB, return a default static one (same as before but structured)
            default_scheme = {
                'id': 0,
                'name': 'Default GES Grading Scheme',
                'standard': 'continuous_assessment',
                'description': 'System default grading scheme',
                'is_active': True,
                'grade_boundaries': [
                    {'grade_symbol': 'A1', 'grade_name': 'Excellent', 'min_score': 80, 'max_score': 100, 'is_passing': True, 'sequence_order': 1},
                    {'grade_symbol': 'B2', 'grade_name': 'Very Good', 'min_score': 70, 'max_score': 79, 'is_passing': True, 'sequence_order': 2},
                    {'grade_symbol': 'B3', 'grade_name': 'Good', 'min_score': 60, 'max_score': 69, 'is_passing': True, 'sequence_order': 3},
                    {'grade_symbol': 'C4', 'grade_name': 'Credit', 'min_score': 55, 'max_score': 59, 'is_passing': True, 'sequence_order': 4},
                    {'grade_symbol': 'C5', 'grade_name': 'Credit', 'min_score': 50, 'max_score': 54, 'is_passing': True, 'sequence_order': 5},
                    {'grade_symbol': 'C6', 'grade_name': 'Credit', 'min_score': 45, 'max_score': 49, 'is_passing': True, 'sequence_order': 6},
                    {'grade_symbol': 'D7', 'grade_name': 'Pass', 'min_score': 40, 'max_score': 44, 'is_passing': True, 'sequence_order': 7},
                    {'grade_symbol': 'E8', 'grade_name': 'Pass', 'min_score': 35, 'max_score': 39, 'is_passing': True, 'sequence_order': 8},
                    {'grade_symbol': 'F9', 'grade_name': 'Fail', 'min_score': 0, 'max_score': 34, 'is_passing': False, 'sequence_order': 9},
                ]
            }
            return jsonify({
                'success': True,
                'gradingScheme': default_scheme['grade_boundaries'], # Maintain backward compatibility with frontend
                'full_scheme': default_scheme
            }), 200
            
        return jsonify({
            'success': True,
            'gradingScheme': [
                {
                    'grade': b.grade_symbol,
                    'minScore': b.min_score,
                    'maxScore': b.max_score,
                    'description': b.grade_name
                } for b in sorted(scheme.grade_boundaries, key=lambda x: x.sequence_order)
            ],
            'full_scheme': grading_scheme_schema.dump(scheme)
        }), 200
    except Exception as e:
        logger.error(f"Error retrieving grading scheme: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Curriculum routes
@academics_bp.route('/curricula', methods=['GET'])
@jwt_required()
def get_curricula():
    """Get all curricula with optional filtering."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        subject_id = request.args.get('subject_id', type=int)
        grade_level = request.args.get('grade_level')
        academic_year = request.args.get('academic_year')
        
        paginated_curricula = CurriculumService.get_all_curricula(
            page, per_page, subject_id, grade_level, academic_year
        )
        
        # Add subject names to the curricula
        curricula_with_subjects = []
        for curriculum in paginated_curricula.items:
            curriculum_dict = curriculum_schema.dump(curriculum)
            if curriculum.subject:
                curriculum_dict['subject_name'] = curriculum.subject.name
            curricula_with_subjects.append(curriculum_dict)
        
        return jsonify({
            'success': True,
            'curricula': curricula_with_subjects,
            'pagination': {
                'total': paginated_curricula.total,
                'pages': paginated_curricula.pages,
                'page': paginated_curricula.page,
                'per_page': paginated_curricula.per_page,
                'next': paginated_curricula.next_num,
                'prev': paginated_curricula.prev_num
            }
        }), 200
    except Exception as e:
        logger.error(f"Error retrieving curricula: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to retrieve curricula: {str(e)}"
        }), 500

@academics_bp.route('/curricula/<int:curriculum_id>', methods=['GET'])
@jwt_required()
def get_curriculum(curriculum_id):
    """Get a specific curriculum by ID."""
    try:
        curriculum = CurriculumService.get_curriculum_by_id(curriculum_id)
        
        if not curriculum:
            return jsonify({'success': False, 'message': 'Curriculum not found'}), 404
        
        curriculum_dict = curriculum_schema.dump(curriculum)
        if curriculum.subject:
            curriculum_dict['subject_name'] = curriculum.subject.name
        
        return jsonify({
            'success': True,
            'curriculum': curriculum_dict
        }), 200
    except Exception as e:
        logger.error(f"Error retrieving curriculum {curriculum_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to retrieve curriculum: {str(e)}"
        }), 500

@academics_bp.route('/curricula', methods=['POST'])
@jwt_required()
@teacher_required
def create_curriculum():
    """Create a new curriculum."""
    try:
        data = curriculum_create_schema.load(request.json)
        from flask_jwt_extended import get_jwt_identity
        
        # Add the current user as the creator
        data['created_by'] = get_jwt_identity()
        
        curriculum, error = CurriculumService.create_curriculum(data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        curriculum_dict = curriculum_schema.dump(curriculum)
        if curriculum.subject:
            curriculum_dict['subject_name'] = curriculum.subject.name
        
        return jsonify({
            'success': True,
            'message': 'Curriculum created successfully',
            'curriculum': curriculum_dict
        }), 201
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400
    except Exception as e:
        logger.error(f"Error creating curriculum: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to create curriculum: {str(e)}"
        }), 500

@academics_bp.route('/curricula/<int:curriculum_id>', methods=['PUT'])
@jwt_required()
@teacher_required
def update_curriculum(curriculum_id):
    """Update a curriculum."""
    try:
        data = curriculum_update_schema.load(request.json)
        
        curriculum, error = CurriculumService.update_curriculum(curriculum_id, data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        curriculum_dict = curriculum_schema.dump(curriculum)
        if curriculum.subject:
            curriculum_dict['subject_name'] = curriculum.subject.name
        
        return jsonify({
            'success': True,
            'message': 'Curriculum updated successfully',
            'curriculum': curriculum_dict
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400
    except Exception as e:
        logger.error(f"Error updating curriculum {curriculum_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to update curriculum: {str(e)}"
        }), 500

@academics_bp.route('/curricula/<int:curriculum_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_curriculum(curriculum_id):
    """Delete a curriculum."""
    try:
        success, error = CurriculumService.delete_curriculum(curriculum_id)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Curriculum deleted successfully'
        }), 200
    except Exception as e:
        logger.error(f"Error deleting curriculum {curriculum_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to delete curriculum: {str(e)}"
        }), 500

# Curriculum Unit routes
@academics_bp.route('/curricula/<int:curriculum_id>/units', methods=['GET'])
@jwt_required()
def get_curriculum_units(curriculum_id):
    """Get all units for a specific curriculum."""
    try:
        # First check if the curriculum exists
        curriculum = CurriculumService.get_curriculum_by_id(curriculum_id)
        if not curriculum:
            return jsonify({'success': False, 'message': 'Curriculum not found'}), 404
        
        units = CurriculumService.get_curriculum_units(curriculum_id)
        
        return jsonify({
            'success': True,
            'units': curriculum_units_schema.dump(units)
        }), 200
    except Exception as e:
        logger.error(f"Error retrieving units for curriculum {curriculum_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to retrieve curriculum units: {str(e)}"
        }), 500

@academics_bp.route('/curriculum-units', methods=['POST'])
@jwt_required()
@teacher_required
def create_curriculum_unit():
    """Create a new curriculum unit."""
    try:
        data = curriculum_unit_create_schema.load(request.json)
        
        # Check if the curriculum exists
        curriculum = CurriculumService.get_curriculum_by_id(data['curriculum_id'])
        if not curriculum:
            return jsonify({'success': False, 'message': 'Curriculum not found'}), 404
        
        unit, error = CurriculumService.add_curriculum_unit(data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Curriculum unit created successfully',
            'unit': curriculum_unit_schema.dump(unit)
        }), 201
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400
    except Exception as e:
        logger.error(f"Error creating curriculum unit: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to create curriculum unit: {str(e)}"
        }), 500

@academics_bp.route('/curriculum-units/<int:unit_id>', methods=['PUT'])
@jwt_required()
@teacher_required
def update_curriculum_unit(unit_id):
    """Update a curriculum unit."""
    try:
        data = curriculum_unit_update_schema.load(request.json)
        
        unit, error = CurriculumService.update_curriculum_unit(unit_id, data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Curriculum unit updated successfully',
            'unit': curriculum_unit_schema.dump(unit)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400
    except Exception as e:
        logger.error(f"Error updating curriculum unit {unit_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to update curriculum unit: {str(e)}"
        }), 500

@academics_bp.route('/curriculum-units/<int:unit_id>', methods=['DELETE'])
@jwt_required()
@teacher_required
def delete_curriculum_unit(unit_id):
    """Delete a curriculum unit."""
    try:
        success, error = CurriculumService.delete_curriculum_unit(unit_id)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Curriculum unit deleted successfully'
        }), 200
    except Exception as e:
        logger.error(f"Error deleting curriculum unit {unit_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to delete curriculum unit: {str(e)}"
        }), 500
