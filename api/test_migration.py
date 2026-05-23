#!/usr/bin/env python3
"""Test database migration without running it"""
import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(__file__))

print("Testing Alembic configuration...")

# Test 1: Check if required modules can be imported
try:
    from alembic import config
    from alembic.script import ScriptDirectory
    print("✓ Alembic imports successful")
except ImportError as e:
    print(f"✗ Alembic import failed: {e}")
    print("  Run: pip install alembic sqlalchemy asyncpg")
    sys.exit(1)

# Test 2: Check migration file
try:
    with open('alembic/versions/20250521_initial_schema.py') as f:
        content = f.read()
        if 'CREATE EXTENSION IF NOT EXISTS vector' in content:
            print("✓ PGVector extension found in migration")
        else:
            print("✗ PGVector extension missing")
            sys.exit(1)

        tables = ['users', 'resumes', 'job_descriptions', 'applications', 'interview_prep_sessions']
        for table in tables:
            if f'create_table(\n        "{table}"' in content or f'create_table(\n        "{table}"' in content:
                print(f"✓ Table '{table}' defined")
            else:
                print(f"✗ Table '{table}' not found")
                sys.exit(1)
except FileNotFoundError as e:
    print(f"✗ Migration file not found: {e}")
    sys.exit(1)

# Test 3: Verify Alembic configuration
try:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    alembic_cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(alembic_cfg)

    # Get the current revision
    head = script.get_current_head()
    print(f"✓ Alembic configured correctly. Head revision: {head}")
except Exception as e:
    print(f"✗ Alembic configuration error: {e}")
    sys.exit(1)

print("\n✓ All migration tests passed!")
print("\nNext steps:")
print("  1. Install dependencies: pip install -r requirements.txt")
print("  2. Start PostgreSQL: docker-compose up -d postgres")
print("  3. Run migration: alembic upgrade head")
