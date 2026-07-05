import time
from threading import Lock
from flask import Blueprint, jsonify, request
import requests
import os

football_bp = Blueprint('football', __name__)

API_KEY = os.getenv("FOOTBALL_API_KEY")
BASE_URL = "http://api.football-data.org/v4/competitions"
HEADERS = {"X-Auth-Token": API_KEY}

_cache: dict[str, tuple[float, object]] = {}
_cache_lock = Lock()

TTL_STANDINGS = 300
TTL_FIXTURES = 180
TTL_RESULTS = 180
TTL_SCORERS = 600
TTL_TEAMS = 900
TTL_SQUAD = 1800

def _cache_get(key: str):
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() > expires_at:
            del _cache[key]
            return None
        return value

def _cache_set(key: str, value: object, ttl_seconds: float) -> None:
    with _cache_lock:
        _cache[key] = (time.monotonic() + ttl_seconds, value)

def _fetch_json(url: str) -> dict:
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()

@football_bp.route('/standings', methods=['GET'])
def get_standings():
    # Tangkap query parameter, default ke Premier League (PL) jika kosong
    comp_code = request.args.get('competition', 'PL').upper()
    cache_key = f"standings:{comp_code}:table"
    
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify({"status": "success", "data": cached}), 200
        
    try:
        data = _fetch_json(f"{BASE_URL}/{comp_code}/standings")
        standings = data['standings'][0]['table']
        _cache_set(cache_key, standings, TTL_STANDINGS)
        return jsonify({"status": "success", "data": standings}), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch standings data for {comp_code}: {str(e)}")
        return jsonify({"status": "error", "message": f"Failed to retrieve {comp_code} standings data."}), 500

def _get_scheduled_matches_raw(comp_code: str):
    cache_key = f"upstream:matches:scheduled:{comp_code}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    data = _fetch_json(f"{BASE_URL}/{comp_code}/matches?status=SCHEDULED")
    matches = data.get("matches", [])
    _cache_set(cache_key, matches, TTL_FIXTURES)
    return matches

@football_bp.route('/fixtures', methods=['GET'])
def get_fixtures():
    comp_code = request.args.get('competition', 'PL').upper()
    team_query = request.args.get('team')
    try:
        matches = list(_get_scheduled_matches_raw(comp_code))
        if team_query:
            tq = team_query.lower()
            matches = [
                m for m in matches
                if tq in m['homeTeam']['name'].lower()
                or tq in m['awayTeam']['name'].lower()
            ]
        else:
            matches = matches[:10]
        return jsonify({"status": "success", "data": matches}), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch fixtures data for {comp_code}: {str(e)}")
        return jsonify({"status": "error", "message": f"Failed to retrieve {comp_code} fixtures data."}), 500

def _get_scorers_raw(comp_code: str):
    cache_key = f"upstream:scorers:{comp_code}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    data = _fetch_json(f"{BASE_URL}/{comp_code}/scorers")
    scorers = data.get("scorers", [])
    _cache_set(cache_key, scorers, TTL_SCORERS)
    return scorers

@football_bp.route('/top-scorers', methods=['GET'])
def get_top_scorers():
    comp_code = request.args.get('competition', 'PL').upper()
    try:
        scorers = list(_get_scorers_raw(comp_code))
        return jsonify({"status": "success", "data": scorers}), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch top scorers data for {comp_code}: {str(e)}")
        return jsonify({"status": "error", "message": f"Failed to retrieve top scorers data for {comp_code}."}), 500

@football_bp.route('/top-assists', methods=['GET'])
def get_top_assists():
    comp_code = request.args.get('competition', 'PL').upper()
    try:
        players = list(_get_scorers_raw(comp_code))
        assists_data = [p for p in players if p.get('assists') is not None and p.get('assists') > 0]
        sorted_assists = sorted(assists_data, key=lambda x: x['assists'], reverse=True)
        return jsonify({"status": "success", "data": sorted_assists}), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch top assists data for {comp_code}: {str(e)}")
        return jsonify({"status": "error", "message": f"Failed to retrieve top assists data for {comp_code}."}), 500

def _get_finished_matches_raw(comp_code: str):
    cache_key = f"upstream:matches:finished:{comp_code}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    data = _fetch_json(f"{BASE_URL}/{comp_code}/matches?status=FINISHED")
    matches = sorted(data.get("matches", []), key=lambda x: x['utcDate'], reverse=True)
    _cache_set(cache_key, matches, TTL_RESULTS)
    return matches

@football_bp.route('/results', methods=['GET'])
def get_results():
    comp_code = request.args.get('competition', 'PL').upper()
    team_query = request.args.get('team')
    try:
        matches = list(_get_finished_matches_raw(comp_code))
        if team_query:
            tq = team_query.lower()
            matches = [
                m for m in matches
                if tq in m['homeTeam']['name'].lower()
                or tq in m['awayTeam']['name'].lower()
            ][:10]
        else:
            matches = matches[:10]
        return jsonify({"status": "success", "data": matches}), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch match results data for {comp_code}: {str(e)}")
        return jsonify({"status": "error", "message": f"Failed to retrieve match results data for {comp_code}."}), 500

def _get_teams_info_raw(comp_code: str):
    cache_key = f"upstream:teams:{comp_code}:info"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    data = _fetch_json(f"{BASE_URL}/{comp_code}/teams")
    teams = data.get('teams', [])
    team_info = []
    for t in teams:
        team_info.append({
            "id": t.get('id'),
            "name": t.get('name'),
            "shortName": t.get('shortName'),
            "crest": t.get('crest'),
            "venue": t.get('venue'),
            "clubColors": t.get('clubColors'),
            "website": t.get('website'),
            "founded": t.get('founded')
        })
    _cache_set(cache_key, team_info, TTL_TEAMS)
    return team_info

@football_bp.route('/teams', methods=['GET'])
def get_teams():
    comp_code = request.args.get('competition', 'PL').upper()
    team_query = request.args.get('team')
    try:
        team_info = list(_get_teams_info_raw(comp_code))
        if team_query:
            tq = team_query.lower()
            team_info = [
                team for team in team_info
                if tq in str(team['name']).lower()
                or tq in str(team['shortName']).lower()
            ]
        return jsonify({"status": "success", "data": team_info}), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch teams data for {comp_code}: {str(e)}")
        return jsonify({"status": "error", "message": f"Failed to retrieve teams data for {comp_code}."}), 500

@football_bp.route('/squad/<int:team_id>', methods=['GET'])
def get_squad(team_id):
    cache_key = f"squad:{team_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify(cached), 200
    try:
        # Endpoint ini unik karena tidak butuh kode kompetisi, langsung pakai ID tim universal
        url = f"http://api.football-data.org/v4/teams/{team_id}"
        data = _fetch_json(url)
        squad = data.get('squad', [])
        coach = data.get('coach', {})
        squad_info = []
        for player in squad:
            squad_info.append({
                "id": player.get('id'),
                "name": player.get('name'),
                "position": player.get('position'),
                "dateOfBirth": player.get('dateOfBirth'),
                "nationality": player.get('nationality'),
                "shirtNumber": player.get('shirtNumber') or "N/A",
            })
        payload = {
            "status": "success",
            "teamName": data.get('name'),
            "coach": coach.get('name') if coach else "Unknown",
            "data": squad_info
        }
        _cache_set(cache_key, payload, TTL_SQUAD)
        return jsonify(payload), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch squad data for team ID {team_id}: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to retrieve team squad data."}), 500