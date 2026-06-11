#!/usr/bin/env python3
"""
FoodPanda Sylhet Restaurant Scraper
=====================================
Scrapes every restaurant listed in Sylhet on FoodPanda Bangladesh via the
internal REST API (avoids PerimeterX anti-bot by using curl_cffi TLS
fingerprinting).

Data collected:
  • Basic info     — name, id, code, rating, review count, delivery time/fee,
                     min order, address, cuisines, tags, cover image, logo, etc.
  • Reviews        — reviewer name, star rating, date, and review text
                     (extracted from server-rendered JSON in vendor pages)

Output  : sylhet_restaurants.json  (incremental saves every 10 vendors)
Usage   : python scraper.py [--resume]

  --resume   Skip vendors already present in sylhet_restaurants.json
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import time
from pathlib import Path
from typing import Any

try:
    from curl_cffi import requests
except ImportError:
    print("curl_cffi is required. Install: pip3 install curl_cffi")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

SYLHET_LAT   = 24.8965
SYLHET_LNG   = 91.8768
API_BASE     = "https://bd.fd-api.com"
VENDOR_BASE  = "https://www.foodpanda.com.bd"
API_KEY      = "volo"

OUTPUT_FILE  = Path("sylhet_restaurants.json")
VENDOR_DELAY = 1.0
SAVE_EVERY   = 10

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Origin": "https://www.foodpanda.com.bd",
    "Referer": "https://www.foodpanda.com.bd/",
    "x-disco-client-id": "web",
    "X-API-Key": API_KEY,
}

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("scraper.log", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_session() -> requests.Session:
    """Create a curl_cffi session and prime it with cookies from foodpanda."""
    sess = requests.Session()
    sess.get(
        VENDOR_BASE,
        params={"lat": SYLHET_LAT, "lng": SYLHET_LNG},
        impersonate="chrome124",
        headers=HEADERS,
        timeout=30,
    )
    return sess


# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Vendor listing (REST API)
# ─────────────────────────────────────────────────────────────────────────────

def scrape_vendor_list(sess: requests.Session) -> list[dict]:
    """Fetch all Sylhet vendors via the foodpanda internal API."""
    log.info("Fetching vendor list from API …")
    r = sess.get(
        f"{API_BASE}/vendors-gateway/api/v1/pandora/vendors",
        params={"latitude": SYLHET_LAT, "longitude": SYLHET_LNG},
        impersonate="chrome124",
        headers=HEADERS,
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    items = data.get("data", {}).get("items", [])
    log.info(f"Received {len(items)} vendor(s) from API")
    return items


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Review extraction from vendor detail pages
# ─────────────────────────────────────────────────────────────────────────────


def parse_reviews(html: str) -> list[dict]:
    """Extract reviews from the server-rendered seoReviews JSON in the page."""
    idx = html.find('"seoReviews"')
    if idx < 0:
        return []

    start = html.find("[", idx)
    if start < 0:
        return []

    depth = 0
    end = start
    for i in range(start, len(html)):
        if html[i] == "[":
            depth += 1
        elif html[i] == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    try:
        reviews_data = json.loads(html[start:end])
    except json.JSONDecodeError:
        return []

    results = []
    for rev in reviews_data:
        overall = 0
        for rating in rev.get("ratings", []):
            if rating.get("topic") == "overall":
                overall = rating.get("score", 0)
                break
        results.append({
            "reviewer": rev.get("reviewerName", ""),
            "rating": overall,
            "date": rev.get("createdAt", ""),
            "text": rev.get("text", ""),
        })
    return results


def scrape_vendor_detail(
    sess: requests.Session, vendor: dict
) -> dict:
    """Load a vendor detail page and extract reviews.

    The vendor data (rating, delivery info, cuisines, etc.) is already
    present from the listing API response — only reviews need to be
    fetched from the detail page.
    """
    code = vendor.get("code", "")
    web_path = vendor.get("web_path", "")
    url = web_path or f"{VENDOR_BASE}/restaurant/{code}"

    try:
        r = sess.get(url, impersonate="chrome124", headers={
            **HEADERS,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }, timeout=30)
        r.raise_for_status()
    except Exception as exc:
        log.warning(f"  Page load failed ({url}): {exc}")
        return {**vendor, "reviews": []}

    reviews = parse_reviews(r.text)
    log.info(f"  ✓ {len(reviews):>3} reviews")
    return {**vendor, "reviews": reviews}


# ─────────────────────────────────────────────────────────────────────────────
# Persistence
# ─────────────────────────────────────────────────────────────────────────────

def load_existing() -> list[dict]:
    if OUTPUT_FILE.exists():
        try:
            return json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return []


def save(data: list[dict]) -> None:
    OUTPUT_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main(resume: bool = False) -> None:
    results: list[dict] = []
    done_ids: set[str] = set()

    if resume:
        results = load_existing()
        done_ids = {str(v.get("id", "")) for v in results}
        log.info(f"Resume mode: {len(done_ids)} vendor(s) already done")

    sess = make_session()

    # ── Stage 1: listing ──────────────────────────────────────────────────
    vendors = scrape_vendor_list(sess)
    total = len(vendors)
    log.info(f"\nTotal vendors found: {total}\n{'─' * 50}")

    if resume:
        pending = [v for v in vendors if str(v.get("id", "")) not in done_ids]
        log.info(f"Remaining after resume filter: {len(pending)}")
    else:
        pending = vendors

    # ── Stage 2: detail pages ─────────────────────────────────────────────
    for i, vendor in enumerate(pending, 1):
        name = vendor.get("name", vendor.get("code", "?"))
        log.info(f"[{i:>3}/{len(pending)}]  {name}")
        data = scrape_vendor_detail(sess, vendor)
        results.append(data)

        if i % SAVE_EVERY == 0:
            save(results)
            log.info(f"  → checkpoint saved ({len(results)} total)")

        time.sleep(VENDOR_DELAY)

    save(results)
    log.info(
        f"\n{'═' * 50}\n"
        f"  Done.  {len(results)} restaurant(s) written to {OUTPUT_FILE}\n"
        f"{'═' * 50}"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Scrape all Sylhet restaurants from FoodPanda Bangladesh."
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip vendors already saved in sylhet_restaurants.json",
    )
    args = parser.parse_args()
    main(resume=args.resume)
