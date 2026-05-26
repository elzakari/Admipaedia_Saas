from app.extensions import db
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import JSON
from sqlalchemy.sql import func
from sqlalchemy.ext.hybrid import hybrid_property
import uuid

class EducationalSystemTemplate(db.Model):
    """
    Template for a country's educational system (e.g., Ghana GES, Nigeria NERDC).
    """
    __tablename__ = 'educational_system_templates'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    country_code = db.Column(db.String(2), nullable=True)  # ISO 3166-1 alpha-2
    system_key = db.Column(db.String(100), unique=True, nullable=False)  # e.g., 'gh_ges_standard'
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # The core configuration JSON that defines the system structure
    # Includes: grade_levels, grading_schemes, core_subjects, assessments, etc.
    config = db.Column(JSON().with_variant(JSONB(), 'postgresql'), nullable=False)
    
    is_active = db.Column(db.Boolean, default=True)
    version = db.Column(db.Integer, default=1)
    
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f'<EducationalSystemTemplate {self.system_key}: {self.name}>'

class EducationalSystemConfig(db.Model):
    """
    Tenant-specific instantiation of an educational system.
    This allows customization per school (e.g., specific grading scales).
    Stored in the tenant's schema.
    """
    __tablename__ = 'educational_system_config'
    # No schema specified, defaults to tenant's schema in context

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    template_key = db.Column(db.String(100), nullable=True) # Reference to the template used
    name = db.Column(db.String(255), nullable=False)
    
    # The active configuration for this tenant
    config = db.Column(JSON().with_variant(JSONB(), 'postgresql'), nullable=False)
    
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    # Relationships
    grade_levels = db.relationship('GradeLevel', backref='educational_system', lazy=True)

    def __repr__(self):
        return f'<EducationalSystemConfig {self.name}>'

class GradeLevel(db.Model):
    """
    Specific grade levels for the tenant's system (e.g., 'Grade 1', 'JHS 1').
    """
    __tablename__ = 'grade_levels'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=True, index=True)
    educational_system_id = db.Column(UUID(as_uuid=True), db.ForeignKey('educational_system_config.id'), nullable=True)
    
    track_id = db.Column(UUID(as_uuid=True), db.ForeignKey('grade_tracks.id', ondelete='CASCADE'), nullable=True)
    name = db.Column(db.String(255), nullable=False)
    order_index = db.Column(db.Integer, nullable=True, default=1) # For sorting (1, 2, 3...)
    is_terminal = db.Column(db.Boolean, default=False) # Is this a final year?
    
    next_level_id = db.Column(UUID(as_uuid=True), db.ForeignKey('grade_levels.id'), nullable=True)
    
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    next_level = db.relationship('GradeLevel', remote_side=[id], backref='previous_level')

    @hybrid_property
    def is_active(self):
        return True

    @is_active.expression
    def is_active(cls):
        return db.literal(True)

    @hybrid_property
    def numeric_value(self):
        return self.order_index if self.order_index is not None else 1

    @numeric_value.expression
    def numeric_value(cls):
        return cls.order_index

    def __repr__(self):
        return f'<GradeLevel {self.name}>'
