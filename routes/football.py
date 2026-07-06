import requests
from flask import Blueprint, jsonify, request

from services.external_api import fetch_json

football_bp = Blueprint('football', __name__)

BASE_URL = "http://api.football-data.org/v4/competitions"
TEAMS_BASE_URL = "http://api.football-data.org/v4/teams"

KNOCKOUT_STAGES = [
    ('LAST_32', 'Round of 32'),
    ('LAST_16', 'Round of 16'),
    ('QUARTER_FINALS', 'Quarter-finals'),
    ('SEMI_FINALS', 'Semi-finals'),
    ('THIRD_PLACE', '3rd Place'),
    ('FINAL', 'Final'),
]


def _format_bracket_match(match):
    home = match.get('homeTeam') or {}
    away = match.get('awayTeam') or {}
    score = match.get('score', {}).get('fullTime') or {}
    return {
        "id": match.get('id'),
        "stage": match.get('stage'),
        "status": match.get('status'),
        "utcDate": match.get('utcDate'),
        "homeTeam": {
            "name": home.get('name') or home.get('shortName'),
            "shortName": home.get('shortName') or home.get('name'),
            "crest": home.get('crest'),
        },
        "awayTeam": {
            "name": away.get('name') or away.get('shortName'),
            "shortName": away.get('shortName') or away.get('name'),
            "crest": away.get('crest'),
        },
        "score": {
            "home": score.get('home'),
            "away": score.get('away'),
        },
    }


def _build_standings_payload(comp_code: str, group_query: str | None):
    data = fetch_json(f"{BASE_URL}/{comp_code}/standings")
    all_standings = data.get('standings', [])

    if comp_code == 'WC':
        groups = [
            {"group": s['group'], "table": s['table']}
            for s in all_standings if s.get('type') == 'TOTAL'
        ]
        group_names = [g['group'] for g in groups]

        selected = groups[0]
        if group_query:
            match = next(
                (g for g in groups if g['group'].lower() == group_query.lower()),
                None,
            )
            if match:
                selected = match

        return {
            "data": {
                "table": selected['table'],
                "group": selected['group'],
                "groups": group_names,
            }
        }

    return {
        "data": {
            "table": all_standings[0]['table'] if all_standings else [],
            "group": None,
            "groups": None,
        }
    }


@football_bp.route('/standings', methods=['GET'])
def get_standings():
    comp_code = request.args.get('competition', 'PL').upper()
    group_query = request.args.get('group')

    try:
        payload = _build_standings_payload(comp_code, group_query)
        return jsonify({"status": "success", **payload}), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch standings data for {comp_code}: {str(e)}")
        return jsonify({"status": "error", "message": f"Failed to retrieve {comp_code} standings data."}), 500


@football_bp.route('/bracket', methods=['GET'])
def get_bracket():
    comp_code = request.args.get('competition', 'WC').upper()

    try:
        data = fetch_json(f"{BASE_URL}/{comp_code}/matches")
        matches = data.get('matches', [])
        knockout = [m for m in matches if m.get('stage') != 'GROUP_STAGE']

        bracket = {}
        for stage_code, stage_label in KNOCKOUT_STAGES:
            stage_matches = sorted(
                [m for m in knockout if m.get('stage') == stage_code],
                key=lambda x: x.get('utcDate') or '',
            )
            if stage_matches:
                bracket[stage_code] = {
                    "label": stage_label,
                    "matches": [_format_bracket_match(m) for m in stage_matches],
                }

        return jsonify({"status": "success", "data": bracket}), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch bracket data for {comp_code}: {str(e)}")
        return jsonify({"status": "error", "message": f"Failed to retrieve {comp_code} bracket data."}), 500


def _get_scheduled_matches_raw(comp_code: str):
    data = fetch_json(f"{BASE_URL}/{comp_code}/matches?status=SCHEDULED")
    return data.get("matches", [])


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
    data = fetch_json(f"{BASE_URL}/{comp_code}/scorers")
    return data.get("scorers", [])


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
    data = fetch_json(f"{BASE_URL}/{comp_code}/matches?status=FINISHED")
    return sorted(data.get("matches", []), key=lambda x: x['utcDate'], reverse=True)


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
    data = fetch_json(f"{BASE_URL}/{comp_code}/teams")
    teams = data.get('teams', [])
    return [
        {
            "id": t.get('id'),
            "name": t.get('name'),
            "shortName": t.get('shortName'),
            "crest": t.get('crest'),
            "venue": t.get('venue'),
            "clubColors": t.get('clubColors'),
            "website": t.get('website'),
            "founded": t.get('founded'),
        }
        for t in teams
    ]


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
    try:
        data = fetch_json(f"{TEAMS_BASE_URL}/{team_id}")
        squad = data.get('squad', [])
        coach = data.get('coach', {})
        squad_info = [
            {
                "id": player.get('id'),
                "name": player.get('name'),
                "position": player.get('position'),
                "dateOfBirth": player.get('dateOfBirth'),
                "nationality": player.get('nationality'),
                "shirtNumber": player.get('shirtNumber') or "N/A",
            }
            for player in squad
        ]
        payload = {
            "status": "success",
            "teamName": data.get('name'),
            "coach": coach.get('name') if coach else "Unknown",
            "data": squad_info,
        }
        return jsonify(payload), 200
    except requests.exceptions.RequestException as e:
        print(f"[Error] Failed to fetch squad data for team ID {team_id}: {str(e)}")
        return jsonify({"status": "error", "message": "Failed to retrieve team squad data."}), 500
