import uuid
from datetime import datetime
from app.extensions import db
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

class Attachment(db.Model):
    __tablename__ = 'attachments'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)  # Relative file path
    size = db.Column(db.Integer, nullable=True)
    mime_type = db.Column(db.String(100), nullable=True)
    uploader_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    entity_type = db.Column(db.String(50), nullable=True)  # 'message', 'notification', 'assignment', 'announcement'
    entity_id = db.Column(db.String(50), nullable=True)  # Associated entity's ID
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    uploader = db.relationship('User', backref='uploaded_attachments')
    tenant = db.relationship('Tenant', backref='attachments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'size': self.size,
            'mime_type': self.mime_type,
            'uploader_id': self.uploader_id,
            'tenant_id': self.tenant_id,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'download_url': f'/api/v1/attachments/{self.id}/download',
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
