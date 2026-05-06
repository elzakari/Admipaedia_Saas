from app import create_app
from app.extensions import db
from app.models.assessment_methods import (
    AssessmentFramework, AssessmentType, AssessmentMode, 
    DifferentiationStrategy, AssessmentTask, AssessmentRubric
)
from app.models.educational_level import EducationalLevel
from app.models.subject import Subject

def create_default_assessment_frameworks():
    """Create default assessment frameworks for Ghana's educational system"""
    
    # Get educational levels
    kg_level = EducationalLevel.query.filter_by(name="Kindergarten").first()
    primary_level = EducationalLevel.query.filter_by(name="Primary").first()
    jhs_level = EducationalLevel.query.filter_by(name="Junior High School").first()
    shs_level = EducationalLevel.query.filter_by(name="Senior High School").first()
    
    # Get core subjects
    english = Subject.query.filter_by(name="English Language").first()
    mathematics = Subject.query.filter_by(name="Mathematics").first()
    science = Subject.query.filter_by(name="Integrated Science").first()
    
    frameworks_data = [
        # Kindergarten Assessment Framework
        {
            "name": "Kindergarten Holistic Assessment",
            "description": "Play-based and observation-focused assessment for early learners",
            "educational_level_id": kg_level.id if kg_level else None,
            "subject_id": english.id if english else None,
            "formative_weight": 60.0,  # Heavy emphasis on formative assessment
            "summative_weight": 20.0,
            "school_based_weight": 15.0,
            "project_weight": 5.0,
            "formative_frequency": "daily",
            "summative_frequency": "termly",
            "curriculum_standards": {
                "communication": ["listening", "speaking", "early_reading"],
                "cognitive": ["problem_solving", "critical_thinking"],
                "social": ["cooperation", "sharing", "empathy"],
                "physical": ["fine_motor", "gross_motor"]
            },
            "competency_indicators": [
                "Communicates needs and ideas clearly",
                "Shows curiosity and asks questions",
                "Plays cooperatively with others",
                "Demonstrates self-control"
            ]
        },
        
        # Primary School Assessment Framework
        {
            "name": "Primary Mathematics Assessment",
            "description": "Comprehensive mathematics assessment aligned with Standards-Based Curriculum",
            "educational_level_id": primary_level.id if primary_level else None,
            "subject_id": mathematics.id if mathematics else None,
            "formative_weight": 40.0,
            "summative_weight": 35.0,
            "school_based_weight": 20.0,
            "project_weight": 5.0,
            "formative_frequency": "weekly",
            "summative_frequency": "termly",
            "curriculum_standards": {
                "number_operations": ["counting", "addition", "subtraction", "multiplication", "division"],
                "measurement": ["length", "weight", "capacity", "time", "money"],
                "geometry": ["shapes", "patterns", "spatial_relationships"],
                "data_handling": ["collection", "organization", "interpretation"]
            },
            "competency_indicators": [
                "Solves mathematical problems using appropriate strategies",
                "Explains mathematical reasoning clearly",
                "Applies mathematics to real-life situations",
                "Works collaboratively on mathematical tasks"
            ]
        },
        
        # JHS Assessment Framework (BECE Preparation)
        {
            "name": "JHS English Language Assessment (BECE Aligned)",
            "description": "Assessment framework preparing students for BECE with continuous assessment",
            "educational_level_id": jhs_level.id if jhs_level else None,
            "subject_id": english.id if english else None,
            "formative_weight": 30.0,
            "summative_weight": 30.0,
            "school_based_weight": 40.0,  # Higher SBA weight for BECE
            "project_weight": 0.0,
            "formative_frequency": "bi-weekly",
            "summative_frequency": "termly",
            "curriculum_standards": {
                "listening_speaking": ["oral_communication", "presentation", "discussion"],
                "reading": ["comprehension", "vocabulary", "critical_analysis"],
                "writing": ["composition", "grammar", "creative_writing"],
                "literature": ["poetry", "prose", "drama"]
            },
            "competency_indicators": [
                "Communicates effectively in various contexts",
                "Demonstrates critical thinking through language use",
                "Creates original written and oral texts",
                "Collaborates effectively in group discussions"
            ]
        },
        
        # SHS Assessment Framework (WASSCE Preparation)
        {
            "name": "SHS Integrated Science Assessment (WASSCE Aligned)",
            "description": "Comprehensive science assessment preparing for WASSCE with practical emphasis",
            "educational_level_id": shs_level.id if shs_level else None,
            "subject_id": science.id if science else None,
            "formative_weight": 25.0,
            "summative_weight": 45.0,
            "school_based_weight": 20.0,
            "project_weight": 10.0,
            "formative_frequency": "weekly",
            "summative_frequency": "termly",
            "curriculum_standards": {
                "biology": ["cell_biology", "genetics", "ecology", "human_biology"],
                "chemistry": ["atomic_structure", "chemical_bonding", "reactions", "organic_chemistry"],
                "physics": ["mechanics", "electricity", "waves", "modern_physics"],
                "practical_skills": ["observation", "measurement", "analysis", "conclusion"]
            },
            "competency_indicators": [
                "Applies scientific methods to investigate phenomena",
                "Demonstrates critical thinking in scientific contexts",
                "Communicates scientific ideas effectively",
                "Collaborates in scientific investigations"
            ]
        }
    ]
    
    for framework_data in frameworks_data:
        # Check if framework already exists
        existing = AssessmentFramework.query.filter_by(
            name=framework_data["name"]
        ).first()
        
        if not existing:
            framework = AssessmentFramework(**framework_data)
            db.session.add(framework)
            print(f"Created assessment framework: {framework_data['name']}")
    
    db.session.commit()
    print("Assessment frameworks created successfully!")

