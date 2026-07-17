"""
scripts/train_model.py

Training model klasifikasi (home_win/draw/away_win) generik untuk
World Cup atau Premier League, tinggal ganti argumen --league.

Cara pakai:
    python scripts/train_model.py --league wc
    python scripts/train_model.py --league pl
"""

import argparse
import pickle
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from config import supabase

LEAGUE_TABLES = {
    "wc": "wc_historical_matches",
    "pl": "pl_historical_matches",
}


def load_matches(league: str) -> pd.DataFrame:
    table = LEAGUE_TABLES[league]
    all_rows = []
    page_size = 1000
    offset = 0

    while True:
        query = supabase.table(table).select("*").not_.is_("team1_goals", "null")
        if league == "wc":
            query = query.eq("is_placeholder", False)
        response = (
            query.order("match_date")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = response.data
        all_rows.extend(batch)

        if len(batch) < page_size:
            break  # udah abis, gak ada lagi data tersisa
        offset += page_size

    df = pd.DataFrame(all_rows)
    print(f"[Train] {len(df)} match final dimuat dari {table}")
    return df


def compute_h2h_features(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for i, current in df.iterrows():
        team_a = current["team1"]
        team_b = current["team2"]
        current_date = current["match_date"]

        past = df[
            (df["match_date"] < current_date)
            & (
                ((df["team1"] == team_a) & (df["team2"] == team_b))
                | ((df["team1"] == team_b) & (df["team2"] == team_a))
            )
        ]

        total_meetings = len(past)
        a_wins = a_goals = b_goals = 0

        for _, m in past.iterrows():
            if m["team1"] == team_a:
                ga, gb = m["team1_goals"], m["team2_goals"]
            else:
                ga, gb = m["team2_goals"], m["team1_goals"]
            a_goals += ga
            b_goals += gb
            if ga > gb:
                a_wins += 1

        h2h_win_rate_a = a_wins / total_meetings if total_meetings > 0 else 0.5
        h2h_avg_goals_a = a_goals / total_meetings if total_meetings > 0 else 0
        h2h_avg_goals_b = b_goals / total_meetings if total_meetings > 0 else 0

        if current["team1_goals"] > current["team2_goals"]:
            result = "home_win"
        elif current["team1_goals"] < current["team2_goals"]:
            result = "away_win"
        else:
            result = "draw"

        rows.append({
            "h2h_win_rate_a": h2h_win_rate_a,
            "h2h_avg_goals_a": h2h_avg_goals_a,
            "h2h_avg_goals_b": h2h_avg_goals_b,
            "h2h_total_meetings": total_meetings,
            "result": result,
        })

    return pd.DataFrame(rows)


def main(league: str) -> None:
    df = load_matches(league)
    features_df = compute_h2h_features(df)

    print("\n[Train] Distribusi hasil di dataset:")
    print(features_df["result"].value_counts())

    feature_cols = [
        "h2h_win_rate_a",
        "h2h_avg_goals_a",
        "h2h_avg_goals_b",
        "h2h_total_meetings",
    ]
    X = features_df[feature_cols]
    y = features_df["result"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    print(f"\n[Train] Akurasi di test set: {acc:.2%}")
    print("\n[Train] Classification report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    output_path = f"model_{league}_predictor.pkl"
    with open(output_path, "wb") as f:
        pickle.dump({"model": model, "feature_cols": feature_cols}, f)

    print(f"\n[Train] Model disimpan ke {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--league", choices=["wc", "pl"], required=True)
    args = parser.parse_args()
    main(args.league)