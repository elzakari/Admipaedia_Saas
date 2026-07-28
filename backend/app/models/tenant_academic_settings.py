import uuid
from datetime import datetime

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.extensions import db


class TenantAcademicSettings(db.Model):
    __tablename__ = "tenant_academic_settings"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(
        UUID(as_uuid=True), db.ForeignKey("tenants.id"), nullable=False, unique=True
    )
    settings = db.Column(
        JSON().with_variant(JSONB(), "postgresql"), nullable=False, default=dict
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
