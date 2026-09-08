"""DB preflight: verify datetime storage format before the aware migration.

Phase 0 of docs/DATETIME_MIGRATION_PLAN.md. Scans the datetime columns of
the core Lite tables and reports any row whose stored value does not match
the canonical SQLAlchemy-on-SQLite format::

    ^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}(\\.\\d+)?$

i.e. "YYYY-MM-DD HH:MM:SS[.ffffff]" — space separator, no "T", no UTC
offset. Rows written by external tools with ISO "T" strings or offsets
would fail SQLAlchemy's result parser on load, so any hit here must be
fixed before Phase 2 attaches tzinfo on read.

Usage:
    python scripts/verify_datetime_storage.py

The database defaults to ~/.synchire/synchire.db and can be overridden
with the SYNCHIRE_DB environment variable.

Exit codes: 0 = all values conform (or columns are NULL/empty), 1 = issues
found (non-conforming values, missing/unreadable database).
"""

import os
import re
import sqlite3
import sys

DEFAULT_DB_PATH = os.path.join(os.path.expanduser("~"), ".synchire", "synchire.db")

CANONICAL_DATETIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$")

# Datetime columns per table (mirrors the Lite models in app/models/).
DATETIME_COLUMNS: dict[str, list[str]] = {
    "applications": [
        "applied_date",
        "submitted_manually_at",
        "next_action_at",
        "last_updated",
        "created_at",
        "updated_at",
    ],
    "job_descriptions": [
        "deadline",
        "created_at",
        "updated_at",
    ],
    "resumes": [
        "created_at",
        "updated_at",
    ],
}


def verify_table(conn: sqlite3.Connection, table: str, columns: list[str]) -> list[str]:
    """Check one table; return a list of human-readable issue lines."""
    issues: list[str] = []
    exists = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    if not exists:
        print(f"[skip] table {table!r} not present in database")
        return issues

    select_cols = ", ".join(f"CAST({column} AS TEXT)" for column in columns)
    rows = conn.execute(f"SELECT id, {select_cols} FROM {table}").fetchall()
    print(
        f"[ok]   {table}: scanned {len(rows)} row(s), {len(columns)} datetime column(s)"
    )

    for row in rows:
        row_id, *values = row
        for column, value in zip(columns, values):
            if value is None:
                continue  # NULL is valid (nullable columns)
            if not CANONICAL_DATETIME_RE.match(value):
                issues.append(
                    f"{table}.{column} id={row_id!r}: {value!r} "
                    "(expected 'YYYY-MM-DD HH:MM:SS[.ffffff]', space separator, no offset)"
                )
    return issues


def main() -> int:
    db_path = os.environ.get("SYNCHIRE_DB", DEFAULT_DB_PATH)
    print(f"Verifying datetime storage in: {db_path}")

    if not os.path.isfile(db_path):
        print(f"ERROR: database file not found: {db_path}")
        print("       set SYNCHIRE_DB to point at an existing synchire.db")
        return 1

    try:
        conn = sqlite3.connect(db_path)
    except sqlite3.Error as exc:
        print(f"ERROR: cannot open database: {exc}")
        return 1

    try:
        all_issues: list[str] = []
        with conn:
            for table, columns in DATETIME_COLUMNS.items():
                all_issues.extend(verify_table(conn, table, columns))
    except sqlite3.Error as exc:
        print(f"ERROR: query failed: {exc}")
        return 1
    finally:
        conn.close()

    if all_issues:
        print(f"\n{len(all_issues)} non-conforming value(s) found:")
        for issue in all_issues:
            print(f"  - {issue}")
        print(
            "\nThese rows would fail to load once reads attach tzinfo "
            "(Phase 2); normalize them to 'YYYY-MM-DD HH:MM:SS[.ffffff]' first."
        )
        return 1

    print("\nAll datetime values conform to the canonical storage format.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
