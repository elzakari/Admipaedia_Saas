# Create a new service for curriculum operations
from app.models.curriculum import Curriculum
from app.models.curriculum_unit import CurriculumUnit
from app.extensions import db
from sqlalchemy import desc

class CurriculumService:
    """Service for curriculum-related operations."""
    
    @staticmethod
    def create_curriculum(data):
        """Create a new curriculum."""
        try:
            curriculum = Curriculum(**data)
            db.session.add(curriculum)
            db.session.commit()
            return curriculum, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def add_curriculum_unit(data):
        """Add a unit to a curriculum."""
        try:
            unit = CurriculumUnit(**data)
            db.session.add(unit)
            db.session.commit()
            return unit, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def get_curriculum_by_subject(subject_id, grade_level=None, academic_year=None):
        """Get curricula for a specific subject."""
        query = Curriculum.query.filter(Curriculum.subject_id == subject_id)
        
        if grade_level:
            query = query.filter(Curriculum.grade_level == grade_level)
            
        if academic_year:
            query = query.filter(Curriculum.academic_year == academic_year)
            
        return query.order_by(Curriculum.title).all()
    
    @staticmethod
    def get_all_curricula(page=1, per_page=20, subject_id=None, grade_level=None, academic_year=None):
        """Get all curricula with optional filtering."""
        query = Curriculum.query
        
        if subject_id:
            query = query.filter(Curriculum.subject_id == subject_id)
            
        if grade_level:
            query = query.filter(Curriculum.grade_level == grade_level)
            
        if academic_year:
            query = query.filter(Curriculum.academic_year == academic_year)
            
        return query.order_by(desc(Curriculum.created_at)).paginate(page=page, per_page=per_page)
    
    @staticmethod
    def get_curriculum_by_id(curriculum_id):
        """Get a curriculum by ID."""
        return Curriculum.query.get(curriculum_id)
    
    @staticmethod
    def update_curriculum(curriculum_id, data):
        """Update a curriculum."""
        try:
            curriculum = Curriculum.query.get(curriculum_id)
            if not curriculum:
                return None, "Curriculum not found"
                
            for key, value in data.items():
                setattr(curriculum, key, value)
                
            db.session.commit()
            return curriculum, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def delete_curriculum(curriculum_id):
        """Delete a curriculum."""
        try:
            curriculum = Curriculum.query.get(curriculum_id)
            if not curriculum:
                return False, "Curriculum not found"
                
            db.session.delete(curriculum)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)
    
    @staticmethod
    def get_curriculum_units(curriculum_id):
        """Get all units for a curriculum."""
        return CurriculumUnit.query.filter_by(curriculum_id=curriculum_id).order_by(CurriculumUnit.sequence_order).all()
    
    @staticmethod
    def get_curriculum_unit_by_id(unit_id):
        """Get a curriculum unit by ID."""
        return CurriculumUnit.query.get(unit_id)
    
    @staticmethod
    def update_curriculum_unit(unit_id, data):
        """Update a curriculum unit."""
        try:
            unit = CurriculumUnit.query.get(unit_id)
            if not unit:
                return None, "Curriculum unit not found"
                
            for key, value in data.items():
                setattr(unit, key, value)
                
            db.session.commit()
            return unit, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def delete_curriculum_unit(unit_id):
        """Delete a curriculum unit."""
        try:
            unit = CurriculumUnit.query.get(unit_id)
            if not unit:
                return False, "Curriculum unit not found"
                
            db.session.delete(unit)
            db.session.commit()
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)