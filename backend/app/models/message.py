from app.extensions import db
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    sender_type = Column(String(20), nullable=False)  # admin, teacher, student, parent
    recipient_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    recipient_type = Column(String(20), nullable=False)  # admin, teacher, student, parent, class
    subject = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    is_deleted_by_sender = Column(Boolean, default=False, nullable=False)
    is_deleted_by_recipient = Column(Boolean, default=False, nullable=False)
    attachments = Column(JSON)  # Store attachment file paths as JSON array
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    sender = relationship('User', foreign_keys=[sender_id], backref='sent_messages')
    recipient = relationship('User', foreign_keys=[recipient_id], backref='received_messages')
    
    def __repr__(self):
        return f'<Message {self.id}: {self.subject}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'sender_type': self.sender_type,
            'recipient_id': self.recipient_id,
            'recipient_type': self.recipient_type,
            'subject': self.subject,
            'content': self.content,
            'is_read': self.is_read,
            'attachments': self.attachments or [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @property
    def is_deleted(self):
        """Check if message is deleted for current user context"""
        return self.is_deleted_by_sender or self.is_deleted_by_recipient
    
    def delete_for_user(self, user_id, permanent=False):
        """Delete message for a specific user"""
        if permanent:
            # Permanent delete - remove from database
            db.session.delete(self)
        else:
            # Soft delete - mark as deleted for the user
            if self.sender_id == user_id:
                self.is_deleted_by_sender = True
            elif self.recipient_id == user_id:
                self.is_deleted_by_recipient = True
        
        db.session.commit()
    
    def mark_as_read(self):
        """Mark message as read"""
        self.is_read = True
        self.updated_at = datetime.utcnow()
        db.session.commit()