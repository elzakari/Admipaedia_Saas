
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
        
        # Test 1: Fetch object (simulating service call)
        class_obj = ClassService.get_class_by_id(class_id)
        print(f"First fetch result type: {type(class_obj)}")
        
        # Test 2: Simulate what happens in route
        schema = ClassSchema()
        print("Dumping first result...")
        dumped1 = schema.dump(class_obj)
        print("Dump 1 successful")
        
        # Test 3: Simulate cache hit (if ClassService returns dict)
        # Assuming get_class_by_id returns a dict on second call if cached
        # Let's manually cache it if it wasn't
        # Actually ClassService.get_class_by_id sets the cache.
        
        print("Fetching class again (should hit cache)...")
        class_obj_cached = ClassService.get_class_by_id(class_id)
        print(f"Second fetch result type: {type(class_obj_cached)}")
        
        if isinstance(class_obj_cached, dict):
            print("Cache hit confirmed (returned dict)")
            print("Dumping cached dict...")
            dumped2 = schema.dump(class_obj_cached)
            print("Dump 2 successful")
            print(dumped2)
        else:
            print("Cache miss or returned object (unexpected if cache works)")
            
    except Exception as e:
        print("Error occurred:")
        traceback.print_exc()
