from app import create_app
from app.extensions import db
from app.models.stem_curriculum import (
    STEMSubject, STEMLearningModule, STEMProject, STEMAssessment, STEMResourceCenter,
    STEMDomain, LearningApproach
)
from app.models.subject import Subject
from app.models.educational_level import EducationalLevel, KeyPhase
from app.models.user import User
from datetime import datetime

def create_stem_subjects():
    """Create STEM-enhanced subjects for Ghana's curriculum"""
    
    # STEM subjects mapping
    stem_subjects_data = [
        # Mathematics
        {
            'subject_name': 'Mathematics',
            'stem_domain': STEMDomain.MATHEMATICS,
            'requires_lab': False,
            'requires_technology': True,
            'practical_component_percentage': 40.0,
            'theory_component_percentage': 60.0,
            'critical_thinking_weight': 30.0,
            'creativity_weight': 20.0,
            'collaboration_weight': 20.0,
            'communication_weight': 30.0
        },
        # Integrated Science
        {
            'subject_name': 'Integrated Science',
            'stem_domain': STEMDomain.SCIENCE,
            'requires_lab': True,
            'requires_technology': True,
            'practical_component_percentage': 50.0,
            'theory_component_percentage': 50.0,
            'critical_thinking_weight': 25.0,
            'creativity_weight': 25.0,
            'collaboration_weight': 25.0,
            'communication_weight': 25.0
        },
        # Computing
        {
            'subject_name': 'Computing',
            'stem_domain': STEMDomain.TECHNOLOGY,
            'requires_lab': True,
            'requires_technology': True,
            'practical_component_percentage': 70.0,
            'theory_component_percentage': 30.0,
            'critical_thinking_weight': 30.0,
            'creativity_weight': 30.0,
            'collaboration_weight': 20.0,
            'communication_weight': 20.0
        },
        # Career Technology (Engineering focus)
        {
            'subject_name': 'Career Technology',
            'stem_domain': STEMDomain.ENGINEERING,
            'requires_lab': True,
            'requires_technology': True,
            'practical_component_percentage': 60.0,
            'theory_component_percentage': 40.0,
            'critical_thinking_weight': 25.0,
            'creativity_weight': 30.0,
            'collaboration_weight': 25.0,
            'communication_weight': 20.0
        },
        # Physics (SHS)
        {
            'subject_name': 'Physics',
            'stem_domain': STEMDomain.SCIENCE,
            'requires_lab': True,
            'requires_technology': True,
            'practical_component_percentage': 45.0,
            'theory_component_percentage': 55.0,
            'critical_thinking_weight': 30.0,
            'creativity_weight': 20.0,
            'collaboration_weight': 25.0,
            'communication_weight': 25.0
        },
        # Chemistry (SHS)
        {
            'subject_name': 'Chemistry',
            'stem_domain': STEMDomain.SCIENCE,
            'requires_lab': True,
            'requires_technology': True,
            'practical_component_percentage': 45.0,
            'theory_component_percentage': 55.0,
            'critical_thinking_weight': 25.0,
            'creativity_weight': 25.0,
            'collaboration_weight': 25.0,
            'communication_weight': 25.0
        },
        # Biology (SHS)
        {
            'subject_name': 'Biology',
            'stem_domain': STEMDomain.SCIENCE,
            'requires_lab': True,
            'requires_technology': True,
            'practical_component_percentage': 40.0,
            'theory_component_percentage': 60.0,
            'critical_thinking_weight': 25.0,
            'creativity_weight': 25.0,
            'collaboration_weight': 25.0,
            'communication_weight': 25.0
        },
        # Computer Science (SHS)
        {
            'subject_name': 'Computer Science',
            'stem_domain': STEMDomain.TECHNOLOGY,
            'requires_lab': True,
            'requires_technology': True,
            'practical_component_percentage': 75.0,
            'theory_component_percentage': 25.0,
            'critical_thinking_weight': 30.0,
            'creativity_weight': 30.0,
            'collaboration_weight': 20.0,
            'communication_weight': 20.0
        }
    ]
    
    created_count = 0
    for stem_data in stem_subjects_data:
        # Find the corresponding subject
        subject = Subject.query.filter_by(name=stem_data['subject_name']).first()
        if not subject:
            print(f"Subject '{stem_data['subject_name']}' not found. Skipping...")
            continue
        
        # Check if STEM profile already exists
        existing_stem = STEMSubject.query.filter_by(subject_id=subject.id).first()
        if existing_stem:
            print(f"STEM profile for '{stem_data['subject_name']}' already exists. Skipping...")
            continue
        
        # Create STEM subject profile
        stem_subject = STEMSubject(
            subject_id=subject.id,
            stem_domain=stem_data['stem_domain'],
            requires_lab=stem_data['requires_lab'],
            requires_technology=stem_data['requires_technology'],
            practical_component_percentage=stem_data['practical_component_percentage'],
            theory_component_percentage=stem_data['theory_component_percentage'],
            critical_thinking_weight=stem_data['critical_thinking_weight'],
            creativity_weight=stem_data['creativity_weight'],
            collaboration_weight=stem_data['collaboration_weight'],
            communication_weight=stem_data['communication_weight']
        )
        
        db.session.add(stem_subject)
        created_count += 1
        print(f"Created STEM profile for: {stem_data['subject_name']}")
    
    db.session.commit()
    print(f"\nCreated {created_count} STEM subject profiles.")

