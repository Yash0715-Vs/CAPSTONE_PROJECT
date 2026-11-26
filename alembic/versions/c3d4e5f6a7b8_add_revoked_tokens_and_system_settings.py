"""add_revoked_tokens_and_system_settings

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-11-26 14:30:00.000000

"""
from typing import Sequence, Union
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Creates revoked_tokens and system_settings tables idempotently."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'revoked_tokens' not in existing_tables:
        op.create_table(
            'revoked_tokens',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('token_hash', sa.String(length=64), nullable=False),
            sa.Column('jti', sa.String(length=64), nullable=True),
            sa.Column('user_id', sa.String(length=50), nullable=True),
            sa.Column('expires_at', sa.DateTime(), nullable=True),
            sa.Column('revoked_at', sa.DateTime(), nullable=False, default=lambda: datetime.now(timezone.utc)),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('token_hash')
        )
        op.create_index(op.f('ix_revoked_tokens_token_hash'), 'revoked_tokens', ['token_hash'], unique=True)
        op.create_index(op.f('ix_revoked_tokens_jti'), 'revoked_tokens', ['jti'], unique=False)
        op.create_index(op.f('ix_revoked_tokens_user_id'), 'revoked_tokens', ['user_id'], unique=False)
        op.create_index(op.f('ix_revoked_tokens_expires_at'), 'revoked_tokens', ['expires_at'], unique=False)

    if 'system_settings' not in existing_tables:
        op.create_table(
            'system_settings',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('setting_key', sa.String(length=100), nullable=False),
            sa.Column('setting_value', sa.String(length=255), nullable=False),
            sa.Column('updated_by', sa.String(length=50), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=False, default=lambda: datetime.now(timezone.utc)),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('setting_key')
        )
        op.create_index(op.f('ix_system_settings_setting_key'), 'system_settings', ['setting_key'], unique=True)


def downgrade() -> None:
    """Drops revoked_tokens and system_settings tables if present."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if 'system_settings' in existing_tables:
        op.drop_table('system_settings')
    if 'revoked_tokens' in existing_tables:
        op.drop_table('revoked_tokens')
