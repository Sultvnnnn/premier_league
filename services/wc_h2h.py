"""
services/wc_h2h.py

Query H2H dari data historis World Cup (2014-2026) yang sudah di-ETL ke Supabase
table `wc_historical_matches`. Melengkapi H2H dari football-data.org (yang di
free tier cuma cover current season) dengan histori lintas beberapa turnamen.

Cara pakai di routes/prediction.py:

    from services.wc_h2h import get_h2h_from_history

    h2h = get_h2h_from_history("Argentina", "France")
"""

from config import supabase

# Sama seperti di scripts/etl_wc_history.py — kalau ada tim baru dengan
# penamaan tidak konsisten di masa depan, tambahkan mapping di sini juga.
TEAM_NAME_ALIASES = {
    "Bosnia-Herzegovina": "Bosnia & Herzegovina",
    "Côte d'Ivoire": "Ivory Coast",
}


def _normalize_team_name(team_name: str) -> str:
    return TEAM_NAME_ALIASES.get(team_name, team_name)


def get_h2h_from_history(team_a: str, team_b: str, last_n: int = 5) -> dict:
    """Hitung H2H dua tim dari seluruh histori World Cup yang ada di Supabase.

    Hanya menghitung match yang final (bukan placeholder, sudah ada skor).
    """
    team_a = _normalize_team_name(team_a)
    team_b = _normalize_team_name(team_b)

    response = (
        supabase.table("wc_historical_matches")
        .select("*")
        .eq("is_placeholder", False)
        .not_.is_("team1_goals", "null")
        .or_(
            f"and(team1.eq.{team_a},team2.eq.{team_b}),"
            f"and(team1.eq.{team_b},team2.eq.{team_a})"
        )
        .order("match_date")
        .execute()
    )

    meetings = response.data

    team_a_wins = team_b_wins = draws = 0
    goals_a_total = goals_b_total = 0

    for m in meetings:
        if m["team1"] == team_a:
            a_goals, b_goals = m["team1_goals"], m["team2_goals"]
        else:
            a_goals, b_goals = m["team2_goals"], m["team1_goals"]

        goals_a_total += a_goals
        goals_b_total += b_goals

        if a_goals > b_goals:
            team_a_wins += 1
        elif a_goals < b_goals:
            team_b_wins += 1
        else:
            draws += 1

    total = len(meetings)

    return {
        "team_a": team_a,
        "team_b": team_b,
        "total_meetings": total,
        "team_a_wins": team_a_wins,
        "team_b_wins": team_b_wins,
        "draws": draws,
        "avg_goals_team_a": round(goals_a_total / total, 2) if total else None,
        "avg_goals_team_b": round(goals_b_total / total, 2) if total else None,
        "last_meetings": [
            {
                "season": m["season"],
                "round": m["round"],
                "date": m["match_date"],
                "team1": m["team1"],
                "team2": m["team2"],
                "score": f"{m['team1_goals']}-{m['team2_goals']}",
            }
            for m in meetings[-last_n:]
        ],
    }