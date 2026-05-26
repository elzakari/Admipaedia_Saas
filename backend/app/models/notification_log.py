from app.extensions import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID

class NotificationLog(db.Model):
    """
    Model for logging parent SMS and Email notifications.
    Tracks tenant and branch contexts for accurate operational billing and reports.
    """
    __tablename__ = 'notification_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    branch_id = db.Column(UUID(as_uuid=True), db.ForeignKey('branches.id'), nullable=True, index=True)
    channel = db.Column(db.String(20), nullable=False)  # sms, email
    recipient = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(255), nullable=True)
    content = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='sent', nullable=False)  # sent, failed
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    tenant = db.relationship('Tenant', backref=db.backref('notification_logs', lazy=True))
    branch = db.relationship('Branch', backref=db.backref('notification_logs', lazy=True))
    
    @classmethod
    def query_scoped(cls):
        from flask import g, has_app_context
        query = cls.query
        if has_app_context() and getattr(g, 'branch_id', None):
            query = query.filter_by(branch_id=g.branch_id)
        return query

    def __repr__(self):
        return f'<NotificationLog {self.id}: {self.channel} to {self.recipient} - {self.status}>'
