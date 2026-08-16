"""
Re-verify career URLs in the company directory.

Concurrently checks every entry with an URL and updates the verified
flag (HTTP < 400 after redirects counts as reachable; WAF/bot blocks
like 403/412 leave verified=False but keep the URL). Network results
vary by environment, so re-run freely — it only flips flags.

Usage:
    cd api
    .venv/Scripts/python ../scripts/verify_company_urls.py [--limit 200] [--api http://127.0.0.1:8000]

Requires the Lite API to be running (reads/writes through the API so
the local DB locking rules stay in one place).
"""

import argparse
import asyncio
import sys

import httpx

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0",
    "Accept": "text/html",
}


async def verify_one(client: httpx.AsyncClient, sem: asyncio.Semaphore, entry: dict):
    async with sem:
        try:
            response = await client.head(
                entry["career_url"], follow_redirects=True, timeout=12
            )
            if response.status_code == 405:  # HEAD not allowed -> GET
                response = await client.get(
                    entry["career_url"], follow_redirects=True, timeout=12
                )
            ok = response.status_code < 400
            code = response.status_code
        except Exception:
            ok = False
            code = 0
    return entry, ok, code


async def main(api_base: str, limit: int) -> int:
    async with httpx.AsyncClient(timeout=30) as client:
        companies = (await client.get(f"{api_base}/api/companies")).json()

    with_url = [c for c in companies if c.get("career_url")][:limit]
    print(f"Verifying {len(with_url)} company URLs (concurrency 8)…")

    sem = asyncio.Semaphore(8)
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True) as client:
        results = await asyncio.gather(
            *(verify_one(client, sem, entry) for entry in with_url)
        )

    flipped = 0
    async with httpx.AsyncClient(timeout=30) as client:
        for entry, ok, code in results:
            if bool(entry["verified"]) == ok:
                continue
            response = await client.patch(
                f"{api_base}/api/companies/{entry['id']}",
                json={"verified": ok},
            )
            if response.status_code == 200:
                flipped += 1
            mark = "OK " if ok else "FAIL"
            print(f"  [{mark} {code}] {entry['name']} {entry['career_url']}")

    print(f"Done: {sum(1 for _, ok, _ in results if ok)} reachable, {flipped} flags updated")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default="http://127.0.0.1:8000")
    parser.add_argument("--limit", type=int, default=500)
    args = parser.parse_args()
    sys.exit(asyncio.run(main(args.api, args.limit)))
