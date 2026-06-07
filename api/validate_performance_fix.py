#!/usr/bin/env python3
"""
Performance Fix Validation Script

This script validates that database performance optimizations actually improve query performance.
It runs before and after applying migrations to measure impact.
"""

import asyncio
import time
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func, delete as sql_delete
from app.core.database import get_db
from app.models.application import Application
from app.models.application_status_history import ApplicationStatusHistory
from app.models.user import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PerformanceValidator:
    """Validates performance improvements from database optimizations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.before_metrics = {}
        self.after_metrics = {}

    async def get_test_user(self):
        """Get or create a test user for validation."""
        result = await self.db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()

        if not user:
            logger.warning("No users found. Creating test user...")
            # This would require user creation logic
            return None

        return user

    async def measure_query_performance(self, query_name: str, query_func) -> dict:
        """Measure query execution time and resource usage."""
        logger.info(f"🔬 Measuring: {query_name}")

        # Warm-up run
        try:
            await query_func()
        except Exception:
            pass

        # Measure multiple runs for accuracy
        times = []
        for i in range(5):
            start = time.time()
            try:
                result = await query_func()
                times.append(time.time() - start)
            except Exception as e:
                logger.error(f"Query failed: {e}")
                return {"error": str(e)}

        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)

        metrics = {
            "avg_time_ms": avg_time * 1000,
            "min_time_ms": min_time * 1000,
            "max_time_ms": max_time * 1000,
            "result_count": len(result) if isinstance(result, list) else 1,
        }

        logger.info(
            f"  ⏱️  Avg: {metrics['avg_time_ms']:.2f}ms, "
            f"Min: {metrics['min_time_ms']:.2f}ms, "
            f"Max: {metrics['max_time_ms']:.2f}ms"
        )

        return metrics

    async def test_applications_list(self, user_id: uuid.UUID):
        """Test the most common query: user's applications list."""

        async def query():
            result = await self.db.execute(
                select(Application)
                .where(Application.user_id == user_id)
                .order_by(Application.created_at.desc())
                .limit(20)
            )
            return list(result.scalars().all())

        return await self.measure_query_performance(
            "Applications List (user_id + ORDER BY created_at)", query
        )

    async def test_status_history(self):
        """Test status history query with composite index."""
        # Get first application
        result = await self.db.execute(select(Application).limit(1))
        app = result.scalar_one_or_none()

        if not app:
            return {"error": "No applications found"}

        async def query():
            result = await self.db.execute(
                select(ApplicationStatusHistory)
                .where(ApplicationStatusHistory.application_id == app.id)
                .order_by(ApplicationStatusHistory.changed_at.desc())
                .limit(10)
            )
            return list(result.scalars().all())

        return await self.measure_query_performance(
            "Status History (application_id + ORDER BY changed_at)", query
        )

    async def test_count_query(self, user_id: uuid.UUID):
        """Test count query for pagination."""

        async def query():
            result = await self.db.execute(
                select(func.count(Application.id)).where(Application.user_id == user_id)
            )
            return result.scalar() or 0

        return await self.measure_query_performance("Count Query (pagination)", query)

    async def test_bulk_delete(self):
        """Test bulk delete performance improvement."""
        # This would require creating test data
        logger.info("🔬 Measuring: Bulk Delete (would require test data)")

        async def old_method():
            # Simulate old method (individual deletes)
            result = await self.db.execute(select(Application).limit(5))
            apps = list(result.scalars().all())

            start = time.time()
            for app in apps:
                await self.db.delete(app)
            duration = time.time() - start

            await self.db.rollback()  # Don't actually delete
            return duration

        async def new_method():
            # New method (bulk delete)
            result = await self.db.execute(select(Application).limit(5))
            apps = list(result.scalars().all())
            app_ids = [app.id for app in apps]

            start = time.time()
            delete_stmt = sql_delete(Application).where(Application.id.in_(app_ids))
            await self.db.execute(delete_stmt)
            duration = time.time() - start

            await self.db.rollback()  # Don't actually delete
            return duration

        try:
            old_time = await old_method()
            new_time = await new_method()

            improvement = ((old_time - new_time) / old_time) * 100

            logger.info(f"  ⏱️  Old method: {old_time*1000:.2f}ms")
            logger.info(f"  ⏱️  New method: {new_time*1000:.2f}ms")
            logger.info(f"  📈 Improvement: {improvement:.1f}% faster")

            return {
                "old_time_ms": old_time * 1000,
                "new_time_ms": new_time * 1000,
                "improvement_percent": improvement,
            }
        except Exception as e:
            return {"error": str(e)}

    async def check_indexes_exist(self) -> dict:
        """Check if performance indexes exist."""
        logger.info("🔍 Checking if performance indexes exist...")

        indexes_to_check = [
            "idx_applications_user_created",
            "idx_applications_resume_id",
            "idx_applications_jd_id",
            "idx_status_history_app_changed",
        ]

        result = await self.db.execute(
            text("""
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND indexname = ANY(:indexes)
        """),
            {"indexes": indexes_to_check},
        )

        existing_indexes = {row[0] for row in result.fetchall()}

        status = {}
        for index in indexes_to_check:
            status[index] = index in existing_indexes
            if status[index]:
                logger.info(f"  ✅ {index}")
            else:
                logger.warning(f"  ❌ {index} (missing)")

        return status

    async def run_validation(self):
        """Run complete performance validation."""
        logger.info("🚀 Starting Performance Validation")
        logger.info("=" * 60)

        user = await self.get_test_user()
        if not user:
            logger.error("❌ Cannot run validation without test user")
            return

        # Check if indexes exist
        index_status = await self.check_indexes_exist()

        # Run performance tests
        logger.info("\n📊 Running Performance Tests")
        logger.info("-" * 60)

        results = {}

        if user:
            results["applications_list"] = await self.test_applications_list(user.id)
            results["status_history"] = await self.test_status_history()
            results["count_query"] = await self.test_count_query(user.id)

        # Generate report
        logger.info("\n📋 VALIDATION REPORT")
        logger.info("=" * 60)

        # Index status
        all_indexes_exist = all(index_status.values())
        if all_indexes_exist:
            logger.info("✅ All performance indexes are installed")
        else:
            missing = [idx for idx, exists in index_status.items() if not exists]
            logger.warning(f"⚠️  Missing indexes: {', '.join(missing)}")
            logger.info("   Run migration 002_add_performance_indexes.sql to install")

        # Performance assessment
        if (
            results.get("applications_list")
            and "error" not in results["applications_list"]
        ):
            avg_time = results["applications_list"]["avg_time_ms"]
            if avg_time < 50:
                logger.info(f"✅ Applications list: EXCELLENT ({avg_time:.2f}ms)")
            elif avg_time < 100:
                logger.info(f"✅ Applications list: GOOD ({avg_time:.2f}ms)")
            else:
                logger.warning(f"⚠️  Applications list: SLOW ({avg_time:.2f}ms)")

        if results.get("status_history") and "error" not in results["status_history"]:
            avg_time = results["status_history"]["avg_time_ms"]
            if avg_time < 20:
                logger.info(f"✅ Status history: EXCELLENT ({avg_time:.2f}ms)")
            elif avg_time < 50:
                logger.info(f"✅ Status history: GOOD ({avg_time:.2f}ms)")
            else:
                logger.warning(f"⚠️  Status history: SLOW ({avg_time:.2f}ms)")

        return {
            "index_status": index_status,
            "performance_results": results,
            "all_indexes_exist": all_indexes_exist,
        }


async def main():
    """Run validation and generate report."""
    try:
        async for db in get_db():
            validator = PerformanceValidator(db)
            results = await validator.run_validation()

            logger.info("\n✅ Validation complete!")

            # Exit with appropriate code
            if results["all_indexes_exist"]:
                logger.info("🎉 All optimizations are in place!")
                return 0
            else:
                logger.info(
                    "📝 Next steps: Apply migration 002_add_performance_indexes.sql"
                )
                return 1

    except Exception as e:
        logger.error(f"❌ Validation failed: {e}")
        return 2


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
