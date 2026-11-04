"""add_password_reset_columns_to_users

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-04 12:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Adds reset_token_hash and reset_token_expires_at to users table safely."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = [c['name'] for c in inspector.get_columns('users')]

    if 'reset_token_hash' not in existing_cols:
        op.add_column('users', sa.Column('reset_token_hash', sa.String(length=255), nullable=True))
        try:
            op.create_index(op.f('ix_users_reset_token_hash'), 'users', ['reset_token_hash'], unique=False)
        except Exception:
            pass

    if 'reset_token_expires_at' not in existing_cols:
        op.add_column('users', sa.Column('reset_token_expires_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Removes reset_token columns from users table."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = [c['name'] for c in inspector.get_columns('users')]

    if 'reset_token_expires_at' in existing_cols:
        op.drop_column('users', 'reset_token_expires_at')
    if 'reset_token_hash' in existing_cols:
        try:
            op.drop_index(op.f('ix_users_reset_token_hash'), table_name='users')
        except Exception:
            pass
        op.drop_column('users', 'reset_token_hash')
