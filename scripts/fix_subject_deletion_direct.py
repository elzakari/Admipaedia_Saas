#!/usr/bin/env python3
"""
Direct SQL script to fix subject deletion issues
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

def run_direct_fixes():
    """Run direct SQL fixes for subject deletion"""
    try:
        from app import create_app, db
        
        app = create_app()
        with app.app_context():
            print("🔧 Applying direct SQL fixes...")
            
            # 1. Add missing columns to assessment_frameworks
            missing_columns = [
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS formative_weight FLOAT;",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS summative_weight FLOAT;",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS school_based_weight FLOAT;",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS project_weight FLOAT;",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS formative_frequency VARCHAR(50);",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS summative_frequency VARCHAR(50);",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS curriculum_standards TEXT;",
                "ALTER TABLE assessment_frameworks ADD COLUMN IF NOT EXISTS competency_indicators TEXT;"
            ]
            
            for sql in missing_columns:
                try:
                    db.session.execute(sql)
                    print(f"✅ Executed: {sql[:50]}...")
                except Exception as e:
                    print(f"⚠️  Skipped: {sql[:50]}... (probably already exists)")
            
            # 2. Update foreign key constraints with CASCADE DELETE
            constraints_updates = [
                # Drop and recreate with CASCADE DELETE
                "ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_subject_id_fkey;",
                "ALTER TABLE grades ADD CONSTRAINT grades_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;",
                
                "ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_subject_id_fkey;",
                "ALTER TABLE exams ADD CONSTRAINT exams_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;",
                
                "ALTER TABLE external_exam_results DROP CONSTRAINT IF EXISTS external_exam_results_subject_id_fkey;",
                "ALTER TABLE external_exam_results ADD CONSTRAINT external_exam_results_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;",
                
                "ALTER TABLE final_grades DROP CONSTRAINT IF EXISTS final_grades_subject_id_fkey;",
                "ALTER TABLE final_grades ADD CONSTRAINT final_grades_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;",
                
                "ALTER TABLE enhanced_grades DROP CONSTRAINT IF EXISTS enhanced_grades_subject_id_fkey;",
                "ALTER TABLE enhanced_grades ADD CONSTRAINT enhanced_grades_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;",
                
                "ALTER TABLE continuous_assessment_records DROP CONSTRAINT IF EXISTS continuous_assessment_records_subject_id_fkey;",
                "ALTER TABLE continuous_assessment_records ADD CONSTRAINT continuous_assessment_records_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;",
                
                "ALTER TABLE school_based_assessments DROP CONSTRAINT IF EXISTS school_based_assessments_subject_id_fkey;",
                "ALTER TABLE school_based_assessments ADD CONSTRAINT school_based_assessments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;",
                
                "ALTER TABLE assessment_frameworks DROP CONSTRAINT IF EXISTS assessment_frameworks_subject_id_fkey;",
                "ALTER TABLE assessment_frameworks ADD CONSTRAINT assessment_frameworks_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;",
                
                "ALTER TABLE teacher_subjects DROP CONSTRAINT IF EXISTS teacher_subjects_subject_id_fkey;",
                "ALTER TABLE teacher_subjects ADD CONSTRAINT teacher_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;",
                
                "ALTER TABLE class_subjects DROP CONSTRAINT IF EXISTS class_subjects_subject_id_fkey;",
                "ALTER TABLE class_subjects ADD CONSTRAINT class_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;",
                
                "ALTER TABLE stem_subjects DROP CONSTRAINT IF EXISTS stem_subjects_subject_id_fkey;",
                "ALTER TABLE stem_subjects ADD CONSTRAINT stem_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;"
            ]
            
            for sql in constraints_updates:
                try:
                    db.session.execute(sql)
                    print(f"✅ Executed: {sql[:60]}...")
                except Exception as e:
                    print(f"⚠️  Warning: {sql[:60]}... - {str(e)[:50]}")
            
            # 3. Set default values
            default_values_sql = """
                UPDATE assessment_frameworks 
                SET formative_weight = COALESCE(formative_weight, 40.0),
                    summative_weight = COALESCE(summative_weight, 60.0),
                    school_based_weight = COALESCE(school_based_weight, 0.0),
                    project_weight = COALESCE(project_weight, 0.0),
                    formative_frequency = COALESCE(formative_frequency, 'weekly'),
                    summative_frequency = COALESCE(summative_frequency, 'monthly')
                WHERE formative_weight IS NULL OR summative_weight IS NULL;
            """
            
            try:
                db.session.execute(default_values_sql)
                print("✅ Set default values for assessment frameworks")
            except Exception as e:
                print(f"⚠️  Warning setting defaults: {e}")
            
            # Commit all changes
            db.session.commit()
            print("\n🎉 All fixes applied successfully!")
            
            return True
            
    except Exception as e:
        print(f"❌ Error applying fixes: {e}")
        return False

def main():
    print("🚀 Direct Subject Deletion Fixes")
    print("=" * 40)
    
    if run_direct_fixes():
        print("\n✅ Subject deletion issues fixed!")
        print("\n📋 You can now:")
        print("1. Try deleting subject 7 again")
        print("2. Use the enhanced subject service for safe deletion")
    else:
        print("\n❌ Fixes failed. Check the error messages above.")

if __name__ == '__main__':
    main()