def create_sample_assessment_tasks():
    """Create sample assessment tasks demonstrating different types and differentiation"""
    
    # Get a framework to attach tasks to
    primary_math_framework = AssessmentFramework.query.filter_by(
        name="Primary Mathematics Assessment"
    ).first()
    
    if not primary_math_framework:
        print("Primary Mathematics Assessment framework not found")
        return
    
    sample_tasks = [
        {
            "title": "Weekly Math Problem Solving",
            "description": "Formative assessment focusing on problem-solving strategies",
            "framework_id": primary_math_framework.id,
            "assessment_type": AssessmentType.FORMATIVE,
            "assessment_mode": AssessmentMode.WRITTEN,
            "duration_minutes": 30,
            "is_differentiated": True,
            "differentiation_strategies": [
                DifferentiationStrategy.CONTENT.value,
                DifferentiationStrategy.PROCESS.value
            ],
            "total_marks": 20,
            "pass_mark": 12,
            "learning_objectives": [
                "Apply problem-solving strategies to mathematical problems",
                "Explain mathematical reasoning",
                "Work systematically through multi-step problems"
            ],
            "competency_indicators": [
                "Critical thinking and problem solving",
                "Communication and collaboration"
            ],
            "instructions": "Solve the given problems showing all working. Choose the method that works best for you.",
            "materials_needed": ["calculator", "ruler", "graph_paper"],
            "accessibility_features": [
                "Large print version available",
                "Extra time for students with learning difficulties",
                "Visual aids and manipulatives provided"
            ]
        },
        
        {
            "title": "Mathematics Portfolio Project",
            "description": "Project-based assessment allowing students to demonstrate learning through a portfolio",
            "framework_id": primary_math_framework.id,
            "assessment_type": AssessmentType.PORTFOLIO,
            "assessment_mode": AssessmentMode.PORTFOLIO_REVIEW,
            "duration_minutes": 0,  # Extended project
            "is_differentiated": True,
            "differentiation_strategies": [
                DifferentiationStrategy.PRODUCT.value,
                DifferentiationStrategy.INTEREST.value
            ],
            "total_marks": 50,
            "pass_mark": 30,
            "learning_objectives": [
                "Demonstrate mathematical understanding through various formats",
                "Reflect on mathematical learning journey",
                "Connect mathematics to real-world applications"
            ],
            "competency_indicators": [
                "Creativity and innovation",
                "Critical thinking and problem solving",
                "Communication and collaboration"
            ],
            "instructions": "Create a portfolio showcasing your mathematical learning. Include problems you've solved, explanations of concepts, and real-world applications.",
            "materials_needed": ["portfolio_folder", "art_supplies", "digital_tools"],
            "accessibility_features": [
                "Multiple format options (digital, physical, multimedia)",
                "Peer support partnerships",
                "Flexible timeline with checkpoints"
            ]
        }
    ]
    
    for task_data in sample_tasks:
        existing = AssessmentTask.query.filter_by(
            title=task_data["title"],
            framework_id=task_data["framework_id"]
        ).first()
        
        if not existing:
            task = AssessmentTask(**task_data)
            db.session.add(task)
            print(f"Created assessment task: {task_data['title']}")
    
    db.session.commit()
    print("Sample assessment tasks created successfully!")

