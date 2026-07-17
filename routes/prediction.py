import requests
from flask import Blueprint, request, jsonify

from config import supabase
from services.external_api import fetch_json
from services.wc_h2h import get_h2h_from_history
from services.ml_predictor import predict_winner, simulate_tournament_winner
from services.ai_insight import generate_match_insight

prediction_bp = Blueprint('prediction_bp', __name__)

MATCHES_BASE_URL = "https://api.football-data.org/v4/matches"

# di bawah ini dianggap sample kekecilan buat dipercaya
MIN_MATCHES_FOR_CONFIDENCE = 3

# endpoint head2head bawaan API nyampur semua kompetisi (friendly, kualifikasi, dll)
# jadi kita filter manual biar yang kehitung cuma World Cup
WORLD_CUP_KEYWORD = "FIFA World Cup"


def _build_analytics(data: dict, competition_filter: str | None = None) -> dict:
    current_home_team_id = data.get('aggregates', {}).get('homeTeam', {}).get('id')
    matches = data.get('matches', [])

    if competition_filter:
        matches = [
            m for m in matches
            if competition_filter.lower() in (m.get('competition', {}).get('name') or '').lower()
        ]

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
        # winner null kalau match belum FINISHED, skip aja gak usah dihitung

    total_calculated_matches = home_wins + away_wins + draws

    if total_calculated_matches > 0:
        home_prob = round((home_wins / total_calculated_matches) * 100, 1)
        away_prob = round((away_wins / total_calculated_matches) * 100, 1)
        draw_prob = round((draws / total_calculated_matches) * 100, 1)
    else:
        home_prob = away_prob = draw_prob = 0

    insufficient_data = total_calculated_matches == 0
    low_confidence = 0 < total_calculated_matches < MIN_MATCHES_FOR_CONFIDENCE

    if insufficient_data:
        recommendation = (
            "Belum ada histori pertemuan yang tercatat untuk kedua tim ini "
            "pada kompetisi yang difilter. Persentase di bawah tidak dapat dihitung."
        )
    elif low_confidence:
        recommendation = (
            f"Hanya {total_calculated_matches} pertemuan yang tercatat, "
            "anggap persentase ini sebagai referensi kasar, bukan prediksi pasti."
        )
    else:
        recommendation = "Gunakan persentase ini sebagai referensi sebelum menebak skor!"

    return {
        "api_reported_total_matches": data.get('aggregates', {}).get('numberOfMatches', 0),
        "matches_analyzed": total_calculated_matches,
        "competition_filter_applied": competition_filter,
        "home_win_probability": f"{home_prob}%",
        "away_win_probability": f"{away_prob}%",
        "draw_probability": f"{draw_prob}%",
        "insufficient_data": insufficient_data,
        "low_confidence": low_confidence,
        "recommendation": recommendation,
    }


def _extract_team_names(head2head_data: dict) -> tuple[str | None, str | None]:
    # buat query ke Supabase kita butuh nama tim, bukan id
    aggregates = head2head_data.get('aggregates', {})
    home_name = aggregates.get('homeTeam', {}).get('name')
    away_name = aggregates.get('awayTeam', {}).get('name')
    return home_name, away_name


@prediction_bp.route('/prediction/<int:match_id>/analytics', methods=['GET'])
def get_match_analytics(match_id):
    """H2H dari 2 sumber: API football-data.org (current season doang di free tier)
    + histori World Cup 2014-2026 dari Supabase (hasil ETL openfootball).

    Query param opsional:
        ?competition=World Cup  -> filter H2H dari API ke kompetisi tertentu
        ?competition=all        -> gak difilter, semua kompetisi ikut dihitung
    """
    competition_filter = request.args.get('competition', WORLD_CUP_KEYWORD)
    if competition_filter.lower() == 'all':
        competition_filter = None

    try:
        data = fetch_json(f"{MATCHES_BASE_URL}/{match_id}/head2head?limit=25")
    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code if e.response is not None else 502
        if status_code == 404:
            print(f"[Error] Match {match_id} not found: {str(e)}")
            return jsonify({"status": "error", "message": "Match tidak ditemukan."}), 404
        if status_code == 429:
            print(f"[Error] Rate limit hit fetching H2H for match {match_id}: {str(e)}")
            return jsonify({
                "status": "error",
                "message": "Rate limit API tercapai, coba lagi dalam beberapa saat.",
            }), 429
        print(f"[Error] HTTP error fetching H2H for match {match_id}: {str(e)}")
        return jsonify({"status": "error", "message": "Gagal mengambil data Head-to-Head."}), 502
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch H2H analytics for match {match_id}: {str(e)}")
        return jsonify({"status": "error", "message": "Gagal mengambil data Head-to-Head."}), 502

    insight = _build_analytics(data, competition_filter=competition_filter)

    # tambahan H2H historis, sifatnya pelengkap doang jadi kalau gagal
    # jangan sampai bikin endpoint ini error total
    home_name, away_name = _extract_team_names(data)
    historical_h2h = None
    if home_name and away_name:
        try:
            historical_h2h = get_h2h_from_history(home_name, away_name)
        except Exception as e:
            print(f"[Warning] Gagal ambil H2H historis untuk {home_name} vs {away_name}: {str(e)}")

    insight["historical_h2h"] = historical_h2h

    ai_insight_text = generate_match_insight(
        home_name or "Home Team",
        away_name or "Away Team",
        insight,
    )
    insight["ai_insight"] = ai_insight_text

    return jsonify({"status": "success", "data": insight}), 200

