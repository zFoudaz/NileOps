"""add bank_accounts table and card_issuance / guarantee_proof enums

Revision ID: a1b2c3d4e5f6
Revises: 6828eec91288
Create Date: 2026-11-21 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "6828eec91288"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE request_type ADD VALUE IF NOT EXISTS 'card_issuance'")
            op.execute("ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'guarantee_proof'")

    op.create_table(
        "bank_accounts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("request_id", sa.UUID(), nullable=True),
        sa.Column("account_number", sa.String(length=32), nullable=False),
        sa.Column("account_type", sa.String(length=50), nullable=False),
        sa.Column("holder_name", sa.String(length=255), nullable=False),
        sa.Column("national_id", sa.String(length=20), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["request_id"], ["requests.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id"),
    )
    op.create_index(op.f("ix_bank_accounts_user_id"), "bank_accounts", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_bank_accounts_account_number"), "bank_accounts", ["account_number"], unique=True
    )
    op.create_index(
        op.f("ix_bank_accounts_national_id"), "bank_accounts", ["national_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_bank_accounts_national_id"), table_name="bank_accounts")
    op.drop_index(op.f("ix_bank_accounts_account_number"), table_name="bank_accounts")
    op.drop_index(op.f("ix_bank_accounts_user_id"), table_name="bank_accounts")
    op.drop_table("bank_accounts")