def create_sample_rubrics():
    """Create sample rubrics for assessment tasks"""
    
    # Get the problem-solving task
    problem_solving_task = AssessmentTask.query.filter_by(
        title="Weekly Math Problem Solving"
    ).first()
    
    if not problem_solving_task:
        print("Problem solving task not found")
        return
    
    rubric_criteria = [
        {
            "task_id": problem_solving_task.id,
            "criterion_name": "Mathematical Understanding",
            "description": "Demonstrates understanding of mathematical concepts and procedures",
            "excellent_descriptor": "Shows complete understanding of mathematical concepts. Uses appropriate mathematical language and notation consistently.",
            "proficient_descriptor": "Shows substantial understanding of mathematical concepts. Uses mathematical language appropriately most of the time.",
            "developing_descriptor": "Shows partial understanding of mathematical concepts. Uses some mathematical language correctly.",
            "beginning_descriptor": "Shows limited understanding of mathematical concepts. Rarely uses mathematical language correctly.",
            "weight_percentage": 40.0
        },
        
        {
            "task_id": problem_solving_task.id,
            "criterion_name": "Problem-Solving Strategy",
            "description": "Selects and applies appropriate problem-solving strategies",
            "excellent_descriptor": "Consistently selects efficient and sophisticated strategies. Adapts strategies when needed.",
            "proficient_descriptor": "Usually selects appropriate strategies. Shows some flexibility in approach.",
            "developing_descriptor": "Sometimes selects appropriate strategies. Limited flexibility in approach.",
            "beginning_descriptor": "Rarely selects appropriate strategies. Shows little strategic thinking.",
            "weight_percentage": 30.0
        },
        
        {
            "task_id": problem_solving_task.id,
            "criterion_name": "Communication",
            "description": "Explains mathematical reasoning clearly and completely",
            "excellent_descriptor": "Explanations are clear, complete, and easy to follow. Uses multiple representations effectively.",
            "proficient_descriptor": "Explanations are mostly clear and complete. Uses some representations effectively.",
            "developing_descriptor": "Explanations are partially clear. Uses limited representations.",
            "beginning_descriptor": "Explanations are unclear or incomplete. Rarely uses representations.",
            "weight_percentage": 20.0
        },
        
        {
            "task_id": problem_solving_task.id,
            "criterion_name": "Accuracy",
            "description": "Computational accuracy and correct final answers",
            "excellent_descriptor": "All computations are accurate. Final answers are correct.",
            "proficient_descriptor": "Most computations are accurate. Minor computational errors may be present.",
            "developing_descriptor": "Some computations are accurate. Several computational errors present.",
            "beginning_descriptor": "Few computations are accurate. Many computational errors present.",
            "weight_percentage": 10.0
        }
    ]
    
    for rubric_data in rubric_criteria:
        existing = AssessmentRubric.query.filter_by(
            task_id=rubric_data["task_id"],
            criterion_name=rubric_data["criterion_name"]
        ).first()
        
        if not existing:
            rubric = AssessmentRubric(**rubric_data)
            db.session.add(rubric)
            print(f"Created rubric criterion: {rubric_data['criterion_name']}")
    
    db.session.commit()
    print("Sample rubrics created successfully!")

def main():
    """Main function to create all assessment method components"""
    app = create_app()
    
    with app.app_context():
        print("Creating assessment methods for Ghana's Standards-Based Curriculum...")
        
        # Create database tables
        db.create_all()
        
        # Create default data
        create_default_assessment_frameworks()
        create_sample_assessment_tasks()
        create_sample_rubrics()
        
        print("\nAssessment methods setup completed successfully!")
        print("\nFeatures implemented:")
        print("✓ Differentiated assessment strategies")
        print("✓ School-Based Assessment (SBA) framework")
        print("✓ Continuous assessment tracking")
        print("✓ Multiple assessment types and modes")
        print("✓ Rubric-based scoring")
        print("✓ Competency-based assessment")
        print("✓ Assessment analytics and insights")
        print("✓ Accessibility and inclusion features")

if __name__ == "__main__":
    main()