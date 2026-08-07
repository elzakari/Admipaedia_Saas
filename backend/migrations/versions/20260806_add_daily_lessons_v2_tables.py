"""Add daily lessons v2 tables and lesson enhancements

Revision ID: 20260806_daily_lessons_v2
Revises: None
Create Date: 2026-08-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260806_daily_lessons_v2"
down_revision = "20260728_sync_rbac_detail_schema"
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
        return any(row[1] == column for row in result.fetchall())
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    ).fetchone()
    return result is not None


def _index_exists(conn, table, index_name):
    """Return True if *index_name* already exists on *table*.

    SQLite: PRAGMA index_list(table).  PostgreSQL: pg_indexes lookup by
    schemaname+indexname.  We keep the 3-argument form (matching the P2
    migration and common dialect-safe patterns used in the rest of the
    migrations directory) so that call sites are unambiguous.
    """
    if conn.dialect.name == "sqlite":
        result = conn.execute(sa.text(f"PRAGMA index_list('{table}')"))
        indexes = [row[1] for row in result.fetchall()]
        return index_name in indexes
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = :n"
        ),
        {"n": index_name},
    ).fetchone()
    return result is not None


def _fk_exists(conn, table, fk_name):
    """Return True if a pg foreign-key constraint with *fk_name* exists on *table*."""
    if conn.dialect.name == "sqlite":
        result = conn.execute(sa.text(f"PRAGMA foreign_key_list('{table}')"))
        names = [row[3] for row in result.fetchall()]
        return fk_name in names
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_type = 'FOREIGN KEY' AND constraint_name = :n"
        ),
        {"n": fk_name},
    ).fetchone()
    return result is not None


def _uq_exists(conn, table, constraint_name):
    """Return True if a unique constraint named *constraint_name* exists on *table*."""
    if conn.dialect.name == "sqlite":
        result = conn.execute(sa.text(f"PRAGMA index_list('{table}')"))
        names = [row[1] for row in result.fetchall() if row[2] == 1]
        return constraint_name in names
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.table_constraints "
            "WHERE constraint_type = 'UNIQUE' AND constraint_name = :n"
        ),
        {"n": constraint_name},
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
    # 1. Enhance existing lessons table (additive-only: new columns)
    # ------------------------------------------------------------------
    if _table_exists(conn, "lessons"):

        new_lessons_cols = [
            ("tenant_id", _uuid_type(conn), True),
            ("subject_id", sa.Integer(), True),
            ("period_number", sa.Integer(), True),
            ("start_time", sa.Time(), True),
            ("end_time", sa.Time(), True),
            ("visibility", sa.String(length=30), False, "class_only"),
            ("homework_due_date", sa.Date(), True),
            ("engagement_seen_count", sa.Integer(), False, 0),
            ("engagement_ack_count", sa.Integer(), False, 0),
        ]

        json_cols = [
            "strand",
            "objectives",
            "classwork",
            "homework",
            "assessment",
        ]

        for col_info in new_lessons_cols:
            col_name = col_info[0]
            if not _column_exists(conn, "lessons", col_name):
                col_type = col_info[1]
                nullable = col_info[2]
                server_default = col_info[3] if len(col_info) > 3 else None
                kwargs = {"nullable": nullable}
                if server_default is not None:
                    if isinstance(server_default, int):
                        kwargs["server_default"] = sa.text(str(server_default))
                    else:
                        kwargs["server_default"] = sa.text(
                            f"'{server_default}'"
                        )
                op.add_column("lessons", sa.Column(col_name, col_type, **kwargs))

        for jcol in json_cols:
            if not _column_exists(conn, "lessons", jcol):
                col_type = (
                    postgresql.JSONB(astext_type=sa.Text())
                    if is_pg
                    else sa.JSON()
                )
                default_text = "'[]'::jsonb" if is_pg and jcol in ("strand", "objectives") else "'{}'::jsonb" if is_pg else None
                if is_pg:
                    op.add_column(
                        "lessons",
                        sa.Column(
                            jcol,
                            col_type,
                            nullable=True,
                            server_default=sa.text(default_text),
                        ),
                    )
                else:
                    op.add_column("lessons", sa.Column(jcol, col_type, nullable=True))

        if _column_exists(conn, "lessons", "tenant_id") and not _index_exists(conn, "lessons", "ix_lessons_tenant_id"):
            op.create_index(
                "ix_lessons_tenant_id", "lessons", ["tenant_id"]
            )
        if _column_exists(conn, "lessons", "subject_id") and _table_exists(conn, "subjects") and is_pg:
            if not _fk_exists(conn, "lessons", "fk_lessons_subject_id"):
                op.create_foreign_key(
                    "fk_lessons_subject_id",
                    "lessons",
                    "subjects",
                    ["subject_id"],
                    ["id"],
                    ondelete="SET NULL",
                )
        if _column_exists(conn, "lessons", "tenant_id") and _table_exists(conn, "tenants") and is_pg:
            if not _fk_exists(conn, "lessons", "fk_lessons_tenant_id"):
                op.create_foreign_key(
                    "fk_lessons_tenant_id",
                    "lessons",
                    "tenants",
                    ["tenant_id"],
                    ["id"],
                    ondelete="CASCADE",
                )

        if _table_exists(conn, "classes") and _table_exists(conn, "lessons"):
            if is_pg:
                conn.execute(
                    sa.text(
                        "UPDATE lessons l "
                        "SET tenant_id = COALESCE(l.tenant_id, c.tenant_id) "
                        "FROM classes c WHERE l.class_id = c.id AND l.tenant_id IS NULL"
                    )
                )
            else:
                conn.execute(
                    sa.text(
                        "UPDATE lessons SET tenant_id = "
                        "(SELECT classes.tenant_id FROM classes WHERE classes.id = lessons.class_id) "
                        "WHERE tenant_id IS NULL AND class_id IS NOT NULL"
                    )
                )

        # Backfill lessons.subject_id for historical lessons where we can
        # make a DETERMINISTIC choice: a class has EXACTLY one distinct
        # subject assignment in class_subjects.  We intentionally avoid any
        # "pick one subject" behaviour when multiple mappings exist because
        # that would silently mis-attribute historical lessons to a
        # guessed subject.
        #
        # PostgreSQL-only (class_subjects is the join table name used by
        # the Postgres deployment) and guarded behind a table_exists check
        # so tenants that disabled class-subject mapping never error.
        if (
            is_pg
            and _table_exists(conn, "lessons")
            and _table_exists(conn, "class_subjects")
            and _column_exists(conn, "lessons", "subject_id")
            and _column_exists(conn, "lessons", "class_id")
        ):
            conn.execute(
                sa.text(
                    "UPDATE lessons AS l "
                    "SET subject_id = single_subject.subject_id "
                    "FROM ( "
                    "    SELECT "
                    "        class_id, "
                    "        MIN(subject_id) AS subject_id "
                    "    FROM class_subjects "
                    "    GROUP BY class_id "
                    "    HAVING COUNT(DISTINCT subject_id) = 1 "
                    ") AS single_subject "
                    "WHERE l.class_id = single_subject.class_id "
                    "  AND l.subject_id IS NULL"
                )
            )

    # ------------------------------------------------------------------
    # 2. Create lesson_broadcasts table
    # ------------------------------------------------------------------
    if not _table_exists(conn, "lesson_broadcasts"):
        op.create_table(
            "lesson_broadcasts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("lesson_id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", _uuid_type(conn), nullable=False),
            sa.Column("parent_broadcast_id", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=30), nullable=False, server_default=sa.text("'scheduled'")),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("ended_at", sa.DateTime(), nullable=True),
            sa.Column("peak_viewers", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("scheduled_start", sa.DateTime(), nullable=True),
            sa.Column("scheduled_end", sa.DateTime(), nullable=True),
            sa.Column("stream_url", sa.String(length=512), nullable=True),
            sa.Column("recording_url", sa.String(length=512), nullable=True),
            sa.Column("viewer_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("is_rebroadcast", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("rebroadcast_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column(
                "broadcast_metadata",
                postgresql.JSONB(astext_type=sa.Text()) if is_pg else sa.JSON(),
                nullable=True,
                server_default=sa.text("'{}'::jsonb") if is_pg else None,
            ),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index(
            "ix_lesson_broadcasts_lesson_id", "lesson_broadcasts", ["lesson_id"]
        )
        op.create_index(
            "ix_lesson_broadcasts_tenant_id", "lesson_broadcasts", ["tenant_id"]
        )
        op.create_index(
            "ix_lesson_broadcasts_status", "lesson_broadcasts", ["status"]
        )
        if is_pg:
            op.create_foreign_key(
                "fk_lesson_broadcasts_lesson",
                "lesson_broadcasts",
                "lessons",
                ["lesson_id"],
                ["id"],
                ondelete="CASCADE",
            )
            op.create_foreign_key(
                "fk_lesson_broadcasts_tenant",
                "lesson_broadcasts",
                "tenants",
                ["tenant_id"],
                ["id"],
                ondelete="CASCADE",
            )
            op.create_foreign_key(
                "fk_lesson_broadcasts_parent",
                "lesson_broadcasts",
                "lesson_broadcasts",
                ["parent_broadcast_id"],
                ["id"],
                ondelete="SET NULL",
            )

    # ------------------------------------------------------------------
    # 3. Create lesson_attachments table
    # ------------------------------------------------------------------
    if not _table_exists(conn, "lesson_attachments"):
        op.create_table(
            "lesson_attachments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("lesson_id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", _uuid_type(conn), nullable=False),
            sa.Column("storage_key", sa.String(length=512), nullable=True),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("mime_type", sa.String(length=100), nullable=True),
            sa.Column("size", sa.Integer(), nullable=True),
            sa.Column("link_url", sa.String(length=512), nullable=True),
            sa.Column(
                "attachment_type",
                sa.String(length=50),
                nullable=False,
                server_default=sa.text("'file'"),
            ),
            sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("uploader_id", sa.Integer(), nullable=True),
            sa.Column(
                "attachment_metadata",
                postgresql.JSONB(astext_type=sa.Text()) if is_pg else sa.JSON(),
                nullable=True,
                server_default=sa.text("'{}'::jsonb") if is_pg else None,
            ),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index(
            "ix_lesson_attachments_lesson_id", "lesson_attachments", ["lesson_id"]
        )
        op.create_index(
            "ix_lesson_attachments_tenant_id", "lesson_attachments", ["tenant_id"]
        )
        if is_pg:
            op.create_foreign_key(
                "fk_lesson_attachments_lesson",
                "lesson_attachments",
                "lessons",
                ["lesson_id"],
                ["id"],
                ondelete="CASCADE",
            )
            op.create_foreign_key(
                "fk_lesson_attachments_tenant",
                "lesson_attachments",
                "tenants",
                ["tenant_id"],
                ["id"],
                ondelete="CASCADE",
            )
            op.create_foreign_key(
                "fk_lesson_attachments_uploader",
                "lesson_attachments",
                "users",
                ["uploader_id"],
                ["id"],
                ondelete="SET NULL",
            )

    # ------------------------------------------------------------------
    # 4. Create lesson_acknowledgements table
    # ------------------------------------------------------------------
    if not _table_exists(conn, "lesson_acknowledgements"):
        op.create_table(
            "lesson_acknowledgements",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("lesson_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", _uuid_type(conn), nullable=False),
            sa.Column("role", sa.String(length=30), nullable=False),
            sa.Column("acknowledged_at", sa.DateTime(), nullable=True),
            sa.Column("seen_at", sa.DateTime(), nullable=True),
            sa.Column(
                "is_acknowledged",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column(
                "is_seen",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column("acknowledgement_note", sa.Text(), nullable=True),
            sa.Column(
                "ack_metadata",
                postgresql.JSONB(astext_type=sa.Text()) if is_pg else sa.JSON(),
                nullable=True,
                server_default=sa.text("'{}'::jsonb") if is_pg else None,
            ),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index(
            "ix_lesson_acknowledgements_lesson_id",
            "lesson_acknowledgements",
            ["lesson_id"],
        )
        op.create_index(
            "ix_lesson_acknowledgements_user_id",
            "lesson_acknowledgements",
            ["user_id"],
        )
        op.create_index(
            "ix_lesson_acknowledgements_tenant_id",
            "lesson_acknowledgements",
            ["tenant_id"],
        )
        if is_pg:
            op.create_unique_constraint(
                "uq_lesson_ack_lesson_user_role_tenant",
                "lesson_acknowledgements",
                ["lesson_id", "user_id", "role", "tenant_id"],
            )
            op.create_foreign_key(
                "fk_lesson_ack_lesson",
                "lesson_acknowledgements",
                "lessons",
                ["lesson_id"],
                ["id"],
                ondelete="CASCADE",
            )
            op.create_foreign_key(
                "fk_lesson_ack_user",
                "lesson_acknowledgements",
                "users",
                ["user_id"],
                ["id"],
                ondelete="CASCADE",
            )
            op.create_foreign_key(
                "fk_lesson_ack_tenant",
                "lesson_acknowledgements",
                "tenants",
                ["tenant_id"],
                ["id"],
                ondelete="CASCADE",
            )

    # ------------------------------------------------------------------
    # 5. Create lesson_comments table
    # ------------------------------------------------------------------
    if not _table_exists(conn, "lesson_comments"):
        op.create_table(
            "lesson_comments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("lesson_id", sa.Integer(), nullable=False),
            sa.Column("author_id", sa.Integer(), nullable=False),
            sa.Column("tenant_id", _uuid_type(conn), nullable=False),
            sa.Column("parent_comment_id", sa.Integer(), nullable=True),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column(
                "visibility",
                sa.String(length=30),
                nullable=False,
                server_default=sa.text("'class'"),
            ),
            sa.Column(
                "requires_approval",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true"),
            ),
            sa.Column(
                "is_approved",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column("approved_by_id", sa.Integer(), nullable=True),
            sa.Column("approved_at", sa.DateTime(), nullable=True),
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column("deleted_by_id", sa.Integer(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column("edited_at", sa.DateTime(), nullable=True),
            sa.Column("edit_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_by_ip", sa.String(length=45), nullable=True),
            sa.Column("created_by_user_agent", sa.Text(), nullable=True),
            sa.Column(
                "comment_metadata",
                postgresql.JSONB(astext_type=sa.Text()) if is_pg else sa.JSON(),
                nullable=True,
                server_default=sa.text("'{}'::jsonb") if is_pg else None,
            ),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index(
            "ix_lesson_comments_lesson_id", "lesson_comments", ["lesson_id"]
        )
        op.create_index(
            "ix_lesson_comments_author_id", "lesson_comments", ["author_id"]
        )
        op.create_index(
            "ix_lesson_comments_tenant_id", "lesson_comments", ["tenant_id"]
        )
        op.create_index(
            "ix_lesson_comments_parent_comment_id",
            "lesson_comments",
            ["parent_comment_id"],
        )
        if is_pg:
            op.create_foreign_key(
                "fk_lesson_comments_lesson",
                "lesson_comments",
                "lessons",
                ["lesson_id"],
                ["id"],
                ondelete="CASCADE",
            )
            op.create_foreign_key(
                "fk_lesson_comments_author",
                "lesson_comments",
                "users",
                ["author_id"],
                ["id"],
                ondelete="CASCADE",
            )
            op.create_foreign_key(
                "fk_lesson_comments_tenant",
                "lesson_comments",
                "tenants",
                ["tenant_id"],
                ["id"],
                ondelete="CASCADE",
            )
            op.create_foreign_key(
                "fk_lesson_comments_parent",
                "lesson_comments",
                "lesson_comments",
                ["parent_comment_id"],
                ["id"],
                ondelete="SET NULL",
            )
            op.create_foreign_key(
                "fk_lesson_comments_approved_by",
                "lesson_comments",
                "users",
                ["approved_by_id"],
                ["id"],
                ondelete="SET NULL",
            )
            op.create_foreign_key(
                "fk_lesson_comments_deleted_by",
                "lesson_comments",
                "users",
                ["deleted_by_id"],
                ["id"],
                ondelete="SET NULL",
            )


def downgrade():
    """Reverse the upgrade: drop tables in creation order, then the
    additive-only columns/indexes/fks on the lessons table.

    All objects are wrapped in table_exists/column_exists/index_exists
    guards so a partial upgrade (e.g. upgrade() failed after creating
    only the lessons_attachments table) can be safely rolled back to
    the pre-migration state without crashing on missing objects.
    """
    conn = op.get_bind()
    is_pg = conn.dialect.name == "postgresql"

    # Drop tables in REVERSE creation order (because of circular FK refs
    # lesson_comments -> lesson_comments parent; lesson_broadcasts ->
    # lesson_broadcasts parent; etc.)
    for tbl in (
        "lesson_comments",
        "lesson_acknowledgements",
        "lesson_attachments",
        "lesson_broadcasts",
    ):
        if _table_exists(conn, tbl):
            op.drop_table(tbl)

    # Reverse: remove fks first, then indexes, then columns.
    # We drop FKs + ix_lessons_tenant_id unconditionally on ANY dialect (not
    # just Postgres) because SQLAlchemy's SQLite batch_alter_table faithfully
    # recreates existing indexes on the new table;  if tenant_id has been
    # dropped in a batch, the index recreation errors with "no such column:
    # tenant_id".  Guards (_fk_exists / _index_exists) stay active so missing
    # objects simply skip.
    if _table_exists(conn, "lessons"):
        # NOTE: SQLite does not support DROP CONSTRAINT, but Alembic will
        # emit a batch_alter_table under the hood for dialects that can't do
        # it natively IF we use with_kwargs; here we let the no-op
        # _fk_exists guard skip for dialects that don't support named FK
        # lookup reliably.
        for fk in (
            "fk_lessons_tenant_id",
            "fk_lessons_subject_id",
        ):
            if _fk_exists(conn, "lessons", fk):
                op.drop_constraint(fk, "lessons", type_="foreignkey")

        if _index_exists(conn, "lessons", "ix_lessons_tenant_id"):
            op.drop_index("ix_lessons_tenant_id", table_name="lessons")

        if is_pg:
            for jcol in (
                "assessment",
                "homework",
                "classwork",
                "objectives",
                "strand",
            ):
                if _column_exists(conn, "lessons", jcol):
                    op.drop_column("lessons", jcol)
            for col_info in reversed(
                [
                    ("engagement_ack_count",),
                    ("engagement_seen_count",),
                    ("homework_due_date",),
                    ("visibility",),
                    ("end_time",),
                    ("start_time",),
                    ("period_number",),
                    ("subject_id",),
                    ("tenant_id",),
                ]
            ):
                col_name = col_info[0]
                if _column_exists(conn, "lessons", col_name):
                    op.drop_column("lessons", col_name)
        else:
            for jcol in (
                "assessment",
                "homework",
                "classwork",
                "objectives",
                "strand",
            ):
                if _column_exists(conn, "lessons", jcol):
                    with op.batch_alter_table("lessons", schema=None) as batch_op:
                        batch_op.drop_column(jcol)
            for col_info in reversed(
                [
                    ("engagement_ack_count",),
                    ("engagement_seen_count",),
                    ("homework_due_date",),
                    ("visibility",),
                    ("end_time",),
                    ("start_time",),
                    ("period_number",),
                    ("subject_id",),
                    ("tenant_id",),
                ]
            ):
                col_name = col_info[0]
                if _column_exists(conn, "lessons", col_name):
                    with op.batch_alter_table("lessons", schema=None) as batch_op:
                        batch_op.drop_column(col_name)
