#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.services.class_service import ClassService
from app.extensions import db
from app.models.class_ import Class

def test_simple_class_deletion():
    """Simple test for class 38 deletion without preliminary checks."""
    app = create_app()
    
    with app.app_context():
        print("=== Simple Class 38 Deletion Test ===")
        
        try:
            # Check if class exists
            class_obj = Class.query.get(38)
            if not class_obj:
                print("❌ Class 38 not found")
                return
            
            print(f"✅ Class 38 found: {class_obj.name}")
            
            # Attempt deletion directly
            print("\n=== Attempting Direct Deletion ===")
            success, error = ClassService.delete_class(38)
            
            if success:
                print("✅ Class 38 deleted successfully!")
            else:
                print(f"❌ Failed to delete class 38: {error}")
                
        except Exception as e:
            print(f"❌ Unexpected error during test: {e}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_simple_class_deletion()