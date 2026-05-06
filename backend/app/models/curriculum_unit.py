# Create a new model for curriculum units
from datetime import datetime
from app.extensions import db

class CurriculumUnit(db.Model):
    """Model for curriculum units within a curriculum."""
    __tablename__ = 'curriculum_units'
    
    id = db.Column(db.Integer, primary_key=True)
    curriculum_id = db.Column(db.Integer, db.ForeignKey('curricula.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    objectives = db.Column(db.Text, nullable=True)
    resources = db.Column(db.Text, nullable=True)
    duration_weeks = db.Column(db.Integer, nullable=False)
    sequence_order = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    curriculum = db.relationship('Curriculum', backref=db.backref('units', lazy=True, cascade='all, delete-orphan', order_by='CurriculumUnit.sequence_order'))
    
    def __repr__(self):
        return f'<CurriculumUnit {self.id}: {self.title} - Curriculum {self.curriculum_id}'