from app.extensions import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID

class SystemSetting(db.Model):
    """
    Model for storing system-wide configurations.
    """
    __tablename__ = 'system_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    setting_type = db.Column(db.String(50), default='string') # string, int, float, boolean, json
    
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @staticmethod
    def get_value(key, default=None):
        setting = SystemSetting.query.filter_by(key=key).first()
        if not setting:
            return default
        
        if setting.setting_type == 'int':
            return int(setting.value)
        elif setting.setting_type == 'float':
            return float(setting.value)
        elif setting.setting_type == 'boolean':
            return setting.value.lower() in ('true', '1', 't', 'y', 'yes')
        return setting.value

    @staticmethod
    def set_value(key, value, setting_type='string', description=None):
        setting = SystemSetting.query.filter_by(key=key).first()
        if setting:
            setting.value = str(value)
            if description:
                setting.description = description
        else:
            setting = SystemSetting(
                key=key, 
                value=str(value), 
                setting_type=setting_type,
                description=description
            )
            db.session.add(setting)
        db.session.commit()
        return setting

    def __repr__(self):
        return f'<SystemSetting {self.key}: {self.value}>'


class SystemSettings(db.Model):
    """
    Model representing platform-wide dynamic system settings configuration block.
    Maps SMTP settings from integrations form saves.
    """
    __tablename__ = 'system_settings_config'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=True, index=True)
    smtp_host = db.Column(db.String(255), nullable=True)
    smtp_password = db.Column(db.String(255), nullable=True)
    smtp_username = db.Column(db.String(255), nullable=True)
    smtp_port = db.Column(db.Integer, nullable=True)
    smtp_encryption = db.Column(db.String(50), nullable=True)

    def __repr__(self):
        return f'<SystemSettings SMTP: {self.smtp_host}>'

