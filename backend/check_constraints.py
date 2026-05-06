from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Query to get all foreign key constraints for tables with class_id
    query = text("""
        SELECT 
            tc.table_name, 
            tc.constraint_name, 
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE 
            tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'classes'
            AND ccu.column_name = 'id'
        ORDER BY tc.table_name, tc.constraint_name;
    """)
    
    result = db.session.execute(query)
    constraints = result.fetchall()
    
    print("Current foreign key constraints referencing classes.id:")
    print("=" * 60)
    for constraint in constraints:
        print(f"Table: {constraint.table_name}")
        print(f"Constraint: {constraint.constraint_name}")
        print(f"Column: {constraint.column_name} -> {constraint.foreign_table_name}.{constraint.foreign_column_name}")
        print("-" * 40)