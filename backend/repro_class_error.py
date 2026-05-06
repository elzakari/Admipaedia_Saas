
import os
import sys
from app import create_app
from app.services.class_service import ClassService
from app.schemas.class_ import ClassSchema
import traceback

app = create_app()

with app.app_context():
    try:
        class_id = 251
        print(f"Fetching class {class_id}...")
        
        # Test 1: Fetch object
        class_obj = ClassService.get_class_by_id(class_id)
        if not class_obj:
            print("Class not found!")
            sys.exit(1)
            
        print(f"Class found: {class_obj}")
        print(f"Type: {type(class_obj)}")
        
        if isinstance(class_obj, dict):
            print("Class is a dict (cached DTO)")
            print(class_obj)
        else:
            print("Class is an object")
            print(f"Name: {class_obj.name}")
            
            # Test 2: Dump object
            print("Dumping class with schema...")
            schema = ClassSchema()
            dumped = schema.dump(class_obj)
            print("Dump successful!")
            print(dumped)
            
    except Exception as e:
        print("Error occurred:")
        traceback.print_exc()
