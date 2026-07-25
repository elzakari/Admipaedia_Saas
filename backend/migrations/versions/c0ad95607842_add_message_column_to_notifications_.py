"""Add message column to notifications table

Revision ID: c0ad95607842
Revises: 00563039bd57
Create Date: 2025-06-12 20:43:38.543837

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c0ad95607842'
down_revision = '00563039bd57'
branch_labels = None
depends_on = None


def _table_exists(connection, table_name):
    result = connection.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = current_schema() AND table_name = :table_name"
        ),
        {"table_name": table_name},
    )
    return result.fetchone() is not None


def _column_exists(connection, table_name, column_name):
    result = connection.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = current_schema() "
            "AND table_name = :table_name "
            "AND column_name = :column_name"
        ),
        {"table_name": table_name, "column_name": column_name},
    )
    return result.fetchone() is not None


def _get_column_metadata(connection, table_name, column_name):
    result = connection.execute(
        sa.text(
            "SELECT data_type, character_maximum_length "
            "FROM information_schema.columns "
            "WHERE table_schema = current_schema() "
            "AND table_name = :table_name "
            "AND column_name = :column_name"
        ),
        {"table_name": table_name, "column_name": column_name},
    )
    row = result.fetchone()
    if not row:
        return None
    return {"data_type": row[0], "max_length": row[1]}


def upgrade():
    conn = op.get_bind()

    if not _table_exists(conn, 'analytics'):
        op.create_table(
            'analytics',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('metric_type', sa.String(length=100), nullable=False),
            sa.Column('metric_name', sa.String(length=200), nullable=False),
            sa.Column('metric_value', sa.Float(), nullable=False),
            sa.Column('entity_type', sa.String(length=50), nullable=True),
            sa.Column('entity_id', sa.String(length=36), nullable=True),
            sa.Column('period_start', sa.DateTime(), nullable=True),
            sa.Column('period_end', sa.DateTime(), nullable=True),
            sa.Column('additional_data', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )

    if _table_exists(conn, 'notifications'):
        legacy_notification_columns = ('description', 'sender', 'color', 'channel', 'priority')
        has_legacy_notification_shape = any(
            _column_exists(conn, 'notifications', column_name)
            for column_name in legacy_notification_columns
        )
        id_metadata = _get_column_metadata(conn, 'notifications', 'id')
        title_metadata = _get_column_metadata(conn, 'notifications', 'title')
        type_metadata = _get_column_metadata(conn, 'notifications', 'type')

        with op.batch_alter_table('notifications', schema=None) as batch_op:
            if not _column_exists(conn, 'notifications', 'message'):
                batch_op.add_column(sa.Column('message', sa.Text(), nullable=False))
            if (
                has_legacy_notification_shape
                and id_metadata
                and id_metadata["data_type"] in ('integer', 'smallint', 'bigint')
            ):
                batch_op.alter_column(
                    'id',
                    existing_type=sa.INTEGER(),
                    type_=sa.String(length=36),
                    existing_nullable=False,
                )
            if (
                has_legacy_notification_shape
                and title_metadata
                and title_metadata["max_length"] != 100
            ):
                batch_op.alter_column(
                    'title',
                    existing_type=sa.VARCHAR(length=255),
                    type_=sa.String(length=100),
                    existing_nullable=False,
                )
            if (
                has_legacy_notification_shape
                and type_metadata
                and type_metadata["max_length"] != 20
            ):
                batch_op.alter_column(
                    'type',
                    existing_type=sa.VARCHAR(length=50),
                    type_=sa.String(length=20),
                    existing_nullable=False,
                )
            for legacy_column in legacy_notification_columns:
                if _column_exists(conn, 'notifications', legacy_column):
                    batch_op.drop_column(legacy_column)

    if _table_exists(conn, 'students'):
        student_columns = [
            sa.Column('surname', sa.String(length=100), nullable=True),
            sa.Column('place_of_birth', sa.String(length=255), nullable=True),
            sa.Column('religious_denomination', sa.String(length=100), nullable=True),
            sa.Column('telephone', sa.String(length=20), nullable=True),
            sa.Column('whatsapp', sa.String(length=20), nullable=True),
            sa.Column('postal_address', sa.String(length=255), nullable=True),
            sa.Column('digital_address', sa.String(length=100), nullable=True),
            sa.Column('city', sa.String(length=100), nullable=True),
            sa.Column('country', sa.String(length=100), nullable=True),
            sa.Column('residential_address', sa.String(length=255), nullable=True),
            sa.Column('local_landmark', sa.String(length=255), nullable=True),
            sa.Column('special_circumstance', sa.Text(), nullable=True),
            sa.Column('allergies', sa.Text(), nullable=True),
            sa.Column('medication', sa.Text(), nullable=True),
            sa.Column('physician_name', sa.String(length=100), nullable=True),
            sa.Column('physician_phone', sa.String(length=20), nullable=True),
            sa.Column('previous_school', sa.String(length=255), nullable=True),
            sa.Column('previous_class', sa.String(length=50), nullable=True),
            sa.Column('previous_team', sa.String(length=100), nullable=True),
            sa.Column('previous_year', sa.String(length=10), nullable=True),
            sa.Column('father_name', sa.String(length=100), nullable=True),
            sa.Column('father_contact', sa.String(length=20), nullable=True),
            sa.Column('father_address', sa.String(length=255), nullable=True),
            sa.Column('father_email', sa.String(length=100), nullable=True),
            sa.Column('father_profession', sa.String(length=100), nullable=True),
            sa.Column('father_workplace', sa.String(length=255), nullable=True),
            sa.Column('mother_name', sa.String(length=100), nullable=True),
            sa.Column('mother_contact', sa.String(length=20), nullable=True),
            sa.Column('mother_address', sa.String(length=255), nullable=True),
            sa.Column('mother_profession', sa.String(length=100), nullable=True),
            sa.Column('mother_workplace', sa.String(length=255), nullable=True),
            sa.Column('mother_email', sa.String(length=100), nullable=True),
        ]
        with op.batch_alter_table('students', schema=None) as batch_op:
            for column in student_columns:
                if not _column_exists(conn, 'students', column.name):
                    batch_op.add_column(column)


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_column('mother_email')
        batch_op.drop_column('mother_workplace')
        batch_op.drop_column('mother_profession')
        batch_op.drop_column('mother_address')
        batch_op.drop_column('mother_contact')
        batch_op.drop_column('mother_name')
        batch_op.drop_column('father_workplace')
        batch_op.drop_column('father_profession')
        batch_op.drop_column('father_email')
        batch_op.drop_column('father_address')
        batch_op.drop_column('father_contact')
        batch_op.drop_column('father_name')
        batch_op.drop_column('previous_year')
        batch_op.drop_column('previous_team')
        batch_op.drop_column('previous_class')
        batch_op.drop_column('previous_school')
        batch_op.drop_column('physician_phone')
        batch_op.drop_column('physician_name')
        batch_op.drop_column('medication')
        batch_op.drop_column('allergies')
        batch_op.drop_column('special_circumstance')
        batch_op.drop_column('local_landmark')
        batch_op.drop_column('residential_address')
        batch_op.drop_column('country')
        batch_op.drop_column('city')
        batch_op.drop_column('digital_address')
        batch_op.drop_column('postal_address')
        batch_op.drop_column('whatsapp')
        batch_op.drop_column('telephone')
        batch_op.drop_column('religious_denomination')
        batch_op.drop_column('place_of_birth')
        batch_op.drop_column('surname')

    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.add_column(sa.Column('priority', sa.VARCHAR(length=20), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('channel', sa.VARCHAR(length=50), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('color', sa.VARCHAR(length=50), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('sender', sa.VARCHAR(length=100), autoincrement=False, nullable=True))
        batch_op.add_column(sa.Column('description', sa.TEXT(), autoincrement=False, nullable=False))
        batch_op.alter_column('type',
               existing_type=sa.String(length=20),
               type_=sa.VARCHAR(length=50),
               existing_nullable=False)
        batch_op.alter_column('title',
               existing_type=sa.String(length=100),
               type_=sa.VARCHAR(length=255),
               existing_nullable=False)
        batch_op.alter_column('id',
               existing_type=sa.String(length=36),
               type_=sa.INTEGER(),
               existing_nullable=False)
        batch_op.drop_column('message')

    op.drop_table('analytics')
    # ### end Alembic commands ###
