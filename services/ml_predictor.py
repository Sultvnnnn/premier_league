"""
services/ml_predictor.py

Prediksi menang/kalah/seri, generik untuk semua kompetisi (World Cup, Premier League).
Tabel Supabase dan file model beda per kompetisi, tapi logic-nya sama persis.
Kalau parameter league gak dikasih, otomatis dideteksi dari nama tim.

Cara pakai:
    from services.ml_predictor import predict_winner

    predict_winner("Argentina", "France")            # auto-detect -> wc
    predict_winner("Arsenal", "Chelsea")              # auto-detect -> pl
    predict_winner("Argentina", "France", league="wc")  # eksplisit, skip auto-detect
"""

import os
import pickle
import pandas as pd

from config import supabase
from services.ai_insight import generate_match_insight

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# konfigurasi per liga: nama table Supabase, path file model, dan nama model file
LEAGUE_CONFIG = {
    "wc": {
        "table": "wc_historical_matches",
        "model_path": os.path.join(_BASE_DIR, "model_wc_predictor.pkl"),
    },
    "pl": {
        "table": "pl_historical_matches",
        "model_path": os.path.join(_BASE_DIR, "model_pl_predictor.pkl"),
    },
}

# cache model yang udah di-load, biar gak buka file .pkl tiap request
_loaded_models: dict[str, tuple] = {}


TEAM_NICKNAME_ALIASES = {
    "spurs": "Tottenham",
    "man utd": "Manchester United",
    "man united": "Manchester United",
    "man city": "Manchester City",
    "wolves": "Wolverhampton",
    "the gunners": "Arsenal",
    "the reds": "Liverpool",
    "the blues": "Chelsea",
    "hammers": "West Ham",
    "villa": "Aston Villa",
    "forest": "Nottingham Forest",
    "palace": "Crystal Palace",
    "newcastle": "Newcastle United",
    "brighton": "Brighton",
    "leicester": "Leicester City",
    "boro": "Middlesbrough",
    "saints": "Southampton",
}


def _apply_nickname_alias(team_name: str) -> str:
    """Ganti nickname populer (case-insensitive) ke nama dasar yang lebih
    dekat ke nama resmi di database, sebelum masuk ke ilike matching."""
    return TEAM_NICKNAME_ALIASES.get(team_name.strip().lower(), team_name)


def _get_league_config(league: str) -> dict:
    league = league.lower()
    if league not in LEAGUE_CONFIG:
        raise ValueError(f"Liga '{league}' tidak dikenal. Pilihan: {list(LEAGUE_CONFIG.keys())}")
    return LEAGUE_CONFIG[league]


def _load_model(league: str):
    if league not in _loaded_models:
        config = _get_league_config(league)
        with open(config["model_path"], "rb") as f:
            saved = pickle.load(f)
        _loaded_models[league] = (saved["model"], saved["feature_cols"])
    return _loaded_models[league]


def _resolve_team_name(team_name: str, league: str) -> str:
    """Cari nama tim persis di database berdasarkan partial match.

    Perlu ini karena data PL nyimpen nama lengkap klub (misal "Arsenal FC"),
    sementara input biasanya cuma nama pendek (misal "Arsenal"). Tanpa
    resolve ini, query H2H exact match bakal selalu gagal nemuin apapun.
    """
    config = _get_league_config(league)
    table = config["table"]

    result = (
        supabase.table(table)
        .select("team1, team2")
        .or_(f"team1.ilike.%{team_name}%,team2.ilike.%{team_name}%")
        .limit(1)
        .execute()
    )

    if not result.data:
        return team_name  # gak ketemu, biarin apa adanya

    row = result.data[0]
    # tim mana yang match tergantung ilike-nya kena di kolom mana
    if team_name.lower() in row["team1"].lower():
        return row["team1"]
    return row["team2"]


def _detect_league(team_a: str) -> str:
    """Deteksi otomatis liga berdasarkan apakah team_a pernah muncul di
    salah satu table historis. Cek WC dulu, baru PL.

    Pakai ilike (case-insensitive partial match) karena data PL nyimpen
    nama klub lengkap dengan suffix (misal "Arsenal FC"), sementara user
    biasanya cuma nulis "Arsenal" doang.
    """
    wc_check = (
        supabase.table("wc_historical_matches")
        .select("id")
        .or_(f"team1.ilike.%{team_a}%,team2.ilike.%{team_a}%")
        .limit(1)
        .execute()
    )
    if wc_check.data:
        return "wc"

    pl_check = (
        supabase.table("pl_historical_matches")
        .select("id")
        .or_(f"team1.ilike.%{team_a}%,team2.ilike.%{team_a}%")
        .limit(1)
        .execute()
    )
    if pl_check.data:
        return "pl"

    return "wc"


