#!/usr/bin/env python3
"""
PostgreSQL transaction and data integrity verification.
"""

from app import create_app
from app.extensions import db
from app.models.user import User
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text


def run_transaction_tests():
    app = create_app()
    with app.app_context():
        print("=== Transaction & Integrity Tests ===")

        # Ensure tables exist
        db.create_all()

        # 1) Simple transaction rollback
        print("\nTest 1: Transaction rollback")
        try:
            with db.session.begin():
                temp = User(username='temp_tx_user', email='temp_tx@example.com')
                temp.set_password_hash('Password123!')
                db.session.add(temp)
                # Force rollback by raising
                raise RuntimeError("Force rollback for test")
        except RuntimeError:
            pass
        finally:
            # Ensure session is clean for subsequent tests
            db.session.rollback()

        exists = User.query.filter_by(email='temp_tx@example.com').first()
        if exists is None:
            print("✓ Rollback succeeded; no temp user persisted")
        else:
            print("✗ Rollback failed; temp user exists")

        # 2) Commit and verify persistence
        print("\nTest 2: Commit persistence")
        temp2 = User(username='temp_commit_user', email='temp_commit@example.com')
        temp2.set_password_hash('Password123!')
        db.session.add(temp2)
        db.session.commit()

        persisted = User.query.filter_by(email='temp_commit@example.com').first()
        if persisted is not None:
            print("✓ Commit succeeded; user persisted")
        else:
            print("✗ Commit failed; user not found")

        # 3) Unique constraint enforcement (duplicate email)
        print("\nTest 3: Unique constraint enforcement on email")
        try:
            dup = User(username='dup_user', email='temp_commit@example.com')
            dup.set_password_hash('Password123!')
            db.session.add(dup)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            print("✓ IntegrityError raised for duplicate email; uniqueness enforced")
        else:
            print("✗ Duplicate email inserted without error")

        # 4) Simple query execution check via SQLAlchemy and raw SQL
        print("\nTest 4: Query execution checks")
        count = User.query.count()
        print(f"✓ SQLAlchemy query count returned: {count}")

        with db.engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM users"))
            raw_count = result.scalar_one()
            print(f"✓ Raw SQL count returned: {raw_count}")

        print("\n✓ Transaction & integrity tests completed")


if __name__ == '__main__':
    run_transaction_tests()
