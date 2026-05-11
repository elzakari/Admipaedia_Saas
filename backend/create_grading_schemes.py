from app.extensions import db
from app.models.grading_system import GradingScheme, GradeBoundary, GradingStandard
from app.models.educational_level import EducationalLevel
from app import create_app

def create_ghana_grading_schemes():
    """Create Ghana Educational Service standard grading schemes"""
    
    # BECE Grading Scheme (1-9 scale)
    bece_scheme = GradingScheme(
        name="BECE Grading System",
        standard=GradingStandard.BECE,
        description="Basic Education Certificate Examination grading system (1-9 scale)",
        is_active=True,
        is_default=False,
        class_score_weight=40.0,
        external_exam_weight=60.0
    )
    
    # BECE Grade Boundaries
    bece_boundaries = [
        {"grade_symbol": "1", "grade_name": "Excellent", "min_score": 80, "max_score": 100, "is_passing": True, "grade_points": 9.0, "sequence_order": 1, "color_code": "#10B981"},
        {"grade_symbol": "2", "grade_name": "Very Good", "min_score": 70, "max_score": 79, "is_passing": True, "grade_points": 8.0, "sequence_order": 2, "color_code": "#059669"},
        {"grade_symbol": "3", "grade_name": "Good", "min_score": 65, "max_score": 69, "is_passing": True, "grade_points": 7.0, "sequence_order": 3, "color_code": "#3B82F6"},
        {"grade_symbol": "4", "grade_name": "Credit", "min_score": 60, "max_score": 64, "is_passing": True, "grade_points": 6.0, "sequence_order": 4, "color_code": "#2563EB"},
        {"grade_symbol": "5", "grade_name": "Pass", "min_score": 55, "max_score": 59, "is_passing": True, "grade_points": 5.0, "sequence_order": 5, "color_code": "#F59E0B"},
        {"grade_symbol": "6", "grade_name": "Pass", "min_score": 50, "max_score": 54, "is_passing": True, "grade_points": 4.0, "sequence_order": 6, "color_code": "#D97706"},
        {"grade_symbol": "7", "grade_name": "Fail", "min_score": 40, "max_score": 49, "is_passing": False, "grade_points": 3.0, "sequence_order": 7, "color_code": "#EF4444"},
        {"grade_symbol": "8", "grade_name": "Fail", "min_score": 30, "max_score": 39, "is_passing": False, "grade_points": 2.0, "sequence_order": 8, "color_code": "#DC2626"},
        {"grade_symbol": "9", "grade_name": "Fail", "min_score": 0, "max_score": 29, "is_passing": False, "grade_points": 1.0, "sequence_order": 9, "color_code": "#B91C1C"}
    ]
    
    # WASSCE Grading Scheme (A1-F9 scale)
    wassce_scheme = GradingScheme(
        name="WASSCE Grading System",
        standard=GradingStandard.WASSCE,
        description="West African Senior School Certificate Examination grading system (A1-F9 scale)",
        is_active=True,
        is_default=False,
        class_score_weight=40.0,
        external_exam_weight=60.0
    )
    
    # WASSCE Grade Boundaries
    wassce_boundaries = [
        {"grade_symbol": "A1", "grade_name": "Excellent", "min_score": 80, "max_score": 100, "is_passing": True, "grade_points": 9.0, "sequence_order": 1, "color_code": "#10B981"},
        {"grade_symbol": "B2", "grade_name": "Very Good", "min_score": 70, "max_score": 79, "is_passing": True, "grade_points": 8.0, "sequence_order": 2, "color_code": "#059669"},
        {"grade_symbol": "B3", "grade_name": "Good", "min_score": 65, "max_score": 69, "is_passing": True, "grade_points": 7.0, "sequence_order": 3, "color_code": "#3B82F6"},
        {"grade_symbol": "C4", "grade_name": "Credit", "min_score": 60, "max_score": 64, "is_passing": True, "grade_points": 6.0, "sequence_order": 4, "color_code": "#2563EB"},
        {"grade_symbol": "C5", "grade_name": "Credit", "min_score": 55, "max_score": 59, "is_passing": True, "grade_points": 5.0, "sequence_order": 5, "color_code": "#8B5CF6"},
        {"grade_symbol": "C6", "grade_name": "Credit", "min_score": 50, "max_score": 54, "is_passing": True, "grade_points": 4.0, "sequence_order": 6, "color_code": "#F59E0B"},
        {"grade_symbol": "D7", "grade_name": "Pass", "min_score": 45, "max_score": 49, "is_passing": True, "grade_points": 3.0, "sequence_order": 7, "color_code": "#D97706"},
        {"grade_symbol": "E8", "grade_name": "Pass", "min_score": 40, "max_score": 44, "is_passing": True, "grade_points": 2.0, "sequence_order": 8, "color_code": "#F97316"},
        {"grade_symbol": "F9", "grade_name": "Fail", "min_score": 0, "max_score": 39, "is_passing": False, "grade_points": 1.0, "sequence_order": 9, "color_code": "#EF4444"}
    ]
    
    # Continuous Assessment Grading Scheme (for internal use)
    continuous_scheme = GradingScheme(
        name="Continuous Assessment System",
        standard=GradingStandard.CONTINUOUS_ASSESSMENT,
        description="School-based continuous assessment grading system",
        is_active=True,
        is_default=True,
        class_score_weight=100.0,
        external_exam_weight=0.0
    )
    
    # Continuous Assessment Grade Boundaries
    continuous_boundaries = [
        {"grade_symbol": "A", "grade_name": "Excellent", "min_score": 80, "max_score": 100, "is_passing": True, "grade_points": 4.0, "sequence_order": 1, "color_code": "#10B981"},
        {"grade_symbol": "B", "grade_name": "Very Good", "min_score": 70, "max_score": 79, "is_passing": True, "grade_points": 3.0, "sequence_order": 2, "color_code": "#3B82F6"},
        {"grade_symbol": "C", "grade_name": "Good", "min_score": 60, "max_score": 69, "is_passing": True, "grade_points": 2.0, "sequence_order": 3, "color_code": "#F59E0B"},
        {"grade_symbol": "D", "grade_name": "Pass", "min_score": 50, "max_score": 59, "is_passing": True, "grade_points": 1.0, "sequence_order": 4, "color_code": "#F97316"},
        {"grade_symbol": "E", "grade_name": "Fail", "min_score": 0, "max_score": 49, "is_passing": False, "grade_points": 0.0, "sequence_order": 5, "color_code": "#EF4444"}
    ]
    
    try:
        # Add schemes to database
        db.session.add(bece_scheme)
        db.session.add(wassce_scheme)
        db.session.add(continuous_scheme)
        db.session.flush()  # Get IDs
        
        # Add BECE boundaries
        for boundary_data in bece_boundaries:
            boundary = GradeBoundary(
                grading_scheme_id=bece_scheme.id,
                **boundary_data
            )
            db.session.add(boundary)
        
        # Add WASSCE boundaries
        for boundary_data in wassce_boundaries:
            boundary = GradeBoundary(
                grading_scheme_id=wassce_scheme.id,
                **boundary_data
            )
            db.session.add(boundary)
        
        # Add Continuous Assessment boundaries
        for boundary_data in continuous_boundaries:
            boundary = GradeBoundary(
                grading_scheme_id=continuous_scheme.id,
                **boundary_data
            )
            db.session.add(boundary)
        
        # Link schemes to appropriate educational levels
        jhs_levels = EducationalLevel.query.filter(
            EducationalLevel.key_phase == 'key_phase_4'
        ).all()
        
        shs_levels = EducationalLevel.query.filter(
            EducationalLevel.key_phase == 'key_phase_5'
        ).all()
        
        # Assign BECE to JHS3
        jhs3_level = next((level for level in jhs_levels if level.level_code == 'JHS3'), None)
        if jhs3_level:
            bece_scheme.educational_level_id = jhs3_level.id
        
        # Assign WASSCE to SHS3
        shs3_level = next((level for level in shs_levels if level.level_code == 'SHS3'), None)
        if shs3_level:
            wassce_scheme.educational_level_id = shs3_level.id
        
        db.session.commit()
        print("Ghana grading schemes created successfully!")
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating grading schemes: {str(e)}")
        raise

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        create_ghana_grading_schemes()
