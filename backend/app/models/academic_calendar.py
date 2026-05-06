from app.extensions import db
from datetime import datetime

class AcademicYear(db.Model):
    """Model for academic years (e.g., 2023-2024)."""
    __tablename__ = 'academic_years'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)  # e.g., "2023-2024"
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_current = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    terms = db.relationship('Term', backref='academic_year', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<AcademicYear {self.name}>'

class Term(db.Model):
    """Model for academic terms (e.g., Term 1, Semester 1)."""
    __tablename__ = 'terms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)  # e.g., "First Term"
    academic_year_id = db.Column(db.Integer, db.ForeignKey('academic_years.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_current = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Term {self.name} ({self.academic_year.name})>'
