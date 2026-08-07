"""Add homework submissions table and performance indexes

Revision ID: 20260806_p2_homework_idx
Revises: 20260806_daily_lessons_v2
Create Date: 2026-08-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260806_p2_homework_idx"
down_revision = "20260806_daily_lessons_v2"
branch_labels = None
depends_on = None


def _table_exists(conn, table):
    if conn.dialect.name == "sqlite":
        result = conn.execute(sa.text(f"PRAGMA table_info('{table}')"))
        return result.fetchone() is not None
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :t"
        ),
        {"t": table},
    ).fetchone()
    return result is not None


def _column_exists(conn, table, column):
    if conn.dialect.name == "sqlite":
        result = conn.execute(sa.text(f"PRAGMA table_info('{table}')"))
        columns = [row[1] for row in result.fetchall()]
        return column in columns
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' "
            "  AND table_name   = :t "
            "  AND column_name  = :c"
        ),
        {"t": table, "c": column},
    ).fetchone()
    return result is not None


def _all_columns_exist(conn, table, columns):
    for c in columns:
        if not _column_exists(conn, table, c):
            return False
    return True


def _index_exists(conn, table, index):
    if conn.dialect.name == "sqlite":
        result = conn.execute(sa.text(f"PRAGMA index_list('{table}')"))
        indexes = [row[1] for row in result.fetchall()]
        return index in indexes
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM pg_indexes "
            "WHERE tablename = :t AND indexname = :i"
        ),
        {"t": table, "i": index},
    ).fetchone()
    return result is not None


def _uuid_type(conn):
    if conn.dialect.name == "postgresql":
        return postgresql.UUID(as_uuid=True)
    return sa.String(length=36)


def upgrade():
    conn = op.get_bind()
    is_pg = conn.dialect.name == "postgresql"

    # ------------------------------------------------------------------
    # 1. Create homework_submissions table (additive-only)
    # ------------------------------------------------------------------
    if not _table_exists(conn, "homework_submissions"):
        op.create_table(
            "homework_submissions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "lesson_id",
                sa.Integer(),
                sa.ForeignKey("lessons.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "student_id",
                sa.Integer(),
                sa.ForeignKey("students.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "tenant_id",
                _uuid_type(conn),
                sa.ForeignKey("tenants.id", ondelete="CASCADE"),
                nullable=True,
            ),
            sa.Column(
                "submission_type",
                sa.String(length=20),
                nullable=False,
                server_default=sa.text("'text'"),
            ),
            sa.Column("submission_text", sa.Text(), nullable=True),
            sa.Column("storage_key", sa.String(length=512), nullable=True),
            sa.Column("link_url", sa.String(length=1024), nullable=True),
            sa.Column("submitted_at", sa.DateTime(), nullable=True),
            sa.Column(
                "graded_by_user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("grade_number", sa.Numeric(precision=10, scale=2), nullable=True),
            sa.Column("feedback", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.now(),
            ),
        )

        op.create_index(
            "ix_homework_submissions_lesson_id",
            "homework_submissions",
            ["lesson_id"],
        )
        op.create_index(
            "ix_homework_submissions_student_id",
            "homework_submissions",
            ["student_id"],
        )
        op.create_index(
            "ix_homework_submissions_tenant_id",
            "homework_submissions",
            ["tenant_id"],
        )
        op.create_index(
            "ix_homework_submissions_graded_by_user_id",
            "homework_submissions",
            ["graded_by_user_id"],
        )
        op.create_index(
            "ix_homework_submissions_lesson_student",
            "homework_submissions",
            ["lesson_id", "student_id"],
            unique=False,
        )

    # ------------------------------------------------------------------
    # 2. Performance indexes: lessons (date, status, class_id, subject_id, teacher_id)
    # ------------------------------------------------------------------
    if _table_exists(conn, "lessons"):
        lesson_composite_idx = "ix_lessons_date_status_class_subject_teacher"
        if (
            not _index_exists(conn, "lessons", lesson_composite_idx)
            and _all_columns_exist(conn, "lessons", ["date", "status", "class_id", "subject_id", "teacher_id"])
        ):
            op.create_index(
                lesson_composite_idx,
                "lessons",
                ["date", "status", "class_id", "subject_id", "teacher_id"],
            )

        lesson_class_date_idx = "ix_lessons_class_id_date"
        if (
            not _index_exists(conn, "lessons", lesson_class_date_idx)
            and _all_columns_exist(conn, "lessons", ["class_id", "date"])
        ):
            op.create_index(
                lesson_class_date_idx,
                "lessons",
                ["class_id", "date"],
            )

        lesson_teacher_date_idx = "ix_lessons_teacher_id_date"
        if (
            not _index_exists(conn, "lessons", lesson_teacher_date_idx)
            and _all_columns_exist(conn, "lessons", ["teacher_id", "date"])
        ):
            op.create_index(
                lesson_teacher_date_idx,
                "lessons",
                ["teacher_id", "date"],
            )

    # ------------------------------------------------------------------
    # 3. Performance indexes: lesson_broadcasts (status, lesson_id, started_at)
    # ------------------------------------------------------------------
    if _table_exists(conn, "lesson_broadcasts"):
        broadcast_composite_idx = "ix_broadcasts_status_lesson_started"
        if (
            not _index_exists(conn, "lesson_broadcasts", broadcast_composite_idx)
            and _all_columns_exist(conn, "lesson_broadcasts", ["status", "lesson_id", "started_at"])
        ):
            op.create_index(
                broadcast_composite_idx,
                "lesson_broadcasts",
                ["status", "lesson_id", "started_at"],
            )

        broadcast_lesson_started_idx = "ix_broadcasts_lesson_id_started_at"
        if (
            not _index_exists(conn, "lesson_broadcasts", broadcast_lesson_started_idx)
            and _all_columns_exist(conn, "lesson_broadcasts", ["lesson_id", "started_at"])
        ):
            op.create_index(
                broadcast_lesson_started_idx,
                "lesson_broadcasts",
                ["lesson_id", "started_at"],
            )

    # ------------------------------------------------------------------
    # 4. Performance indexes: lesson_comments (lesson_id, requires_approval, is_deleted, visibility)
    # ------------------------------------------------------------------
    if _table_exists(conn, "lesson_comments"):
        comment_composite_idx = "ix_comments_lesson_approval_deleted_visibility"
        if (
            not _index_exists(conn, "lesson_comments", comment_composite_idx)
            and _all_columns_exist(conn, "lesson_comments", ["lesson_id", "requires_approval", "is_deleted", "visibility"])
        ):
            op.create_index(
                comment_composite_idx,
                "lesson_comments",
                ["lesson_id", "requires_approval", "is_deleted", "visibility"],
            )

        comment_lesson_created_idx = "ix_comments_lesson_id_created_at"
        if (
            not _index_exists(conn, "lesson_comments", comment_lesson_created_idx)
            and _all_columns_exist(conn, "lesson_comments", ["lesson_id", "created_at"])
        ):
            op.create_index(
                comment_lesson_created_idx,
                "lesson_comments",
                ["lesson_id", "created_at"],
            )


def downgrade():
    conn = op.get_bind()

    if _table_exists(conn, "lesson_comments"):
        for idx in [
            "ix_comments_lesson_approval_deleted_visibility",
            "ix_comments_lesson_id_created_at",
        ]:
            if _index_exists(conn, "lesson_comments", idx):
                op.drop_index(idx, table_name="lesson_comments")

    if _table_exists(conn, "lesson_broadcasts"):
        for idx in [
            "ix_broadcasts_status_lesson_started",
            "ix_broadcasts_lesson_id_started_at",
        ]:
            if _index_exists(conn, "lesson_broadcasts", idx):
                op.drop_index(idx, table_name="lesson_broadcasts")

    if _table_exists(conn, "lessons"):
        for idx in [
            "ix_lessons_date_status_class_subject_teacher",
            "ix_lessons_class_id_date",
            "ix_lessons_teacher_id_date",
        ]:
            if _index_exists(conn, "lessons", idx):
                op.drop_index(idx, table_name="lessons")

    if _table_exists(conn, "homework_submissions"):
        for idx in [
            "ix_homework_submissions_lesson_student",
            "ix_homework_submissions_graded_by_user_id",
            "ix_homework_submissions_tenant_id",
            "ix_homework_submissions_student_id",
            "ix_homework_submissions_lesson_id",
        ]:
            if _index_exists(conn, "homework_submissions", idx):
                op.drop_index(idx, table_name="homework_submissions")
        op.drop_table("homework_submissions")