@prediction_bp.route('/prediction/ml-predict', methods=['GET'])
def ml_predict():
    """Prediksi menang/kalah/seri pakai model ML sederhana (Logistic Regression),
    dilatih dari histori H2H World Cup 2014-2026.

    Query param: ?team_a=Argentina&team_b=France
    """
    team_a = request.args.get('team_a')
    team_b = request.args.get('team_b')

    if not team_a or not team_b:
        return jsonify({
            "status": "error",
            "message": "Parameter team_a dan team_b wajib diisi.",
        }), 400

    try:
        result = predict_winner(team_a, team_b)
        return jsonify({"status": "success", "data": result}), 200
    except FileNotFoundError:
        return jsonify({
            "status": "error",
            "message": "Model belum di-training. Jalankan scripts/train_model.py dulu.",
        }), 500
    except Exception as e:
        print(f"[Error] Gagal predict {team_a} vs {team_b}: {str(e)}")
        return jsonify({"status": "error", "message": "Gagal melakukan prediksi."}), 500

@prediction_bp.route('/prediction/tournament-winner', methods=['GET'])
def tournament_winner():
    """Simulasi prediksi juara World Cup 2026 dari semifinal sampai final,
    pakai model ML yang sama dengan endpoint ml-predict."""
    try:
        result = simulate_tournament_winner()
        return jsonify({"status": "success", "data": result}), 200
    except FileNotFoundError:
        return jsonify({
            "status": "error",
            "message": "Model belum di-training. Jalankan scripts/train_model.py dulu.",
        }), 500
    except Exception as e:
        print(f"[Error] Gagal simulasi tournament winner: {str(e)}")
        return jsonify({"status": "error", "message": "Gagal melakukan simulasi."}), 500

@prediction_bp.route('/prediction', methods=['POST'])
def submit_prediction():
    """Menyimpan tebakan skor user ke Supabase."""
    data = request.json

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
        "predicted_away_score": data["predicted_away_score"],
    }

    try:
        response = supabase.table('predictions').insert(insert_data).execute()
        return jsonify({"status": "success", "message": "Tebakan skor berhasil disimpan!", "data": response.data}), 201
    except Exception as e:
        print(f"[Error] Failed to save prediction: {str(e)}")
        return jsonify({"status": "error", "message": "Gagal menyimpan prediksi."}), 500


@prediction_bp.route('/prediction/<int:match_id>/evaluate', methods=['PUT'])
def evaluate_predictions(match_id):
    """Mengevaluasi semua tebakan user untuk pertandingan yang sudah selesai."""
    try:
        match_data = fetch_json(f"{MATCHES_BASE_URL}/{match_id}")
    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code if e.response is not None else 502
        if status_code == 404:
            print(f"[Error] Match {match_id} not found during evaluation: {str(e)}")
            return jsonify({"status": "error", "message": "Match tidak ditemukan."}), 404
        print(f"[Error] HTTP error fetching match data for evaluation {match_id}: {str(e)}")
        return jsonify({"status": "error", "message": "Gagal mengambil data pertandingan dari API."}), 502
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch match data for evaluation {match_id}: {str(e)}")
        return jsonify({"status": "error", "message": "Gagal mengambil data pertandingan dari API."}), 502

    if match_data.get('status') != 'FINISHED':
        return jsonify({"status": "error", "message": "Pertandingan belum selesai, belum bisa dievaluasi."}), 400

    actual_home = match_data['score']['fullTime']['home']
    actual_away = match_data['score']['fullTime']['away']

    try:
        pending_preds = supabase.table('predictions').select('*').eq('match_id', match_id).eq('status', 'pending').execute()

        if not pending_preds.data:
            return jsonify({"status": "success", "message": "Tidak ada prediksi pending untuk dievaluasi."}), 200

        evaluated_count = 0
        failed_ids = []

        for pred in pending_preds.data:
            pred_id = pred['id']
            pred_home = pred['predicted_home_score']
            pred_away = pred['predicted_away_score']

            status = 'correct' if pred_home == actual_home and pred_away == actual_away else 'incorrect'

            try:
                supabase.table('predictions').update({
                    'actual_home_score': actual_home,
                    'actual_away_score': actual_away,
                    'status': status,
                }).eq('id', pred_id).execute()
                evaluated_count += 1
            except Exception as e:
                # satu gagal jangan sampe ngestop yang lain
                print(f"[Error] Gagal update prediksi id={pred_id}: {str(e)}")
                failed_ids.append(pred_id)

        result = {
            "status": "success",
            "message": f"Berhasil mengevaluasi {evaluated_count} tebakan.",
            "actual_score": f"{actual_home} - {actual_away}",
        }
        if failed_ids:
            result["partial_failure"] = True
            result["failed_prediction_ids"] = failed_ids

        return jsonify(result), 200

    except Exception as e:
        print(f"[Error] Gagal mengevaluasi prediksi: {str(e)}")
        return jsonify({"status": "error", "message": "Terjadi kesalahan internal saat evaluasi."}), 500