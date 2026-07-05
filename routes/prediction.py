from flask import Blueprint, request, jsonify
import requests
import os
from config import supabase

prediction_bp = Blueprint('prediction_bp', __name__)

API_KEY = os.getenv("FOOTBALL_API_KEY")
BASE_URL = "https://api.football-data.org/v4"
HEADERS = {"X-Auth-Token": API_KEY}

@prediction_bp.route('/prediction/<int:match_id>/analytics', methods=['GET'])
def get_match_analytics(match_id):
    """Mengambil data Head-to-Head dan menghitung probabilitas kemenangan secara manual."""
    url = f"{BASE_URL}/matches/{match_id}/head2head"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code != 200:
        return jsonify({"status": "error", "message": "Gagal mengambil data Head-to-Head."}), response.status_code
    
    data = response.json()
    
    # Ambil ID tim tuan rumah saat ini untuk patokan
    current_home_team_id = data.get('aggregates', {}).get('homeTeam', {}).get('id')
    
    # Bypass aggregates dari API, hitung manual dari riwayat 'matches'
    matches = data.get('matches', [])
    home_wins = 0
    away_wins = 0
    draws = 0
    
    for match in matches:
        winner = match.get('score', {}).get('winner')
        past_home_id = match.get('homeTeam', {}).get('id')
        
        if winner == 'DRAW':
            draws += 1
        elif winner == 'HOME_TEAM':
            if past_home_id == current_home_team_id:
                home_wins += 1
            else:
                away_wins += 1
        elif winner == 'AWAY_TEAM':
            if past_home_id == current_home_team_id:
                away_wins += 1
            else:
                home_wins += 1

    total_calculated_matches = home_wins + away_wins + draws

    # Kalkulasi probabilitas berdasarkan data yang benar-benar ada
    if total_calculated_matches > 0:
        home_prob = round((home_wins / total_calculated_matches) * 100, 1)
        away_prob = round((away_wins / total_calculated_matches) * 100, 1)
        draw_prob = round((draws / total_calculated_matches) * 100, 1)
    else:
        home_prob = away_prob = draw_prob = 0

    insight = {
        "api_reported_total_matches": data.get('aggregates', {}).get('numberOfMatches', 0),
        "matches_analyzed": total_calculated_matches,
        "home_win_probability": f"{home_prob}%",
        "away_win_probability": f"{away_prob}%",
        "draw_probability": f"{draw_prob}%",
        "recommendation": "Gunakan persentase ini sebagai referensi sebelum menebak skor!"
    }
    
    return jsonify({"status": "success", "data": insight}), 200

@prediction_bp.route('/prediction', methods=['POST'])
def submit_prediction():
    """Menyimpan tebakan skor user ke Supabase."""
    data = request.json
    
    # Validasi kelengkapan data
    required_fields = ['match_id', 'predicted_home_score', 'predicted_away_score']
    if not data or not all(field in data for field in required_fields):
        return jsonify({"status": "error", "message": "Data prediksi tidak lengkap."}), 400
        
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"status": "error", "message": "User ID parameter is required."}), 400

    insert_data = {
        "user_id": user_id,
        "match_id": data["match_id"],
        "home_team": data.get("home_team", "Unknown"),
        "away_team": data.get("away_team", "Unknown"),
        "predicted_home_score": data["predicted_home_score"],
        "predicted_away_score": data["predicted_away_score"]
    }

    try:
        response = supabase.table('predictions').insert(insert_data).execute()
        return jsonify({"status": "success", "message": "Tebakan skor berhasil disimpan!", "data": response.data}), 201
    except Exception as e:
        print(f"[Error] Failed to save prediction: {str(e)}")
        return jsonify({"status": "error", "message": "Gagal menyimpan prediksi."}), 500