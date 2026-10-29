"""add_user_status_and_invitation_fields

Revision ID: 4e70132c3cc1
Revises: 6f40731d0510
Create Date: 2026-10-29 17:27:54.705700

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e70132c3cc1'
down_revision: Union[str, Sequence[str], None] = '6f40731d0510'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('status', sa.String(length=30), nullable=False, server_default='ACTIVE'))
    op.add_column('users', sa.Column('invitation_token_hash', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('invitation_expires_at', sa.DateTime(), nullable=True))
    op.create_index(op.f('ix_users_invitation_token_hash'), 'users', ['invitation_token_hash'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_users_invitation_token_hash'), table_name='users')
    op.drop_column('users', 'invitation_expires_at')
    op.drop_column('users', 'invitation_token_hash')
    op.drop_column('users', 'status')

