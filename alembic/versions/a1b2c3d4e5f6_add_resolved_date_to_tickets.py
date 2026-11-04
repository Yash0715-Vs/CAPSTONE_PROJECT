"""add_resolved_date_to_tickets

Revision ID: a1b2c3d4e5f6
Revises: 4e70132c3cc1
Create Date: 2026-11-04 11:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '4e70132c3cc1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Adds resolved_date to tickets table safely."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = [c['name'] for c in inspector.get_columns('tickets')]

    if 'resolved_date' not in existing_cols:
        op.add_column('tickets', sa.Column('resolved_date', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Removes resolved_date from tickets table."""
    op.drop_column('tickets', 'resolved_date')
