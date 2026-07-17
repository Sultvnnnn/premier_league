"""
scripts/etl_wc_history.py

Script ONE-TIME (dijalankan manual, bukan tiap request) untuk:
1. Fetch data World Cup dari openfootball/worldcup.json (via jsDelivr CDN, gratis, no API key)
2. Parse jadi baris-baris match
3. Insert ke Supabase table `wc_historical_matches`

Sebelum menjalankan, pastikan:
- Sudah menjalankan schema SQL (termasuk kolom match_num) lewat Supabase SQL editor
- .env berisi SUPABASE_URL dan SUPABASE_KEY (sama seperti yang dipakai config.py)

Cara pakai:
    python scripts/etl_wc_history.py

Aman dijalankan berkali-kali — pakai upsert berdasarkan (season, match_num),
jadi kalau openfootball update placeholder jadi nama tim asli, baris yang sama
ke-update, bukan nambah baris baru.
"""

import os
import re
import time

import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit(
        "SUPABASE_URL / SUPABASE_KEY belum ada di .env. "
        "Pastikan sama seperti yang dipakai config.py."
    )

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SEASONS = [2014, 2018, 2022, 2026]

RAW_BASE_URL = "https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master"

_PLACEHOLDER_PATTERN = re.compile(r"^[WL]\d+$")

TEAM_NAME_ALIASES = {
    "Bosnia-Herzegovina": "Bosnia & Herzegovina",
    "Côte d'Ivoire": "Ivory Coast",
}


def _normalize_team_name(team_name: str) -> str:
    return TEAM_NAME_ALIASES.get(team_name, team_name)


def _is_placeholder(team_name: str) -> bool:
    return bool(_PLACEHOLDER_PATTERN.match(team_name))


def fetch_season(season: int) -> dict:
    url = f"{RAW_BASE_URL}/{season}/worldcup.json"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json()


def parse_matches(season: int, data: dict) -> list[dict]:
    rows = []
    for idx, m in enumerate(data.get("matches", []), start=1):
        team1 = _normalize_team_name(m.get("team1", ""))
        team2 = _normalize_team_name(m.get("team2", ""))
        score = m.get("score", {})
        ft = score.get("ft") if score else None

        # field "num" gak selalu ada di semua tahun, kalau gak ada
        # pakai urutan index sebagai fallback (aman karena urutan match
        # di file openfootball itu konsisten tiap kali di-fetch)
        match_num = m.get("num", idx)

        rows.append({
            "season": season,
            "match_num": match_num,
            "round": m.get("round"),
            "match_date": m.get("date"),
            "team1": team1,
            "team2": team2,
            "team1_goals": ft[0] if ft else None,
            "team2_goals": ft[1] if ft else None,
            "group": m.get("group"),
            "ground": m.get("ground"),
            "is_placeholder": _is_placeholder(team1) or _is_placeholder(team2),
        })
    return rows


def upsert_rows(rows: list[dict]) -> None:
    if not rows:
        return
    supabase.table("wc_historical_matches").upsert(
        rows,
        on_conflict="season,match_num",
    ).execute()


def main() -> None:
    total_inserted = 0
    for season in SEASONS:
        print(f"[ETL] Fetching World Cup {season}...")
        try:
            data = fetch_season(season)
        except requests.exceptions.RequestException as e:
            print(f"[ETL] Gagal fetch season {season}: {e}")
            continue

        rows = parse_matches(season, data)
        finished_rows = [r for r in rows if not r["is_placeholder"] and r["team1_goals"] is not None]

        print(f"[ETL] Season {season}: {len(rows)} total match, "
              f"{len(finished_rows)} sudah final (bukan placeholder, ada skor)")

        upsert_rows(rows)
        total_inserted += len(rows)

        time.sleep(1)

    print(f"[ETL] Selesai. Total {total_inserted} baris di-upsert ke Supabase.")


if __name__ == "__main__":
    main()