#!/usr/bin/env python3
from app import create_app
from app.extensions import db
from sqlalchemy import text

def create_continuous_assessment_records_table():
    """Create the missing continuous_assessment_records table"""
    app = create_app()
    with app.app_context():
        try:
            print("=== Creating continuous_assessment_records table ===")
            
            # Create the table with all required columns
            db.session.execute(text("""
                CREATE TABLE continuous_assessment_records (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER NOT NULL REFERENCES students(id),
                    subject_id INTEGER NOT NULL REFERENCES subjects(id),
                    class_id INTEGER NOT NULL REFERENCES classes(id),
                    teacher_id INTEGER NOT NULL REFERENCES teachers(id),
                    
                    -- Assessment period
                    academic_year VARCHAR(20) NOT NULL,
                    term VARCHAR(20) NOT NULL,
                    week_number INTEGER,
                    
                    -- Assessment data
                    assessment_date DATE NOT NULL,
                    assessment_focus VARCHAR(200),
                    
                    -- Scores (aligned with Ghana's continuous assessment model)
                    class_score FLOAT,
                    homework_score FLOAT,
                    participation_score FLOAT,
                    quiz_score FLOAT,
                    
                    -- Competency tracking (JSON columns)
                    competencies_demonstrated JSON,
                    competency_levels JSON,
                    
                    -- Observations
                    teacher_observations TEXT,
                    learning_difficulties TEXT,
                    strengths_noted TEXT,
                    
                    -- Recommendations
                    next_steps TEXT,
                    support_needed TEXT,
                    
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            print("✅ Created continuous_assessment_records table")
            
            # Create indexes for better performance
            db.session.execute(text("""
                CREATE INDEX idx_continuous_assessment_student_id ON continuous_assessment_records(student_id);
            """))
            print("✅ Created student_id index")
            
            db.session.execute(text("""
                CREATE INDEX idx_continuous_assessment_class_id ON continuous_assessment_records(class_id);
            """))
            print("✅ Created class_id index")
            
            db.session.execute(text("""
                CREATE INDEX idx_continuous_assessment_subject_id ON continuous_assessment_records(subject_id);
            """))
            print("✅ Created subject_id index")
            
            db.session.execute(text("""
                CREATE INDEX idx_continuous_assessment_academic_year_term ON continuous_assessment_records(academic_year, term);
            """))
            print("✅ Created academic_year_term index")
            
            # Commit all changes
            db.session.commit()
            
            print("\n=== Verifying the table creation ===")
            result = db.session.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'continuous_assessment_records' AND table_schema = 'public';
            """))
            
            if result.fetchone():
                print("✅ continuous_assessment_records table verified")
                
                # Check column count
                column_result = db.session.execute(text("""
                    SELECT COUNT(*) as column_count
                    FROM information_schema.columns 
                    WHERE table_name = 'continuous_assessment_records';
                """))
                column_count = column_result.fetchone()[0]
                print(f"✅ Table has {column_count} columns")
            else:
                print("❌ continuous_assessment_records table not found")
                
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()

if __name__ == '__main__':
    create_continuous_assessment_records_table()