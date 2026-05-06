#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from sqlalchemy import text

def fix_attendances_foreign_key():
    """Fix the attendances table foreign key constraint for class_id."""
    app = create_app()
    
    with app.app_context():
        try:
            print("=== Fixing Attendances Foreign Key Constraint ===")
            
            # First, check current constraint
            print("\n1. Checking current foreign key constraints...")
            result = db.session.execute(text("""
                SELECT 
                    tc.constraint_name,
                    tc.table_name, 
                    kcu.column_name, 
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name,
                    rc.delete_rule
                FROM 
                    information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                    JOIN information_schema.referential_constraints AS rc
                      ON tc.constraint_name = rc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'attendances'
                AND kcu.column_name = 'class_id';
            """))
            
            constraints = result.fetchall()
            if constraints:
                for constraint in constraints:
                    print(f"Found constraint: {constraint[0]} - DELETE rule: {constraint[5]}")
                    constraint_name = constraint[0]
            else:
                print("No foreign key constraint found on attendances.class_id")
                return
            
            # Drop the existing constraint
            print(f"\n2. Dropping existing constraint: {constraint_name}")
            db.session.execute(text(f"ALTER TABLE attendances DROP CONSTRAINT {constraint_name}"))
            
            # Add new constraint with CASCADE DELETE
            print("\n3. Adding new constraint with CASCADE DELETE...")
            db.session.execute(text("""
                ALTER TABLE attendances 
                ADD CONSTRAINT attendances_class_id_fkey 
                FOREIGN KEY (class_id) 
                REFERENCES classes(id) 
                ON DELETE CASCADE
            """))
            
            # Commit the changes
            db.session.commit()
            print("✅ Successfully updated attendances foreign key constraint with CASCADE DELETE")
            
            # Verify the change
            print("\n4. Verifying the new constraint...")
            result = db.session.execute(text("""
                SELECT 
                    tc.constraint_name,
                    rc.delete_rule
                FROM 
                    information_schema.table_constraints AS tc 
                    JOIN information_schema.referential_constraints AS rc
                      ON tc.constraint_name = rc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = 'attendances'
                AND tc.constraint_name = 'attendances_class_id_fkey';
            """))
            
            verification = result.fetchone()
            if verification:
                print(f"✅ Verified: {verification[0]} - DELETE rule: {verification[1]}")
            else:
                print("❌ Could not verify the new constraint")
                
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error fixing attendances foreign key: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    fix_attendances_foreign_key()