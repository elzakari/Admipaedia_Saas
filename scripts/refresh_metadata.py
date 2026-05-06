#!/usr/bin/env python3
"""
Refresh SQLAlchemy metadata to recognize new columns
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

def refresh_metadata():
    """Refresh SQLAlchemy metadata"""
    try:
        from app import create_app
        from app.extensions import db
        
        app = create_app()
        with app.app_context():
            print("🔄 Refreshing SQLAlchemy metadata...")
            
            # Clear metadata cache
            db.metadata.clear()
            
            # Reflect current database schema
            db.metadata.reflect(bind=db.engine)
            
            print("✅ Metadata refreshed successfully!")
            
            # Verify curricula table columns
            if 'curricula' in db.metadata.tables:
                curricula_table = db.metadata.tables['curricula']
                print(f"\n📋 Curricula table has {len(curricula_table.columns)} columns:")
                for col in curricula_table.columns:
                    print(f"  - {col.name} ({col.type})")
            
    except Exception as e:
        print(f"❌ Error refreshing metadata: {str(e)}")
        return False
    
    return True

if __name__ == '__main__':
    print("🔄 SQLAlchemy Metadata Refresh")
    print("=" * 35)
    refresh_metadata()