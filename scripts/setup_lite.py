#!/usr/bin/env python3
"""
SyncHire Lite Setup Script

Quick setup script for the lightweight version of SyncHire.
Creates necessary directories and validates configuration.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config_lite import get_lite_settings
from app.core.logger import logger, LogCategory


def create_directories(settings):
    """Create necessary directories for local operation."""
    print("📁 Creating data directories...")

    directories = [
        settings.DATA_DIR,
        settings.FILES_DIR,
        settings.BACKUPS_DIR,
        settings.EXPORTS_DIR,
        settings.EXTENSIONS_DIR,
    ]

    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        print(f"  ✓ {directory}")

    print("✅ Directories created successfully\n")


def check_environment():
    """Check environment configuration."""
    print("🔍 Checking environment configuration...")

    # Check for .env.lite file
    env_file = Path(".env.lite")
    if env_file.exists():
        print(f"  ✓ Environment file found: {env_file}")
    else:
        print(f"  ⚠️  No environment file found. Creating from example...")
        if Path(".env.example").exists():
            import shutil
            shutil.copy(".env.example", ".env.lite")
            print(f"  ✓ Created {env_file} from .env.example")
        else:
            print(f"  ⚠️  No .env.example found. Creating minimal .env.lite...")
            with open(".env.lite", "w") as f:
                f.write("# SyncHire Lite Configuration\n")
                f.write("DEBUG=false\n")
                f.write("OPENAI_API_KEY=\n")
                f.write("ANTHROPIC_API_KEY=\n")
            print(f"  ✓ Created minimal {env_file}")

    # Check AI API keys
    from dotenv import load_dotenv
    load_dotenv(".env.lite")

    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    if openai_key:
        print(f"  ✓ OpenAI API key configured")
    else:
        print(f"  ⚠️  OpenAI API key not set. AI features will be limited.")

    if anthropic_key:
        print(f"  ✓ Anthropic API key configured")
    else:
        print(f"  ⚠️  Anthropic API key not set. AI features will be limited.")

    if not openai_key and not anthropic_key:
        print(f"  ⚠️  No AI API keys configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.lite")

    print()


def check_dependencies():
    """Check if required dependencies are installed."""
    print("📦 Checking dependencies...")

    required_packages = [
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "aiosqlite",
        "pydantic",
        "pydantic_settings",
        "openai",
        "anthropic",
    ]

    missing_packages = []

    for package in required_packages:
        try:
            __import__(package)
            print(f"  ✓ {package}")
        except ImportError:
            print(f"  ✗ {package} (missing)")
            missing_packages.append(package)

    if missing_packages:
        print(f"\n⚠️  Missing packages: {', '.join(missing_packages)}")
        print(f"Run: pip install -r requirements_lite.txt")
        return False

    print("✅ All dependencies installed\n")
    return True


def initialize_database():
    """Initialize the SQLite database."""
    print("🗄️  Initializing database...")

    try:
        from app.core.database_lite import init_db
        import asyncio

        async def setup_db():
            await init_db()
            print(f"  ✓ Database created: {get_lite_settings().DATABASE_PATH}")

        asyncio.run(setup_db())
        print("✅ Database initialized\n")

    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
        return False

    return True


def create_default_profile():
    """Create a default local profile if none exists."""
    print("👤 Setting up default profile...")

    try:
        from app.core.database_lite import AsyncSessionLocal
        from app.models.local_profile import LocalProfile
        from uuid import uuid4
        import asyncio

        async def setup_profile():
            async with AsyncSessionLocal() as db:
                # Check if profile exists
                from sqlalchemy import select
                result = await db.execute(select(LocalProfile))
                existing = result.scalar_one_or_none()

                if not existing:
                    profile = LocalProfile(
                        id=uuid4(),
                        name="User",
                        preferences='{"theme": "light"}'
                    )
                    db.add(profile)
                    await db.commit()
                    print("  ✓ Default profile created")
                else:
                    print("  ✓ Profile already exists")

        asyncio.run(setup_profile())
        print("✅ Profile setup complete\n")

    except Exception as e:
        print(f"✗ Profile setup failed: {e}")
        return False

    return True


def print_summary(settings):
    """Print setup summary."""
    print("=" * 60)
    print("🎉 SyncHire Lite Setup Complete!")
    print("=" * 60)
    print()
    print("📍 Data Directory:")
    print(f"   {settings.DATA_DIR}")
    print()
    print("📊 Database:")
    print(f"   {settings.DATABASE_PATH}")
    print()
    print("📁 Files Directory:")
    print(f"   {settings.FILES_DIR}")
    print()
    print("💾 Backups Directory:")
    print(f"   {settings.BACKUPS_DIR}")
    print()
    print("🚀 To start the application:")
    print("   cd api")
    print("   python main_lite.py")
    print()
    print("📖 Documentation:")
    print("   - LITE_ARCHITECTURE.md")
    print("   - LITE_MIGRATION_GUIDE.md")
    print("   - LITE_IMPLEMENTATION_PROGRESS.md")
    print()
    print("=" * 60)


def main():
    """Main setup function."""
    print("\n🚀 SyncHire Lite Setup")
    print("=" * 60)
    print()

    # Get settings
    settings = get_lite_settings()

    # Step 1: Create directories
    create_directories(settings)

    # Step 2: Check environment
    check_environment()

    # Step 3: Check dependencies
    if not check_dependencies():
        print("\n⚠️  Please install missing dependencies and run setup again.")
        sys.exit(1)

    # Step 4: Initialize database
    if not initialize_database():
        print("\n✗ Setup failed at database initialization.")
        sys.exit(1)

    # Step 5: Create default profile
    if not create_default_profile():
        print("\n⚠️  Profile setup failed, but application should still work.")

    # Step 6: Print summary
    print_summary(settings)

    print("✅ Setup complete! You can now start using SyncHire Lite.\n")


if __name__ == "__main__":
    main()