def _compute_h2h_features(team_a: str, team_b: str, league: str) -> dict:
    config = _get_league_config(league)
    table = config["table"]

    # kolom filter placeholder cuma relevan buat WC (bracket knockout),
    # PL gak punya konsep ini karena semua match historis sudah final
    query = (
        supabase.table(table)
        .select("*")
        .not_.is_("team1_goals", "null")
    )
    if league == "wc":
        query = query.eq("is_placeholder", False)

    response = query.or_(
        f"and(team1.eq.{team_a},team2.eq.{team_b}),"
        f"and(team1.eq.{team_b},team2.eq.{team_a})"
    ).execute()

    meetings = response.data

    total_meetings = len(meetings)
    a_wins = a_goals = b_goals = 0

    for m in meetings:
        if m["team1"] == team_a:
            ga, gb = m["team1_goals"], m["team2_goals"]
        else:
            ga, gb = m["team2_goals"], m["team1_goals"]
        a_goals += ga
        b_goals += gb
        if ga > gb:
            a_wins += 1

    return {
        "h2h_win_rate_a": a_wins / total_meetings if total_meetings > 0 else 0.5,
        "h2h_avg_goals_a": a_goals / total_meetings if total_meetings > 0 else 0,
        "h2h_avg_goals_b": b_goals / total_meetings if total_meetings > 0 else 0,
        "h2h_total_meetings": total_meetings,
    }


def predict_winner(team_a: str, team_b: str, league: str | None = None) -> dict:
    # normalize nickname dulu (misal "Spurs" -> "Tottenham"), sebelum lanjut
    # ke deteksi liga atau resolve nama tim persis di database
    team_a_input = _apply_nickname_alias(team_a)
    team_b_input = _apply_nickname_alias(team_b)

    if league is None:
        league = _detect_league(team_a_input)

    resolved_team_a = _resolve_team_name(team_a_input, league)
    resolved_team_b = _resolve_team_name(team_b_input, league)

    model, feature_cols = _load_model(league)
    features = _compute_h2h_features(resolved_team_a, resolved_team_b, league)

    X = pd.DataFrame([features], columns=feature_cols)

    probabilities = model.predict_proba(X)[0]
    classes = model.classes_

    prob_by_class = dict(zip(classes, probabilities))
    predicted_class = classes[probabilities.argmax()]

    total_meetings = features["h2h_total_meetings"]
    low_confidence = total_meetings < 3

    if total_meetings == 0:
        recommendation = (
            "Kedua tim belum pernah ketemu di histori yang kita punya, "
            "prediksi ini murni dari pola umum model, bukan dari H2H spesifik."
        )
    elif low_confidence:
        recommendation = (
            f"Cuma {total_meetings} pertemuan yang tercatat, anggap prediksi ini "
            "sebagai referensi kasar aja, bukan kepastian."
        )
    else:
        recommendation = "Prediksi berdasarkan histori H2H yang cukup, tapi tetap gunakan sebagai referensi."

    # tampilkan nama asli yang di-input user (sebelum nickname alias),
    # biar response konsisten sama apa yang diketik/dikirim user
    result = {
        "league": league,
        "team_a": team_a,
        "team_b": team_b,
        "home_win_probability": f"{prob_by_class.get('home_win', 0) * 100:.1f}%",
        "draw_probability": f"{prob_by_class.get('draw', 0) * 100:.1f}%",
        "away_win_probability": f"{prob_by_class.get('away_win', 0) * 100:.1f}%",
        "predicted_result": predicted_class,
        "based_on_meetings": total_meetings,
        "low_confidence": low_confidence,
        "recommendation": recommendation,
    }

    result["ai_insight"] = generate_match_insight(team_a, team_b, result)

    return result


def simulate_tournament_winner() -> dict:
    """Prediksi juara World Cup 2026 dari pertandingan final: Spain vs Argentina."""
    final = predict_winner("Spain", "Argentina", league="wc")

    if final["predicted_result"] == "away_win":
        champion = "Argentina"
    else:
        champion = "Spain"

    return {
        "final": {"match": "Spain vs Argentina", "prediction": final},
        "predicted_champion": champion,
        "disclaimer": (
            "Simulasi ini mengasumsikan tim home menang kalau hasil prediksi draw, "
            "karena model tidak memodelkan skenario adu penalti. Anggap ini sebagai "
            "referensi kasar, bukan prediksi pasti."
        ),
    }