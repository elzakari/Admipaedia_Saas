#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import text

def create_school_based_assessments_table():
    """Create the school_based_assessments table with all required columns"""
    app = create_app()
    
    with app.app_context():
        try:
            print("=== Creating school_based_assessments table ===")
            
            # Create the table
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS school_based_assessments (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES students(id),
                subject_id INTEGER NOT NULL REFERENCES subjects(id),
                class_id INTEGER NOT NULL REFERENCES classes(id),
                
                -- SBA period
                academic_year VARCHAR(20) NOT NULL,
                term VARCHAR(20) NOT NULL,
                
                -- SBA components (as per GES guidelines)
                -- Component 1: Class Exercises and Homework (10%)
                class_exercises_score FLOAT DEFAULT 0.0,
                homework_score FLOAT DEFAULT 0.0,
                
                -- Component 2: Projects and Assignments (15%)
                project_score FLOAT DEFAULT 0.0,
                assignment_score FLOAT DEFAULT 0.0,
                
                -- Component 3: Class Tests (15%)
                class_test_scores JSON,
                class_test_average FLOAT DEFAULT 0.0,
                
                -- Total SBA score (out of 40% for BECE, varies for others)
                total_sba_score FLOAT DEFAULT 0.0,
                sba_percentage FLOAT DEFAULT 0.0,
                
                -- Competency assessment
                core_competencies_score JSON,
                subject_competencies_score JSON,
                
                -- Teacher assessment
                teacher_id INTEGER NOT NULL REFERENCES teachers(id),
                assessment_date DATE NOT NULL,
                
                -- Quality assurance
                is_moderated BOOLEAN DEFAULT FALSE,
                moderated_by INTEGER REFERENCES teachers(id),
                moderation_date DATE,
                moderation_comments TEXT,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
            
            db.session.execute(text(create_table_sql))
            print("✅ Created school_based_assessments table")
            
            # Create indexes for performance
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_sba_student_id ON school_based_assessments(student_id);",
                "CREATE INDEX IF NOT EXISTS idx_sba_class_id ON school_based_assessments(class_id);",
                "CREATE INDEX IF NOT EXISTS idx_sba_subject_id ON school_based_assessments(subject_id);",
                "CREATE INDEX IF NOT EXISTS idx_sba_teacher_id ON school_based_assessments(teacher_id);",
                "CREATE INDEX IF NOT EXISTS idx_sba_academic_year_term ON school_based_assessments(academic_year, term);"
            ]
            
            for index_sql in indexes:
                db.session.execute(text(index_sql))
                print(f"✅ Created index: {index_sql.split()[5]}")
            
            db.session.commit()
            
            print("\n=== Verifying the table creation ===")
            
            # Verify table exists
            result = db.session.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'school_based_assessments'
                );
            """))
            
            if result.scalar():
                print("✅ school_based_assessments table verified")
                
                # Count columns
                column_count = db.session.execute(text("""
                    SELECT COUNT(*) 
                    FROM information_schema.columns 
                    WHERE table_name = 'school_based_assessments';
                """)).scalar()
                
                print(f"✅ Table has {column_count} columns")
                
            else:
                print("❌ Table creation failed")
                
        except Exception as e:
            print(f"❌ Error creating school_based_assessments table: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    create_school_based_assessments_table()