def create_stem_learning_modules():
    """Create sample STEM learning modules"""
    
    # Get admin user for creator
    admin_user = User.query.filter_by(email='admin@admipaedia.com').first()
    if not admin_user:
        print("Admin user not found. Please create an admin user first.")
        return
    
    # Sample learning modules
    modules_data = [
        {
            'stem_subject_name': 'Mathematics',
            'educational_level_code': 'B5',
            'title': 'Problem-Solving with Real-World Data',
            'description': 'Students collect and analyze real-world data to solve mathematical problems',
            'learning_objectives': [
                'Collect and organize data from real-world sources',
                'Apply statistical concepts to analyze data',
                'Present findings using graphs and charts',
                'Make predictions based on data trends'
            ],
            'primary_approach': LearningApproach.PROBLEM_SOLVING,
            'secondary_approaches': [LearningApproach.HANDS_ON.value, LearningApproach.COLLABORATIVE.value],
            'duration_weeks': 4,
            'sequence_order': 1,
            'term': 'Term 1',
            'required_materials': ['Calculators', 'Graph paper', 'Data collection sheets', 'Computers/tablets'],
            'technology_requirements': ['Spreadsheet software', 'Graphing tools']
        },
        {
            'stem_subject_name': 'Integrated Science',
            'educational_level_code': 'JHS2',
            'title': 'Water Quality Investigation Project',
            'description': 'Students investigate local water sources and test water quality using scientific methods',
            'learning_objectives': [
                'Understand water quality parameters',
                'Use scientific instruments for testing',
                'Apply scientific method to investigation',
                'Propose solutions for water quality issues'
            ],
            'primary_approach': LearningApproach.INQUIRY_BASED,
            'secondary_approaches': [LearningApproach.PROJECT_BASED.value, LearningApproach.HANDS_ON.value],
            'duration_weeks': 6,
            'sequence_order': 2,
            'term': 'Term 2',
            'required_materials': ['Water testing kits', 'pH meters', 'Sample containers', 'Microscopes'],
            'technology_requirements': ['Digital cameras', 'Data logging software'],
            'safety_considerations': 'Proper handling of water samples, use of protective equipment'
        },
        {
            'stem_subject_name': 'Computing',
            'educational_level_code': 'JHS3',
            'title': 'Mobile App Development for Community Solutions',
            'description': 'Students design and develop simple mobile applications to address community challenges',
            'learning_objectives': [
                'Identify community problems suitable for digital solutions',
                'Learn basic app development concepts',
                'Design user-friendly interfaces',
                'Test and iterate on app prototypes'
            ],
            'primary_approach': LearningApproach.PROJECT_BASED,
            'secondary_approaches': [LearningApproach.DESIGN_THINKING.value, LearningApproach.COLLABORATIVE.value],
            'duration_weeks': 8,
            'sequence_order': 1,
            'term': 'Term 3',
            'required_materials': ['Computers/tablets', 'Design software', 'Testing devices'],
            'technology_requirements': ['App development platform', 'Design tools', 'Testing environment']
        },
        {
            'stem_subject_name': 'Career Technology',
            'educational_level_code': 'JHS1',
            'title': 'Sustainable Energy Solutions Design Challenge',
            'description': 'Students design and build models of sustainable energy systems for their school',
            'learning_objectives': [
                'Understand renewable energy principles',
                'Apply engineering design process',
                'Build and test energy system prototypes',
                'Evaluate environmental and economic impacts'
            ],
            'primary_approach': LearningApproach.DESIGN_THINKING,
            'secondary_approaches': [LearningApproach.PROJECT_BASED.value, LearningApproach.HANDS_ON.value],
            'duration_weeks': 10,
            'sequence_order': 1,
            'term': 'Term 1',
            'required_materials': ['Solar panels', 'Batteries', 'LED lights', 'Construction materials', 'Multimeters'],
            'technology_requirements': ['Design software', 'Measurement tools'],
            'safety_considerations': 'Electrical safety protocols, proper tool usage'
        }
    ]
    
    created_count = 0
    for module_data in modules_data:
        # Find STEM subject
        subject = Subject.query.filter_by(name=module_data['stem_subject_name']).first()
        if not subject:
            print(f"Subject '{module_data['stem_subject_name']}' not found. Skipping...")
            continue
        
        stem_subject = STEMSubject.query.filter_by(subject_id=subject.id).first()
        if not stem_subject:
            print(f"STEM profile for '{module_data['stem_subject_name']}' not found. Skipping...")
            continue
        
        # Find educational level
        educational_level = EducationalLevel.query.filter_by(level_code=module_data['educational_level_code']).first()
        if not educational_level:
            print(f"Educational level '{module_data['educational_level_code']}' not found. Skipping...")
            continue
        
        # Check if module already exists
        existing_module = STEMLearningModule.query.filter_by(
            stem_subject_id=stem_subject.id,
            educational_level_id=educational_level.id,
            title=module_data['title']
        ).first()
        if existing_module:
            print(f"Module '{module_data['title']}' already exists. Skipping...")
            continue
        
        # Create learning module
        learning_module = STEMLearningModule(
            stem_subject_id=stem_subject.id,
            educational_level_id=educational_level.id,
            title=module_data['title'],
            description=module_data['description'],
            learning_objectives=module_data['learning_objectives'],
            primary_approach=module_data['primary_approach'],
            secondary_approaches=module_data['secondary_approaches'],
            duration_weeks=module_data['duration_weeks'],
            sequence_order=module_data['sequence_order'],
            term=module_data['term'],
            required_materials=module_data['required_materials'],
            technology_requirements=module_data['technology_requirements'],
            safety_considerations=module_data.get('safety_considerations'),
            created_by=admin_user.id
        )
        
        db.session.add(learning_module)
        created_count += 1
        print(f"Created STEM learning module: {module_data['title']}")
    
    db.session.commit()
    print(f"\nCreated {created_count} STEM learning modules.")

