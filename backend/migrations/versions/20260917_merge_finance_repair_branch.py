"""Merge forward finance repair with published migration head.

Revision ID: 20260917_finance_repair_merge
Revises: 3800ed3fbba9, 20260730_student_fee_prereq

This revision intentionally performs no schema operations.

Deployment ordering is staged:

1. Apply 20260729_finance_drift_repair explicitly.
2. Apply 20260730_student_fee_prereq explicitly.
3. Apply the published migration branch through 3800ed3fbba9.
4. Apply this merge revision.

The explicit staging ensures normalized finance tables and student-fee
prerequisites exist before the published payment migration executes on
affected baseline databases.
"""

revision = "20260917_finance_repair_merge"
down_revision = (
    "3800ed3fbba9",
    "20260730_student_fee_prereq",
)
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
