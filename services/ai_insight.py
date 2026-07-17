"""
services/ai_insight.py

Generate narasi insight singkat dari data prediksi (H2H + hasil model ML),
pakai Groq API (gratis, cek console.groq.com/keys buat API key).

Kalau GROQ_API_KEY belum di-set atau API call gagal, fungsi ini return
None - biar endpoint yang manggil tetap jalan normal tanpa insight,
bukan bikin seluruh response error.
"""

import os
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# model Groq
_MODEL_NAME = "llama-3.3-70b-versatile"


def generate_match_insight(team_a: str, team_b: str, analytics_data: dict) -> str | None:
    """Generate narasi singkat dari data analytics yang udah dihitung.

    analytics_data itu dict yang sama kayak yang di-return _build_analytics
    atau predict_winner (udah termasuk historical_h2h dan/atau field "league").
    """
    if not _client:
        print("[Warning] GROQ_API_KEY belum di-set, skip AI insight.")
        return None

    league = analytics_data.get("league", "wc")
    competition_name = "Premier League" if league == "pl" else "World Cup"

    prompt = f"""Kamu analis sepak bola. Berdasarkan data berikut soal pertandingan
{team_a} vs {team_b} di {competition_name}, buat 2-3 kalimat insight singkat dalam
Bahasa Indonesia yang santai tapi informatif. Jangan mengulang angka mentah
persis, tapi jelaskan maknanya secara naratif. Kalau datanya sedikit
(low confidence), sebutkan itu sebagai catatan, jangan terlalu percaya diri.

Data:
{analytics_data}
"""

    try:
        response = _client.chat.completions.create(
            model=_MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
        )
        return response.text.strip() if hasattr(response, "text") else response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[Warning] Gagal generate AI insight: {str(e)}")
        return None