def create_stem_resources():
    """Create sample STEM resources"""
    
    # Get admin user for creator
    admin_user = User.query.filter_by(email='admin@admipaedia.com').first()
    if not admin_user:
        print("Admin user not found. Please create an admin user first.")
        return
    
    # Sample STEM resources
    resources_data = [
        {
            'name': 'Science Laboratory Kit',
            'description': 'Complete laboratory kit for basic science experiments',
            'resource_type': 'Equipment',
            'stem_domains': [STEMDomain.SCIENCE.value],
            'educational_levels': ['B4', 'B5', 'B6', 'JHS1', 'JHS2', 'JHS3'],
            'total_quantity': 10,
            'available_quantity': 10,
            'location': 'Science Laboratory',
            'usage_instructions': 'Follow laboratory safety protocols. Clean equipment after use.',
            'safety_guidelines': 'Wear safety goggles and gloves. Handle chemicals with care.'
        },
        {
            'name': 'Robotics Construction Set',
            'description': 'Programmable robotics kit for STEM projects',
            'resource_type': 'Equipment',
            'stem_domains': [STEMDomain.TECHNOLOGY.value, STEMDomain.ENGINEERING.value],
            'educational_levels': ['JHS1', 'JHS2', 'JHS3', 'SHS1', 'SHS2', 'SHS3'],
            'total_quantity': 5,
            'available_quantity': 5,
            'location': 'Technology Lab',
            'usage_instructions': 'Charge batteries before use. Follow programming guidelines.',
            'safety_guidelines': 'Handle electronic components carefully. Avoid water contact.'
        },
        {
            'name': 'Mathematical Modeling Software',
            'description': 'Software for mathematical modeling and visualization',
            'resource_type': 'Software',
            'stem_domains': [STEMDomain.MATHEMATICS.value],
            'educational_levels': ['B5', 'B6', 'JHS1', 'JHS2', 'JHS3', 'SHS1', 'SHS2', 'SHS3'],
            'total_quantity': 30,
            'available_quantity': 30,
            'location': 'Computer Lab',
            'external_url': 'https://mathsoftware.edu',
            'access_requirements': ['Computer access', 'Internet connection']
        },
        {
            'name': 'Solar Energy Demonstration Kit',
            'description': 'Kit for demonstrating solar energy principles',
            'resource_type': 'Equipment',
            'stem_domains': [STEMDomain.SCIENCE.value, STEMDomain.ENGINEERING.value],
            'educational_levels': ['JHS1', 'JHS2', 'JHS3', 'SHS1', 'SHS2'],
            'total_quantity': 3,
            'available_quantity': 3,
            'location': 'Physics Laboratory',
            'usage_instructions': 'Use in well-lit areas. Handle solar panels carefully.',
            'safety_guidelines': 'Avoid direct eye contact with bright lights. Handle electrical components safely.'
        },
        {
            'name': 'Digital Microscopes',
            'description': 'High-resolution digital microscopes for biological studies',
            'resource_type': 'Equipment',
            'stem_domains': [STEMDomain.SCIENCE.value, STEMDomain.TECHNOLOGY.value],
            'educational_levels': ['B4', 'B5', 'B6', 'JHS1', 'JHS2', 'JHS3', 'SHS1', 'SHS2', 'SHS3'],
            'total_quantity': 8,
            'available_quantity': 8,
            'location': 'Biology Laboratory',
            'usage_instructions': 'Handle with care. Clean lenses after use. Store in protective cases.',
            'safety_guidelines': 'Handle glass slides carefully. Use proper lighting to avoid eye strain.'
        }
    ]
    
    created_count = 0
    for resource_data in resources_data:
        # Check if resource already exists
        existing_resource = STEMResourceCenter.query.filter_by(name=resource_data['name']).first()
        if existing_resource:
            print(f"Resource '{resource_data['name']}' already exists. Skipping...")
            continue
        
        # Create STEM resource
        resource = STEMResourceCenter(
            name=resource_data['name'],
            description=resource_data['description'],
            resource_type=resource_data['resource_type'],
            stem_domains=resource_data['stem_domains'],
            educational_levels=resource_data['educational_levels'],
            total_quantity=resource_data['total_quantity'],
            available_quantity=resource_data['available_quantity'],
            location=resource_data['location'],
            usage_instructions=resource_data.get('usage_instructions'),
            safety_guidelines=resource_data.get('safety_guidelines'),
            external_url=resource_data.get('external_url'),
            access_requirements=resource_data.get('access_requirements'),
            created_by=admin_user.id
        )
        
        db.session.add(resource)
        created_count += 1
        print(f"Created STEM resource: {resource_data['name']}")
    
    db.session.commit()
    print(f"\nCreated {created_count} STEM resources.")

def main():
    """Main function to create STEM curriculum data"""
    app = create_app()
    
    with app.app_context():
        print("Creating STEM curriculum framework...")
        print("=" * 50)
        
        try:
            # Create STEM subjects
            print("\n1. Creating STEM subject profiles...")
            create_stem_subjects()
            
            # Create STEM learning modules
            print("\n2. Creating STEM learning modules...")
            create_stem_learning_modules()
            
            # Create STEM resources
            print("\n3. Creating STEM resources...")
            create_stem_resources()
            
            print("\n" + "=" * 50)
            print("STEM curriculum framework created successfully!")
            print("\nNext steps:")
            print("1. Create STEM projects for each learning module")
            print("2. Set up STEM assessments and rubrics")
            print("3. Configure resource booking system")
            print("4. Train teachers on STEM methodologies")
            
        except Exception as e:
            print(f"Error creating STEM curriculum: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    main()