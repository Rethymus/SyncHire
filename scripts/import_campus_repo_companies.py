"""
Import domestic company radar data from the Campus20XX GitHub repos.

The repos (e.g. namewyf/Campus2027) maintain markdown tables where each
row carries company name, official career URL, and a dated hiring
signal — everything the radar needs. See
app/services/hiring_signal_service.parse_campus_markdown for the row
semantics (预计/即将 rows import without pinning a signal).

Usage (Lite API must be running):
    cd api
    .venv/Scripts/python ../scripts/import_campus_repo_companies.py \
        [--api http://127.0.0.1:8000] [--repo namewyf/Campus2027] [--dry-run]
"""

import argparse
import asyncio
import sys
from datetime import datetime
from pathlib import Path

import httpx

API_DIR = Path(__file__).resolve().parent.parent / "api"
sys.path.insert(0, str(API_DIR))

from app.services.hiring_signal_service import parse_campus_markdown  # noqa: E402


async def fetch_readme(repo: str) -> str:
    """Raw first (no rate limit); fall back to authenticated gh api."""
    raw_url = f"https://raw.githubusercontent.com/{repo}/main/README.md"
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        response = await client.get(raw_url)
        if response.status_code == 200:
            return response.text
    import base64
    import subprocess

    result = subprocess.run(
        ["gh", "api", f"repos/{repo}/contents/README.md", "--jq", ".content"],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        return base64.b64decode(result.stdout.strip()).decode("utf-8")
    raise RuntimeError(f"Cannot fetch README for {repo}: {result.stderr[:200]}")


async def main(api_base: str, repos: list, dry_run: bool) -> int:
    rows = []
    for repo in repos:
        readme = await fetch_readme(repo)
        parsed = list(parse_campus_markdown(readme))
        print(f"{repo}: {len(parsed)} company rows parsed")
        rows.extend(parsed)

    async with httpx.AsyncClient(timeout=30) as client:
        existing = {
            c["name"]: c
            for c in (await client.get(f"{api_base}/api/companies")).json()
        }

        to_import = []
        created_names = set()
        signals_to_pin = []
        for name, career_url, source_url, batch, title, detected_at in rows:
            if name not in existing and name not in created_names:
                to_import.append(
                    {
                        "name": name,
                        "career_url": career_url,
                        "industry": "互联网",
                        "verified": False,
                    }
                )
                created_names.add(name)
            if not batch:
                continue
            # Pin only when newer than any existing signal
            current = existing.get(name)
            if current and current.get("signal_detected_at"):
                current_dt = datetime.fromisoformat(
                    current["signal_detected_at"].replace("Z", "+00:00")
                )
                if detected_at and current_dt >= detected_at:
                    continue
            signals_to_pin.append((name, batch, title, source_url, detected_at))

        # Pin oldest first so later (newer) repo data overwrites stale
        # signals when the same company appears in multiple repos
        from datetime import timezone as _tz

        signals_to_pin.sort(
            key=lambda item: item[4] or datetime.min.replace(tzinfo=_tz.utc)
        )

        print(f"New companies: {len(to_import)} | signals to pin: {len(signals_to_pin)}")
        if dry_run:
            for item in to_import[:10]:
                print("  +", item["name"], item["career_url"])
            for name, batch, _, _, _ in signals_to_pin[:10]:
                print("  *", name, "->", batch)
            return 0

        if to_import:
            result = await client.post(
                f"{api_base}/api/companies/import", json={"companies": to_import}
            )
            result.raise_for_status()
            body = result.json()
            print(f"Imported: {body['created']} created, {body['skipped']} skipped")

        catalog = {
            c["name"]: c
            for c in (await client.get(f"{api_base}/api/companies")).json()
        }
        pinned = 0
        for name, batch, title, source_url, detected_at in signals_to_pin:
            entry = catalog.get(name)
            if not entry:
                continue
            payload = {"batch": batch, "title": title}
            if source_url:
                payload["url"] = source_url
            if detected_at:
                payload["detected_at"] = detected_at.isoformat()
            response = await client.post(
                f"{api_base}/api/companies/{entry['id']}/signal", json=payload
            )
            if response.status_code == 200:
                pinned += 1
        print(f"Signals pinned: {pinned}")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    parser.add_argument(
        "--repo",
        action="append",
        default=["namewyf/Campus2027"],
        help="GitHub repo(s) to import; repeatable",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    sys.exit(asyncio.run(main(args.api, args.repo, args.dry_run)))
