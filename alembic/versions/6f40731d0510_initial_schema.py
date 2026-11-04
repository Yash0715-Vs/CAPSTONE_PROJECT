"""Initial schema

Revision ID: 6f40731d0510
Revises: 
Create Date: 2026-10-27 15:43:22.152069

"""
from typing import Sequence, Union
from datetime import datetime, date

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f40731d0510'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Creates the 8 core application tables idempotently."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # 1. users table
    if 'users' not in existing_tables:
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('user_id', sa.String(length=50), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('email', sa.String(length=100), nullable=False),
            sa.Column('hashed_password', sa.String(length=255), nullable=False),
            sa.Column('role', sa.String(length=30), nullable=False),
            sa.Column('department', sa.String(length=100), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, default=datetime.utcnow),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id'),
            sa.UniqueConstraint('email')
        )
        op.create_index(op.f('ix_users_user_id'), 'users', ['user_id'], unique=True)
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. assets table
    if 'assets' not in existing_tables:
        op.create_table(
            'assets',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('asset_id', sa.String(length=50), nullable=False),
            sa.Column('type', sa.String(length=50), nullable=False),
            sa.Column('brand', sa.String(length=100), nullable=False),
            sa.Column('model', sa.String(length=100), nullable=False),
            sa.Column('serial_number', sa.String(length=100), nullable=False),
            sa.Column('purchase_date', sa.Date(), nullable=False, default=date.today),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='AVAILABLE'),
            sa.Column('assigned_to', sa.String(length=50), nullable=True),
            sa.Column('specs_json', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, default=datetime.utcnow),
            sa.ForeignKeyConstraint(['assigned_to'], ['users.user_id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('asset_id'),
            sa.UniqueConstraint('serial_number')
        )
        op.create_index(op.f('ix_assets_asset_id'), 'assets', ['asset_id'], unique=True)
        op.create_index(op.f('ix_assets_serial_number'), 'assets', ['serial_number'], unique=True)

    # 3. asset_assignments table
    if 'asset_assignments' not in existing_tables:
        op.create_table(
            'asset_assignments',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('asset_id', sa.String(length=50), nullable=False),
            sa.Column('employee_id', sa.String(length=50), nullable=False),
            sa.Column('assigned_date', sa.DateTime(), nullable=False, default=datetime.utcnow),
            sa.Column('returned_date', sa.DateTime(), nullable=True),
            sa.Column('notes', sa.String(length=255), nullable=True),
            sa.ForeignKeyConstraint(['asset_id'], ['assets.asset_id']),
            sa.ForeignKeyConstraint(['employee_id'], ['users.user_id']),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_asset_assignments_asset_id'), 'asset_assignments', ['asset_id'], unique=False)
        op.create_index(op.f('ix_asset_assignments_employee_id'), 'asset_assignments', ['employee_id'], unique=False)

    # 4. tickets table
    if 'tickets' not in existing_tables:
        op.create_table(
            'tickets',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('ticket_id', sa.String(length=50), nullable=False),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('category', sa.String(length=50), nullable=False),
            sa.Column('priority', sa.String(length=30), nullable=False),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='OPEN'),
            sa.Column('created_by', sa.String(length=50), nullable=False),
            sa.Column('assigned_to', sa.String(length=50), nullable=True),
            sa.Column('asset_id', sa.String(length=50), nullable=True),
            sa.Column('resolution', sa.Text(), nullable=True),
            sa.Column('created_date', sa.DateTime(), nullable=False, default=datetime.utcnow),
            sa.Column('closed_date', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['assigned_to'], ['users.user_id']),
            sa.ForeignKeyConstraint(['asset_id'], ['assets.asset_id']),
            sa.ForeignKeyConstraint(['created_by'], ['users.user_id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('ticket_id')
        )
        op.create_index(op.f('ix_tickets_ticket_id'), 'tickets', ['ticket_id'], unique=True)
        op.create_index(op.f('ix_tickets_created_by'), 'tickets', ['created_by'], unique=False)
        op.create_index(op.f('ix_tickets_assigned_to'), 'tickets', ['assigned_to'], unique=False)
        op.create_index(op.f('ix_tickets_asset_id'), 'tickets', ['asset_id'], unique=False)

    # 5. ticket_history table
    if 'ticket_history' not in existing_tables:
        op.create_table(
            'ticket_history',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('ticket_id', sa.String(length=50), nullable=False),
            sa.Column('changed_by', sa.String(length=50), nullable=False),
            sa.Column('old_status', sa.String(length=30), nullable=False),
            sa.Column('new_status', sa.String(length=30), nullable=False),
            sa.Column('previous_assignee', sa.String(length=50), nullable=True),
            sa.Column('new_assignee', sa.String(length=50), nullable=True),
            sa.Column('assignment_method', sa.String(length=30), nullable=True),
            sa.Column('comment', sa.Text(), nullable=True),
            sa.Column('timestamp', sa.DateTime(), nullable=False, default=datetime.utcnow),
            sa.ForeignKeyConstraint(['ticket_id'], ['tickets.ticket_id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_ticket_history_ticket_id'), 'ticket_history', ['ticket_id'], unique=False)

    # 6. equipment_requests table
    if 'equipment_requests' not in existing_tables:
        op.create_table(
            'equipment_requests',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('request_id', sa.String(length=50), nullable=False),
            sa.Column('requested_by', sa.String(length=50), nullable=False),
            sa.Column('equipment_type', sa.String(length=50), nullable=False),
            sa.Column('reason', sa.Text(), nullable=False),
            sa.Column('urgency', sa.String(length=30), nullable=False, server_default='MEDIUM'),
            sa.Column('status', sa.String(length=30), nullable=False, server_default='PENDING'),
            sa.Column('admin_notes', sa.Text(), nullable=True),
            sa.Column('employee_notes', sa.Text(), nullable=True),
            sa.Column('provisioned_asset_id', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, default=datetime.utcnow),
            sa.Column('updated_at', sa.DateTime(), nullable=False, default=datetime.utcnow),
            sa.ForeignKeyConstraint(['provisioned_asset_id'], ['assets.asset_id']),
            sa.ForeignKeyConstraint(['requested_by'], ['users.user_id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('request_id')
        )
        op.create_index(op.f('ix_equipment_requests_request_id'), 'equipment_requests', ['request_id'], unique=True)
        op.create_index(op.f('ix_equipment_requests_requested_by'), 'equipment_requests', ['requested_by'], unique=False)

    # 7. equipment_request_history table
    if 'equipment_request_history' not in existing_tables:
        op.create_table(
            'equipment_request_history',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('request_id', sa.String(length=50), nullable=False),
            sa.Column('actor', sa.String(length=50), nullable=False),
            sa.Column('action', sa.String(length=50), nullable=False),
            sa.Column('old_status', sa.String(length=30), nullable=True),
            sa.Column('new_status', sa.String(length=30), nullable=False),
            sa.Column('asset_id', sa.String(length=50), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('timestamp', sa.DateTime(), nullable=False, default=datetime.utcnow),
            sa.ForeignKeyConstraint(['request_id'], ['equipment_requests.request_id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_equipment_request_history_request_id'), 'equipment_request_history', ['request_id'], unique=False)

    # 8. activity_logs table
    if 'activity_logs' not in existing_tables:
        op.create_table(
            'activity_logs',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('timestamp', sa.DateTime(), nullable=False, default=datetime.utcnow),
            sa.Column('action', sa.String(length=50), nullable=False),
            sa.Column('user_id', sa.String(length=50), nullable=True),
            sa.Column('details', sa.String(length=255), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_activity_logs_action'), 'activity_logs', ['action'], unique=False)


def downgrade() -> None:
    """Drop all tables in reverse dependency order."""
    op.drop_table('activity_logs')
    op.drop_table('equipment_request_history')
    op.drop_table('equipment_requests')
    op.drop_table('ticket_history')
    op.drop_table('tickets')
    op.drop_table('asset_assignments')
    op.drop_table('assets')
    op.drop_table('users')
