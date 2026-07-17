"""
scripts/etl_pl_history.py

Script ONE-TIME (dijalankan manual) buat fetch data historis Premier League
dari openfootball/football.json (via jsDelivr CDN, gratis, no API key),
terus insert ke Supabase table pl_historical_matches.

Beda dari World Cup: penamaan season di sini pakai format "2023-24"
(bukan tahun tunggal), dan gak ada konsep placeholder team karena
data musim yang sudah lewat itu semuanya final.

Cara pakai:
    python scripts/etl_pl_history.py

Aman dijalankan berkali-kali - pakai upsert berdasarkan (season, match_num).
"""

import os
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

# beberapa musim terakhir, bisa ditambah kalau mau histori lebih panjang
SEASONS = ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]

RAW_BASE_URL = "https://cdn.jsdelivr.net/gh/openfootball/football.json@master"


def fetch_season(season: str) -> dict:
    url = f"{RAW_BASE_URL}/{season}/en.1.json"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json()


def parse_matches(season: str, data: dict) -> list[dict]:
    rows = []
    for idx, m in enumerate(data.get("matches", []), start=1):
        score = m.get("score")
        # kadang score itu list kosong [] (match belum dimainkan), bukan dict
        ft = score.get("ft") if isinstance(score, dict) else None

        rows.append({
            "season": season,
            "match_num": idx,
            "round": m.get("round"),
            "match_date": m.get("date"),
            "team1": m.get("team1", ""),
            "team2": m.get("team2", ""),
            "team1_goals": ft[0] if ft else None,
            "team2_goals": ft[1] if ft else None,
        })
    return rows


def upsert_rows(rows: list[dict]) -> None:
    if not rows:
        return
    supabase.table("pl_historical_matches").upsert(
        rows,
        on_conflict="season,match_num",
    ).execute()


def main() -> None:
    total_inserted = 0
    for season in SEASONS:
        print(f"[ETL PL] Fetching Premier League {season}...")
        try:
            data = fetch_season(season)
        except requests.exceptions.RequestException as e:
            print(f"[ETL PL] Gagal fetch season {season}: {e}")
            continue

        rows = parse_matches(season, data)
        finished_rows = [r for r in rows if r["team1_goals"] is not None]

        print(f"[ETL PL] Season {season}: {len(rows)} total match, "
              f"{len(finished_rows)} sudah ada skor")

        upsert_rows(rows)
        total_inserted += len(rows)

        time.sleep(1)

    print(f"[ETL PL] Selesai. Total {total_inserted} baris di-upsert ke Supabase.")


if __name__ == "__main__":
    main()