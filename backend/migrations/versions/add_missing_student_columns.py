from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_missing_student_columns'
down_revision = 'ca79dc4ddda1'  # Updated to point to the merge migration
branch_labels = None
depends_on = None


def _col_exists(conn, table, column):
    """Return True if *column* exists in *table*, safe for PG and SQLite."""
    if conn.dialect.name == 'sqlite':
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


def _table_exists(conn, table):
    """Return True if *table* exists in the public schema."""
    if conn.dialect.name == 'sqlite':
        result = conn.execute(
            sa.text(f"SELECT 1 FROM sqlite_master WHERE type='table' AND name=:t"),
            {"t": table},
        ).fetchone()
        return result is not None
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :t"
        ),
        {"t": table},
    ).fetchone()
    return result is not None


def upgrade():
    conn = op.get_bind()
    if not _table_exists(conn, 'students'):
        return  # Nothing to add on a fresh schema; later migrations will create the table with these cols
    # Add missing columns to students table (guard each so re-runs are safe)
    new_cols = [
        ('standardized_test_scores', sa.Column('standardized_test_scores', sa.Text(), nullable=True)),
        ('secondary_contact_name', sa.Column('secondary_contact_name', sa.String(100), nullable=True)),
        ('secondary_contact_phone', sa.Column('secondary_contact_phone', sa.String(20), nullable=True)),
        ('secondary_contact_relationship', sa.Column('secondary_contact_relationship', sa.String(50), nullable=True)),
        ('individualized_education_plan', sa.Column('individualized_education_plan', sa.Boolean(), server_default='false', nullable=False)),
        ('iep_details', sa.Column('iep_details', sa.Text(), nullable=True)),
        ('student_email', sa.Column('student_email', sa.String(100), nullable=True)),
        ('library_card_number', sa.Column('library_card_number', sa.String(50), nullable=True)),
    ]
    for col_name, col_obj in new_cols:
        if not _col_exists(conn, 'students', col_name):
            op.add_column('students', col_obj)


def downgrade():
    conn = op.get_bind()
    if not _table_exists(conn, 'students'):
        return
    columns_to_remove = [
        'standardized_test_scores', 'secondary_contact_name', 'secondary_contact_phone',
        'secondary_contact_relationship', 'individualized_education_plan', 'iep_details',
        'student_email', 'library_card_number'
    ]
    for column in columns_to_remove:
        if _col_exists(conn, 'students', column):
            op.drop_column('students', column)