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

@app.route("/")
def index():
    return render_template("index.html")

# Mendaftarkan semua routes dengan otomatisasi prefix '/api'
app.register_blueprint(football_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(watchlist_bp, url_prefix='/api')
app.register_blueprint(prediction_bp, url_prefix='/api')
app.register_blueprint(profile_bp, url_prefix='/api')

if __name__ == '__main__':
    print("[Info] Backend server is running successfully on http://127.0.0.1:5000")
    app.run(debug=True)