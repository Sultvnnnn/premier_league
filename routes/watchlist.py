from flask import Blueprint, request, jsonify
from config import supabase

watchlist_bp = Blueprint('watchlist', __name__)

@watchlist_bp.route('/watchlist', methods=['POST'])
def add_to_watchlist():
    if not supabase:
        return jsonify({"status": "error", "message": "Database connection is not configured."}), 500
        
    data = request.json
    if not data or 'match_id' not in data:
        return jsonify({"status": "error", "message": "Match ID is required."}), 400
        
    insert_data = {
        "user_id": data.get("user_id", "1003240033"),
        "match_id": data["match_id"],
        "home_team": data.get("home_team", "Unknown"),
        "away_team": data.get("away_team", "Unknown"),
        "match_date": data.get("match_date", ""),
        "notes": data.get("notes", "")
    }
    
    try:
        response = supabase.table('watchlist').insert(insert_data).execute()
        return jsonify({
            "status": "success", 
            "message": "Match successfully added to watchlist.", 
            "data": response.data
        }), 201
    except Exception as e:
        print(f"[Error] Failed to insert data into watchlist: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to add match to watchlist."}), 500


@watchlist_bp.route('/watchlist', methods=['GET'])
def get_watchlist():
    if not supabase:
        return jsonify({"status": "error", "message": "Database connection is not configured."}), 500
    
    user_id = request.args.get('user_id', '1003240033')
    
    try:
        response = supabase.table('watchlist').select('*').eq('user_id', user_id).execute()
        return jsonify({"status": "success", "data": response.data}), 200
    except Exception as e:
        print(f"[Error] Failed to fetch watchlist data: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to retrieve watchlist data."}), 500


@watchlist_bp.route('/watchlist/<int:id>', methods=['PUT'])
def update_watchlist(id):
    if not supabase:
        return jsonify({"status": "error", "message": "Database connection is not configured."}), 500
        
    data = request.json
    if not data or 'notes' not in data:
        return jsonify({"status": "error", "message": "Notes field is required for update."}), 400
        
    try:
        response = supabase.table('watchlist').update({"notes": data["notes"]}).eq("id", id).execute()
        return jsonify({
            "status": "success", 
            "message": "Watchlist notes updated successfully.", 
            "data": response.data
        }), 200
    except Exception as e:
        print(f"[Error] Failed to update watchlist data: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to update watchlist notes."}), 500


@watchlist_bp.route('/watchlist/<int:id>', methods=['DELETE'])
def delete_watchlist(id):
    if not supabase:
        return jsonify({"status": "error", "message": "Database connection is not configured."}), 500
        
    try:
        response = supabase.table('watchlist').delete().eq("id", id).execute()
        return jsonify({"status": "success", "message": "Match successfully removed from watchlist."}), 200
    except Exception as e:
        print(f"[Error] Failed to delete data from watchlist: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to delete match from watchlist."}), 500