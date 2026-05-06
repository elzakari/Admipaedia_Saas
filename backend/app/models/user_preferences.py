from datetime import datetime

from app.extensions import db


class UserPreferences(db.Model):
    __tablename__ = 'user_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False, index=True)

    theme_mode = db.Column(db.String(20), nullable=False, default='casaos')
    language = db.Column(db.String(12), nullable=False, default='en')
    date_time_format = db.Column(db.String(12), nullable=False, default='auto')
    default_profile_tab = db.Column(db.String(20), nullable=False, default='profile')

    notify_product_updates = db.Column(db.Boolean, nullable=False, default=True)
    notify_security_alerts = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('preferences', uselist=False, lazy='joined'))

    def to_dict(self):
        return {
            'theme_mode': self.theme_mode,
            'language': self.language,
            'date_time_format': self.date_time_format,
            'default_profile_tab': self.default_profile_tab,
            'notify_product_updates': bool(self.notify_product_updates),
            'notify_security_alerts': bool(self.notify_security_alerts),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

