from app.extensions import db
from app.models.educational_level import EducationalLevel, KeyPhase, CoreCompetency
from app import create_app

def create_educational_levels():
    """Create default educational levels for Ghana Educational Service Standards-Based Curriculum"""
    
    educational_levels = [
        # Key Phase 1: Pre-school (KG1-KG2)
        {
            'level_code': 'KG1',
            'level_name': 'Kindergarten 1',
            'key_phase': KeyPhase.KEY_PHASE_1,
            'sequence_order': 1,
            'min_age': 4,
            'max_age': 5,
            'is_compulsory': True,
            'requires_entrance_exam': False,
            'curriculum_focus': 'Play-based learning, basic literacy and numeracy',
            'core_subjects': ['English', 'Mathematics', 'Science', 'Creative Arts', 'Physical Education'],
            'assessment_type': 'continuous',
            'external_exam': None
        },
        {
            'level_code': 'KG2',
            'level_name': 'Kindergarten 2',
            'key_phase': KeyPhase.KEY_PHASE_1,
            'sequence_order': 2,
            'min_age': 5,
            'max_age': 6,
            'is_compulsory': True,
            'requires_entrance_exam': False,
            'curriculum_focus': 'Preparation for primary education, enhanced literacy and numeracy',
            'core_subjects': ['English', 'Mathematics', 'Science', 'Creative Arts', 'Physical Education'],
            'assessment_type': 'continuous',
            'external_exam': None
        },
        
        # Key Phase 2: Lower Primary (B1-B3)
        {
            'level_code': 'B1',
            'level_name': 'Basic 1 (Primary 1)',
            'key_phase': KeyPhase.KEY_PHASE_2,
            'sequence_order': 3,
            'min_age': 6,
            'max_age': 7,
            'is_compulsory': True,
            'requires_entrance_exam': False,
            'curriculum_focus': 'Foundation literacy and numeracy, basic science concepts',
            'core_subjects': ['English', 'Mathematics', 'Science', 'Social Studies', 'Creative Arts', 'Physical Education'],
            'assessment_type': 'continuous',
            'external_exam': None
        },
        {
            'level_code': 'B2',
            'level_name': 'Basic 2 (Primary 2)',
            'key_phase': KeyPhase.KEY_PHASE_2,
            'sequence_order': 4,
            'min_age': 7,
            'max_age': 8,
            'is_compulsory': True,
            'requires_entrance_exam': False,
            'curriculum_focus': 'Developing literacy and numeracy skills, environmental awareness',
            'core_subjects': ['English', 'Mathematics', 'Science', 'Social Studies', 'Creative Arts', 'Physical Education'],
            'assessment_type': 'continuous',
            'external_exam': None
        },
        {
            'level_code': 'B3',
            'level_name': 'Basic 3 (Primary 3)',
            'key_phase': KeyPhase.KEY_PHASE_2,
            'sequence_order': 5,
            'min_age': 8,
            'max_age': 9,
            'is_compulsory': True,
            'requires_entrance_exam': False,
            'curriculum_focus': 'Consolidating basic skills, introduction to technology',
            'core_subjects': ['English', 'Mathematics', 'Science', 'Social Studies', 'Creative Arts', 'Physical Education', 'Computing'],
            'assessment_type': 'continuous',
            'external_exam': None
        },
        
        # Key Phase 3: Upper Primary (B4-B6)
        {
            'level_code': 'B4',
            'level_name': 'Basic 4 (Primary 4)',
            'key_phase': KeyPhase.KEY_PHASE_3,
            'sequence_order': 6,
            'min_age': 9,
            'max_age': 10,
            'is_compulsory': True,
            'requires_entrance_exam': False,
            'curriculum_focus': 'Advanced literacy and numeracy, scientific inquiry',
            'core_subjects': ['English', 'Mathematics', 'Science', 'Social Studies', 'Creative Arts', 'Physical Education', 'Computing'],
            'assessment_type': 'continuous',
            'external_exam': None
        },
        {
            'level_code': 'B5',
            'level_name': 'Basic 5 (Primary 5)',
            'key_phase': KeyPhase.KEY_PHASE_3,
            'sequence_order': 7,
            'min_age': 10,
            'max_age': 11,
            'is_compulsory': True,
            'requires_entrance_exam': False,
            'curriculum_focus': 'Critical thinking development, STEM emphasis',
            'core_subjects': ['English', 'Mathematics', 'Science', 'Social Studies', 'Creative Arts', 'Physical Education', 'Computing'],
            'assessment_type': 'continuous',
            'external_exam': None
        },
        {
            'level_code': 'B6',
            'level_name': 'Basic 6 (Primary 6)',
            'key_phase': KeyPhase.KEY_PHASE_3,
            'sequence_order': 8,
            'min_age': 11,
            'max_age': 12,
            'is_compulsory': True,
            'requires_entrance_exam': False,
            'curriculum_focus': 'Preparation for JHS, advanced problem-solving',
            'core_subjects': ['English', 'Mathematics', 'Science', 'Social Studies', 'Creative Arts', 'Physical Education', 'Computing'],
            'assessment_type': 'continuous',
            'external_exam': None
        },
        
        # Key Phase 4: Junior High School (JHS1-JHS3)
        {
            'level_code': 'JHS1',
            'level_name': 'Junior High School 1',
            'key_phase': KeyPhase.KEY_PHASE_4,
            'sequence_order': 9,
            'min_age': 12,
            'max_age': 13,
            'is_compulsory': True,
            'requires_entrance_exam': False,
            'curriculum_focus': 'Common Core Programme, STEM focus, career exploration',
            'core_subjects': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Computing', 'Creative Arts', 'Physical Education', 'Career Technology'],
            'assessment_type': 'mixed',
            'external_exam': None
        },
        {
            'level_code': 'JHS2',
            'level_name': 'Junior High School 2',
            'key_phase': KeyPhase.KEY_PHASE_4,
            'sequence_order': 10,
            'min_age': 13,
            'max_age': 14,
            'is_compulsory': True,
            'requires_entrance_exam': False,
            'curriculum_focus': 'Deepening core competencies, practical skills development',
            'core_subjects': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Computing', 'Creative Arts', 'Physical Education', 'Career Technology'],
            'assessment_type': 'mixed',
            'external_exam': None
        },
        {
            'level_code': 'JHS3',
            'level_name': 'Junior High School 3',
            'key_phase': KeyPhase.KEY_PHASE_4,
            'sequence_order': 11,
            'min_age': 14,
            'max_age': 15,
            'is_compulsory': True,
            'requires_entrance_exam': False,
            'curriculum_focus': 'BECE preparation, transition to SHS',
            'core_subjects': ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Computing', 'Creative Arts', 'Physical Education', 'Career Technology'],
            'assessment_type': 'mixed',
            'external_exam': 'BECE'
        },
        
        # Key Phase 5: Senior High School (SHS1-SHS3)
        {
            'level_code': 'SHS1',
            'level_name': 'Senior High School 1',
            'key_phase': KeyPhase.KEY_PHASE_5,
            'sequence_order': 12,
            'min_age': 15,
            'max_age': 16,
            'is_compulsory': False,
            'requires_entrance_exam': True,
            'curriculum_focus': 'Specialized tracks (Science, Arts, Technical), advanced STEM',
            'core_subjects': ['English Language', 'Mathematics (Core)', 'Integrated Science', 'Social Studies'],
            'assessment_type': 'mixed',
            'external_exam': None
        },
        {
            'level_code': 'SHS2',
            'level_name': 'Senior High School 2',
            'key_phase': KeyPhase.KEY_PHASE_5,
            'sequence_order': 13,
            'min_age': 16,
            'max_age': 17,
            'is_compulsory': False,
            'requires_entrance_exam': False,
            'curriculum_focus': 'Track specialization, research projects',
            'core_subjects': ['English Language', 'Mathematics (Core)', 'Integrated Science', 'Social Studies'],
            'assessment_type': 'mixed',
            'external_exam': None
        },
        {
            'level_code': 'SHS3',
            'level_name': 'Senior High School 3',
            'key_phase': KeyPhase.KEY_PHASE_5,
            'sequence_order': 14,
            'min_age': 17,
            'max_age': 18,
            'is_compulsory': False,
            'requires_entrance_exam': False,
            'curriculum_focus': 'WASSCE preparation, university/career readiness',
            'core_subjects': ['English Language', 'Mathematics (Core)', 'Integrated Science', 'Social Studies'],
            'assessment_type': 'mixed',
            'external_exam': 'WASSCE'
        }
    ]
    
    for level_data in educational_levels:
        existing = EducationalLevel.query.filter_by(level_code=level_data['level_code']).first()
        if not existing:
            level = EducationalLevel(**level_data)
            db.session.add(level)
    
    db.session.commit()
    print(f"Created {len(educational_levels)} educational levels")

