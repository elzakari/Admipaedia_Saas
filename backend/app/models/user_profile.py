from datetime import datetime

from app.extensions import db


class UserProfile(db.Model):
    __tablename__ = 'user_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False, index=True)

    display_name = db.Column(db.String(120), nullable=False)
    legal_name = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(32), nullable=True)
    country = db.Column(db.String(80), nullable=True)
    timezone = db.Column(db.String(80), nullable=True)
    avatar_url = db.Column(db.String(512), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Note: Relationship is now defined on the parent User model with a cascade delete backref

    def to_dict(self):
        return {
            'display_name': self.display_name,
            'legal_name': self.legal_name,
            'phone': self.phone,
            'country': self.country,
            'timezone': self.timezone,
            'avatar_url': self.avatar_url,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

