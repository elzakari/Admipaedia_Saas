"""polymorphic education engine

Revision ID: 20260526_polymorphic_education_engine
Revises: 20260521_align_payment_model_column_names_002
Create Date: 2026-05-26

"""
from alembic import op
import sqlalchemy as sa

revision = '20260526_polymorphic_education_engine'
down_revision = '20260521_align_payment_model_column_names_002'
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    if bind.dialect.name != 'sqlite':
        # 1. Academic Time Cycles
        op.execute("""
        CREATE TABLE IF NOT EXISTS academic_cycles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            cycle_type VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            is_current BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT fk_cycle_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );
        """)
        
        # 2. Grade Tracks
        op.execute("""
        CREATE TABLE IF NOT EXISTS grade_tracks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            numeric_level_rank INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT fk_track_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );
        """)
        
        # 3. Polymorphic Grading Scales
        op.execute("""
        CREATE TABLE IF NOT EXISTS polymorphic_grading_scales (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            track_id UUID NOT NULL,
            evaluation_type VARCHAR(50) NOT NULL,
            max_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
            passing_boundary NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
            exam_weight INT NOT NULL DEFAULT 60,
            class_weight INT NOT NULL DEFAULT 40,
            schemes JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT fk_scale_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
            CONSTRAINT fk_scale_track FOREIGN KEY (track_id) REFERENCES grade_tracks(id) ON DELETE CASCADE
        );
        """)
        
        # 4. Alter Grade Levels
        op.execute("""
        ALTER TABLE grade_levels ADD COLUMN IF NOT EXISTS track_id UUID;
        """)
        op.execute("""
        ALTER TABLE grade_levels ALTER COLUMN tenant_id DROP NOT NULL;
        """)
        op.execute("""
        ALTER TABLE grade_levels ALTER COLUMN educational_system_id DROP NOT NULL;
        """)
        op.execute("""
        ALTER TABLE grade_levels ALTER COLUMN order_index DROP NOT NULL;
        """)

def downgrade():
    pass