def create_core_competencies():
    """Create core competencies for 21st century skills"""
    
    competencies = [
        {
            'name': 'Critical Thinking and Problem Solving',
            'code': 'CTPS',
            'description': 'Ability to analyze information, evaluate evidence, and solve complex problems',
            'category': 'cognitive',
            'applicable_key_phases': ['key_phase_2', 'key_phase_3', 'key_phase_4', 'key_phase_5'],
            'assessment_indicators': [
                'Identifies and analyzes problems',
                'Evaluates information critically',
                'Generates creative solutions',
                'Makes reasoned decisions'
            ]
        },
        {
            'name': 'Creativity and Innovation',
            'code': 'CI',
            'description': 'Ability to think creatively and develop innovative solutions',
            'category': 'cognitive',
            'applicable_key_phases': ['key_phase_1', 'key_phase_2', 'key_phase_3', 'key_phase_4', 'key_phase_5'],
            'assessment_indicators': [
                'Demonstrates original thinking',
                'Develops innovative solutions',
                'Shows artistic creativity',
                'Adapts to new situations'
            ]
        },
        {
            'name': 'Communication and Collaboration',
            'code': 'CC',
            'description': 'Effective communication and teamwork skills',
            'category': 'social',
            'applicable_key_phases': ['key_phase_1', 'key_phase_2', 'key_phase_3', 'key_phase_4', 'key_phase_5'],
            'assessment_indicators': [
                'Communicates clearly and effectively',
                'Listens actively to others',
                'Works effectively in teams',
                'Shows empathy and respect'
            ]
        },
        {
            'name': 'Cultural Identity and Global Citizenship',
            'code': 'CIGC',
            'description': 'Understanding of cultural heritage and global perspectives',
            'category': 'social',
            'applicable_key_phases': ['key_phase_2', 'key_phase_3', 'key_phase_4', 'key_phase_5'],
            'assessment_indicators': [
                'Demonstrates cultural awareness',
                'Shows respect for diversity',
                'Understands global issues',
                'Acts as responsible citizen'
            ]
        },
        {
            'name': 'Personal Development and Leadership',
            'code': 'PDL',
            'description': 'Self-awareness, personal growth, and leadership capabilities',
            'category': 'personal',
            'applicable_key_phases': ['key_phase_2', 'key_phase_3', 'key_phase_4', 'key_phase_5'],
            'assessment_indicators': [
                'Shows self-awareness and reflection',
                'Demonstrates leadership qualities',
                'Takes initiative and responsibility',
                'Shows resilience and perseverance'
            ]
        },
        {
            'name': 'Digital Literacy',
            'code': 'DL',
            'description': 'Competency in using digital technologies effectively and responsibly',
            'category': 'cognitive',
            'applicable_key_phases': ['key_phase_3', 'key_phase_4', 'key_phase_5'],
            'assessment_indicators': [
                'Uses technology effectively',
                'Demonstrates digital citizenship',
                'Creates digital content',
                'Evaluates digital information critically'
            ]
        }
    ]
    
    for comp_data in competencies:
        existing = CoreCompetency.query.filter_by(code=comp_data['code']).first()
        if not existing:
            competency = CoreCompetency(**comp_data)
            db.session.add(competency)
    
    db.session.commit()
    print(f"Created {len(competencies)} core competencies")

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        create_educational_levels()
        create_core_competencies()
        print("Educational levels and core competencies created successfully!")