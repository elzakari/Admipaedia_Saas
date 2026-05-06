"""seed_tg_bj_educational_system_templates

Revision ID: 20260506_edu_tpl_001
Revises: 20260506_edu_sys_001
Create Date: 2026-05-06 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
import json
import uuid


revision = '20260506_edu_tpl_001'
down_revision = '20260506_edu_sys_001'
branch_labels = None
depends_on = None


def _upsert_template(conn, template: dict):
    exists = conn.execute(
        sa.text("SELECT 1 FROM educational_system_templates WHERE system_key = :system_key LIMIT 1"),
        {"system_key": template["system_key"]},
    ).scalar()
    if exists:
        return
    conn.execute(
        sa.text(
            """
INSERT INTO educational_system_templates (id, country_code, system_key, name, description, config, is_active, version)
VALUES (:id, :country_code, :system_key, :name, :description, CAST(:config AS JSONB), true, :version)
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "country_code": template["country_code"],
            "system_key": template["system_key"],
            "name": template["name"],
            "description": template.get("description"),
            "config": json.dumps(template["config"]),
            "version": int(template.get("version") or 1),
        },
    )


def upgrade():
    conn = op.get_bind()

    tg = {
        "country_code": "TG",
        "system_key": "tg_education_standard",
        "name": "Togo Education System (Standard)",
        "description": "Francophone structure: Primary (CP1-CM2), Secondary (6e-3e), Upper Secondary (Seconde-Terminale)",
        "version": 1,
        "config": {
            "phases": [
                {"name": "Primaire", "levels": ["CP1", "CP2", "CE1", "CE2", "CM1", "CM2"]},
                {"name": "Secondaire - Collège", "levels": ["6e", "5e", "4e", "3e"]},
                {"name": "Secondaire - Lycée", "levels": ["Seconde", "Première", "Terminale"]},
            ],
            "grading": {
                "type": "scale_20",
                "scale": "0-20",
                "pass_mark": 10,
                "bands": [
                    {"name": "Excellent", "min": 16, "max": 20},
                    {"name": "Très bien", "min": 14, "max": 15.99},
                    {"name": "Bien", "min": 12, "max": 13.99},
                    {"name": "Assez bien", "min": 10, "max": 11.99},
                    {"name": "Insuffisant", "min": 0, "max": 9.99},
                ],
            },
            "assessments": {
                "continuous_assessment_weight": 40,
                "exam_weight": 60,
            },
            "locales": {"default": "fr", "supported": ["fr", "en"]},
        },
    }

    bj = {
        "country_code": "BJ",
        "system_key": "bj_education_standard",
        "name": "Benin Education System (Standard)",
        "description": "Francophone structure: Primary (CI-CM2), Secondary (6e-3e), Upper Secondary (Seconde-Terminale)",
        "version": 1,
        "config": {
            "phases": [
                {"name": "Primaire", "levels": ["CI", "CP", "CE1", "CE2", "CM1", "CM2"]},
                {"name": "Secondaire - Collège", "levels": ["6e", "5e", "4e", "3e"]},
                {"name": "Secondaire - Lycée", "levels": ["Seconde", "Première", "Terminale"]},
            ],
            "grading": {
                "type": "scale_20",
                "scale": "0-20",
                "pass_mark": 10,
                "bands": [
                    {"name": "Excellent", "min": 16, "max": 20},
                    {"name": "Très bien", "min": 14, "max": 15.99},
                    {"name": "Bien", "min": 12, "max": 13.99},
                    {"name": "Assez bien", "min": 10, "max": 11.99},
                    {"name": "Insuffisant", "min": 0, "max": 9.99},
                ],
            },
            "assessments": {
                "continuous_assessment_weight": 40,
                "exam_weight": 60,
            },
            "locales": {"default": "fr", "supported": ["fr", "en"]},
        },
    }

    _upsert_template(conn, tg)
    _upsert_template(conn, bj)


def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM educational_system_templates WHERE system_key IN (:tg, :bj)"), {"tg": "tg_education_standard", "bj": "bj_education_standard"})

