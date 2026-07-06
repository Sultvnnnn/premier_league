import os
from flask import Flask, render_template
from flask_cors import CORS

from routes.football import football_bp
from routes.auth import auth_bp
from routes.watchlist import watchlist_bp
from routes.prediction import prediction_bp
from routes.profile import profile_bp

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    static_folder=os.path.join(_BASE_DIR, "static"),
    template_folder=os.path.join(_BASE_DIR, "templates"),
)

CORS(app)


# ── Page Routes ────────────────────────────────────────────────

@app.route("/")
def home():
    return render_template("pages/home.html", active_page="home")


@app.route("/standings")
def standings():
    return render_template("pages/standings.html", active_page="standings")


@app.route("/fixtures")
def fixtures():
    return render_template("pages/fixtures.html", active_page="fixtures")


@app.route("/results")
def results():
    return render_template("pages/results.html", active_page="results")


@app.route("/scorers")
def scorers():
    return render_template("pages/scorers.html", active_page="scorers")


@app.route("/assists")
def assists():
    return render_template("pages/assists.html", active_page="assists")


@app.route("/teams")
def teams():
    return render_template("pages/teams.html", active_page="teams")


@app.route("/watchlist")
def watchlist():
    return render_template("pages/watchlist.html", active_page="watchlist")


@app.route("/profile")
def profile():
    return render_template("pages/profile.html", active_page="profile")


@app.route("/login")
def login():
    return render_template("pages/login.html", active_page="login")


@app.route("/register")
def register():
    return render_template("pages/register.html", active_page="register")


# ── API Blueprints ─────────────────────────────────────────────

app.register_blueprint(football_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(watchlist_bp, url_prefix='/api')
app.register_blueprint(prediction_bp, url_prefix='/api')
app.register_blueprint(profile_bp, url_prefix='/api')

if __name__ == '__main__':
    print("[Info] Backend server is running successfully on http://127.0.0.1:5000")
    app.run(debug=True)
