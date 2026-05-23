#!/usr/bin/env python3
"""
Database Performance Analysis Script for SyncHire

Analyzes:
- Query execution times
- Index usage
- Table sizes
- Missing index suggestions
"""

import asyncio
import time
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os


async def analyze_database():
    """Run comprehensive database performance analysis"""

    # Connect to database
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://synchire:synchire_dev@localhost:5432/synchire"
    )

    engine = create_async_engine(database_url, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("╔════════════════════════════════════════════════╗")
    print("║     SyncHire Database Performance Analysis     ║")
    print("╚════════════════════════════════════════════════╝\n")

    async with async_session() as session:
        # 1. Table Sizes
        print("📊 Table Sizes:")
        print("─" * 50)

        result = await session.execute(text("""
            SELECT
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        """))

        for row in result:
            print(f"  {row.tablename:<25} {row.size:>15}")

        # 2. Index Usage
        print("\n🔍 Index Usage:")
        print("─" * 50)

        result = await session.execute(text("""
            SELECT
                schemaname,
                tablename,
                indexname,
                idx_scan as index_scans,
                idx_tup_read as tuples_read,
                idx_tup_fetch as tuples_fetched
            FROM pg_stat_user_indexes
            WHERE schemaname = 'public'
            ORDER BY idx_scan DESC;
        """))

        for row in result:
            if row.index_scans == 0:
                status = "⚠️  UNUSED"
            elif row.index_scans < 100:
                status = "⚡ LOW"
            else:
                status = "✅ ACTIVE"
            print(f"  {status} {row.indexname:<40} {row.index_scans:>10} scans")

        # 3. Sequential Scan Analysis
        print("\n🚶 Sequential Scans (potential missing indexes):")
        print("─" * 50)

        result = await session.execute(text("""
            SELECT
                schemaname,
                tablename,
                seq_scan,
                seq_tup_read,
                idx_scan,
                n_live_tup
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
            AND seq_scan > 0
            ORDER BY seq_scan DESC;
        """))

        for row in result:
            if row.seq_scan > 100 and row.idx_scan == 0:
                status = "⚠️  HIGH - Needs Index"
            elif row.seq_scan > 50:
                status = "⚡ MEDIUM - Monitor"
            else:
                status = "✅ OK"
            print(f"  {status} {row.tablename:<20} {row.seq_scan:>10} seq scans")

        # 4. Query Performance Test
        print("\n⏱️  Query Performance Tests:")
        print("─" * 50)

        # Test common queries
        queries = [
            ("List Resumes (user_id filter)", """
                SELECT * FROM resumes
                WHERE user_id = '00000000-0000-0000-0000-000000000000'
                ORDER BY created_at DESC
                LIMIT 10;
            """),
            ("List JDs (user_id filter)", """
                SELECT * FROM job_descriptions
                WHERE user_id = '00000000-0000-0000-0000-000000000000'
                ORDER BY created_at DESC
                LIMIT 10;
            """),
            ("Applications (user_id + status)", """
                SELECT * FROM applications
                WHERE user_id = '00000000-0000-0000-0000-000000000000'
                AND status = 'pending'
                ORDER BY created_at DESC;
            """),
            ("Vector Similarity Search", """
                SELECT id, title,
                       1 - (embedding <=> '[0]'::vector) as similarity
                FROM resumes
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> '[0]'::vector
                LIMIT 5;
            """),
        ]

        for name, query in queries:
            start = time.time()
            result = await session.execute(text(query))
            elapsed = (time.time() - start) * 1000
            status = "✅" if elapsed < 100 else "⚠️" if elapsed < 500 else "❌"
            print(f"  {status} {name:<30} {elapsed:>10.2f}ms")

        # 5. Missing Index Suggestions
        print("\n💡 Missing Index Suggestions:")
        print("─" * 50)

        result = await session.execute(text("""
            SELECT
                schemaname,
                tablename,
                attname,
                n_distinct,
                correlation
            FROM pg_stats
            WHERE schemaname = 'public'
            AND (n_distinct > 100 OR n_distinct < 0)
            ORDER BY n_distinct DESC
            LIMIT 20;
        """))

        print("  High-cardinality columns that may benefit from indexing:")
        for row in result:
            print(f"    • {row.tablename}.{row.attname} (distinct: {row.n_distinct})")

        # 6. Database Configuration
        print("\n⚙️  Database Configuration:")
        print("─" * 50)

        result = await session.execute(text("""
            SELECT name, setting, unit, short_desc
            FROM pg_settings
            WHERE name IN (
                'shared_buffers',
                'effective_cache_size',
                'work_mem',
                'maintenance_work_mem',
                'checkpoint_completion_target',
                'wal_buffers',
                'default_statistics_target',
                'random_page_cost',
                'effective_io_concurrency',
                'max_worker_processes'
            )
            ORDER BY name;
        """))

        for row in result:
            print(f"  {row.name:<30} {row.setting:<15} {row.unit or ''}")

    await engine.dispose()

    print("\n╔════════════════════════════════════════════════╗")
    print("║              Analysis Complete                ║")
    print("╚════════════════════════════════════════════════╝")


if __name__ == "__main__":
    asyncio.run(analyze_database())
