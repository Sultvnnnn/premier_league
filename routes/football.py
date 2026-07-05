import time
from threading import Lock
from flask import Blueprint, jsonify, request
import requests

football_bp = Blueprint('football', __name__)

API_KEY = "4da351778ae44a7fb74bcfcb0550db61"
BASE_URL = "http://api.football-data.org/v4/competitions/PL"
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
    cache_key = "standings:table"
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify({"status": "success", "data": cached}), 200
    try:
        data = _fetch_json(f"{BASE_URL}/standings")
        standings = data['standings'][0]['table']
        _cache_set(cache_key, standings, TTL_STANDINGS)
        return jsonify({"status": "success", "data": standings}), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch standings data: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to retrieve Premier League standings data."}), 500

def _get_scheduled_matches_raw():
    cache_key = "upstream:matches:scheduled"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    data = _fetch_json(f"{BASE_URL}/matches?status=SCHEDULED")
    matches = data.get("matches", [])
    _cache_set(cache_key, matches, TTL_FIXTURES)
    return matches

@football_bp.route('/fixtures', methods=['GET'])
def get_fixtures():
    team_query = request.args.get('team')
    try:
        matches = list(_get_scheduled_matches_raw())
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
        print(f"[Error] Failed to fetch fixtures data: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to retrieve Premier League fixtures data."}), 500

def _get_scorers_raw():
    cache_key = "upstream:scorers:pl"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    data = _fetch_json(f"{BASE_URL}/scorers")
    scorers = data.get("scorers", [])
    _cache_set(cache_key, scorers, TTL_SCORERS)
    return scorers

@football_bp.route('/top-scorers', methods=['GET'])
def get_top_scorers():
    try:
        scorers = list(_get_scorers_raw())
        return jsonify({"status": "success", "data": scorers}), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch top scorers data: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to retrieve top scorers data."}), 500

@football_bp.route('/top-assists', methods=['GET'])
def get_top_assists():
    try:
        players = list(_get_scorers_raw())
        assists_data = [p for p in players if p.get('assists') is not None and p.get('assists') > 0]
        sorted_assists = sorted(assists_data, key=lambda x: x['assists'], reverse=True)
        return jsonify({"status": "success", "data": sorted_assists}), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch top assists data: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to retrieve top assists data."}), 500

def _get_finished_matches_raw():
    cache_key = "upstream:matches:finished"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    data = _fetch_json(f"{BASE_URL}/matches?status=FINISHED")
    matches = sorted(data.get("matches", []), key=lambda x: x['utcDate'], reverse=True)
    _cache_set(cache_key, matches, TTL_RESULTS)
    return matches

@football_bp.route('/results', methods=['GET'])
def get_results():
    team_query = request.args.get('team')
    try:
        matches = list(_get_finished_matches_raw())
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
        print(f"[Error] Failed to fetch match results data: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to retrieve match results data."}), 500

def _get_teams_info_raw():
    cache_key = "upstream:teams:pl:info"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    data = _fetch_json(f"{BASE_URL}/teams")
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
    team_query = request.args.get('team')
    try:
        team_info = list(_get_teams_info_raw())
        if team_query:
            tq = team_query.lower()
            team_info = [
                team for team in team_info
                if tq in str(team['name']).lower()
                or tq in str(team['shortName']).lower()
            ]
        return jsonify({"status": "success", "data": team_info}), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch teams data: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to retrieve teams data."}), 500

@football_bp.route('/squad/<int:team_id>', methods=['GET'])
def get_squad(team_id):
    cache_key = f"squad:{team_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify(cached), 200
    try:
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