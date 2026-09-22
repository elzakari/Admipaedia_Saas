"""Repair missing legacy Exam and Grade tables.

Revision ID: 20260917_exam_grade_repair
Revises: 20260917_finance_repair_merge

This migration repairs schema drift caused by legacy installations
where Exam and Grade models existed before Alembic became the sole
schema authority.

The migration is intentionally forward-only and idempotent:
existing tables are left untouched.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260917_exam_grade_repair"
down_revision = "20260917_finance_repair_merge"
branch_labels = None
depends_on = None


def _table_exists(bind, table_name):
    return table_name in inspect(bind).get_table_names(
        schema="public"
    )


def upgrade():
    bind = op.get_bind()

    # --------------------------------------------------
    # exams
    # --------------------------------------------------

    if not _table_exists(bind, "exams"):
        op.create_table(
            "exams",
            sa.Column(
                "id",
                sa.Integer(),
                primary_key=True,
                nullable=False,
            ),
            sa.Column(
                "title",
                sa.String(length=100),
                nullable=False,
            ),
            sa.Column(
                "description",
                sa.Text(),
                nullable=True,
            ),
            sa.Column(
                "exam_date",
                sa.DateTime(),
                nullable=False,
            ),
            sa.Column(
                "duration",
                sa.Integer(),
                nullable=False,
            ),
            sa.Column(
                "total_marks",
                sa.Float(),
                nullable=False,
            ),
            sa.Column(
                "passing_marks",
                sa.Float(),
                nullable=False,
            ),
            sa.Column(
                "class_id",
                sa.Integer(),
                nullable=False,
            ),
            sa.Column(
                "subject_id",
                sa.Integer(),
                nullable=False,
            ),
            sa.Column(
                "created_by",
                sa.Integer(),
                nullable=False,
            ),
            sa.Column(
                "status",
                sa.String(length=20),
                nullable=True,
            ),
            sa.Column(
                "assessment_type",
                sa.String(length=50),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=True,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(
                ["class_id"],
                ["classes.id"],
            ),
            sa.ForeignKeyConstraint(
                ["subject_id"],
                ["subjects.id"],
            ),
            sa.ForeignKeyConstraint(
                ["created_by"],
                ["users.id"],
            ),
        )

    # --------------------------------------------------
    # grades
    # --------------------------------------------------

    if not _table_exists(bind, "grades"):
        op.create_table(
            "grades",
            sa.Column(
                "id",
                sa.Integer(),
                primary_key=True,
                nullable=False,
            ),
            sa.Column(
                "student_id",
                sa.Integer(),
                nullable=False,
            ),
            sa.Column(
                "exam_id",
                sa.Integer(),
                nullable=False,
            ),
            sa.Column(
                "marks_obtained",
                sa.Float(),
                nullable=False,
            ),
            sa.Column(
                "percentage",
                sa.Float(),
                nullable=False,
            ),
            sa.Column(
                "grade_letter",
                sa.String(length=5),
                nullable=True,
            ),
            sa.Column(
                "remarks",
                sa.Text(),
                nullable=True,
            ),
            sa.Column(
                "graded_by",
                sa.Integer(),
                nullable=False,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=True,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=True,
            ),
            sa.Column(
                "subject_id",
                sa.Integer(),
                nullable=True,
            ),
            sa.Column(
                "class_id",
                sa.Integer(),
                nullable=True,
            ),
            sa.Column(
                "term",
                sa.String(length=20),
                nullable=True,
            ),
            sa.Column(
                "academic_year",
                sa.String(length=20),
                nullable=True,
            ),
            sa.Column(
                "assessment_type",
                sa.String(length=20),
                nullable=True,
            ),
            sa.Column(
                "is_final",
                sa.Boolean(),
                nullable=True,
            ),
            sa.Column(
                "weight",
                sa.Float(),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(
                ["student_id"],
                ["students.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["exam_id"],
                ["exams.id"],
            ),
            sa.ForeignKeyConstraint(
                ["graded_by"],
                ["users.id"],
            ),
            sa.ForeignKeyConstraint(
                ["subject_id"],
                ["subjects.id"],
            ),
            sa.ForeignKeyConstraint(
                ["class_id"],
                ["classes.id"],
            ),
        )

        op.create_index(
            "ix_grades_class_id",
            "grades",
            ["class_id"],
            unique=False,
        )

        op.create_index(
            "ix_grades_subject_id",
            "grades",
            ["subject_id"],
            unique=False,
        )


def downgrade():
    # Forward-only schema repair.
    #
    # Dropping either table could destroy legitimate Exam/Grade data
    # on installations where the tables predated this repair revision.
    pass
