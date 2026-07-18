# ⚽ Football Hub (Premier League & World Cup)

A robust REST API built with **Flask** that integrates **football-data.org** for match statistics and **Supabase** for secure user authentication, personalized watchlists, user profiles, and AI-powered match predictions.

---

## 🚀 Features

- 📊 **Multi-Competition Data** — Standings, fixtures, results, top scorers, assists, and squad details with dynamic support for Premier League (PL) and World Cup (WC).
- 🔐 **Authentication & Profiles** — Secure user registration/login, user profile management, and avatar uploads powered by **Supabase Auth & Storage**.
- 🎯 **Prediction System** — Custom Head-to-Head (H2H) analytics, win probability calculation, and a prediction scoring system.
- 🤖 **ML-Powered Predictions** — Logistic Regression model trained on historical match data (World Cup 2014-2026 & Premier League 5 seasons), with automatic league detection from team names.
- 💬 **AI Insight** — Auto-generated narrative insight for every prediction, powered by Groq (Llama 3.3).
- 📋 **Watchlist** — Personalized CRUD functionality to save and manage match notes in the cloud.

---

## 🛠️ Tech Stack

- **Python** + **Flask** (Modular with Blueprints)
- **Supabase** — Backend-as-a-Service for Auth, Database, and Cloud Storage
- **scikit-learn** + **pandas** — Machine learning model training and feature engineering
- **Groq API** (Llama 3.3) — AI-generated match insights
- **Flask-CORS** — Cross-origin support
- **python-dotenv** — Environment variable management

---

## ⚙️ Installation & Setup

### 1. Clone & Setup Environment

```bash
git clone https://github.com/Sultvnnnn/premier_league.git
cd premier_league

# Create & activate venv
python -m venv venv
# Windows: source venv/Scripts/activate
# Mac/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Credentials

Create a `.env` file in the root directory and add your API keys:

```env
FOOTBALL_API_KEY=your_football_data_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_public_key
GROQ_API_KEY=your_groq_api_key
```

### 3. Set Up the Database

Run `database_schema.sql` in your Supabase SQL Editor to create all required tables.

### 4. Populate Historical Match Data

The ML prediction feature needs historical data before it can work. Run the ETL scripts once to populate the database:

```bash
python scripts/etl_wc_history.py
python scripts/etl_pl_history.py
```

These scripts fetch data from [openfootball](https://github.com/openfootball) (World Cup 2014-2026 and Premier League, last 5 seasons) and are safe to re-run anytime to refresh the data — they use upsert, so no duplicates are created.

### 5. Train the Prediction Models

```bash
python scripts/train_model.py --league wc
python scripts/train_model.py --league pl
```

This generates `model_wc_predictor.pkl` and `model_pl_predictor.pkl`, used by the ML prediction endpoint.

### 6. Run the Server

```bash
python app.py
```

---

## 📡 API Endpoints

### ⚽ Football Data (Multi-League)

> **Note:** By default, all endpoints fetch **Premier League** data. Append `?competition=WC` to fetch **World Cup** data (e.g., `/api/standings?competition=WC`).

| Method | Endpoint               | Description                               |
| ------ | ---------------------- | ----------------------------------------- |
| `GET`  | `/api/standings`       | Competition standings table               |
| `GET`  | `/api/fixtures`        | Upcoming scheduled fixtures               |
| `GET`  | `/api/results`         | Latest finished match results             |
| `GET`  | `/api/top-scorers`     | Top goal scorers                          |
| `GET`  | `/api/top-assists`     | Top assist providers                      |
| `GET`  | `/api/teams`           | List of teams and club details            |
| `GET`  | `/api/squad/<team_id>` | Team squad & coach details (Universal ID) |

### 👤 User Profile & Settings

| Method | Endpoint                    | Description                        |
| ------ | --------------------------- | ---------------------------------- |
| `GET`  | `/api/profile?user_id=<id>` | Get user profile and favorite team |
| `POST` | `/api/profile`              | Create or update user profile      |
| `POST` | `/api/profile/avatar`       | Upload avatar to Supabase Storage  |

### 🎯 Match Prediction System

| Method | Endpoint                                                 | Description                                                                                    |
| ------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `GET`  | `/api/prediction/<id>/analytics`                         | H2H analytics (API + historical) + AI insight for a World Cup match                            |
| `GET`  | `/api/prediction/ml-predict?team_a=<name>&team_b=<name>` | ML-based win/draw/loss prediction + AI insight. Auto-detects league (WC or PL) from team names |
| `GET`  | `/api/prediction/tournament-winner`                      | Simulated World Cup 2026 champion prediction                                                   |
| `POST` | `/api/prediction`                                        | Submit a score prediction                                                                      |
| `PUT`  | `/api/prediction/<id>/evaluate`                          | Evaluate pending predictions against actual score                                              |

### 📋 Auth & Watchlist (Supabase)

| Method   | Endpoint                      | Description                 |
| -------- | ----------------------------- | --------------------------- |
| `POST`   | `/api/register`               | Register a new user         |
| `POST`   | `/api/login`                  | Login user                  |
| `POST`   | `/api/watchlist`              | Add match to watchlist      |
| `GET`    | `/api/watchlist?user_id=<id>` | Get user's saved matches    |
| `PUT`    | `/api/watchlist/<id>`         | Update match notes          |
| `DELETE` | `/api/watchlist/<id>`         | Remove match from watchlist |

---

## 📁 Project Structure

```text
premier_league/
├── app.py                     # Application entry point & Blueprints setup
├── config.py                  # Supabase connection configuration
├── database_schema.sql        # Full SQL schema for all tables
├── model_wc_predictor.pkl     # Trained ML model — World Cup
├── model_pl_predictor.pkl     # Trained ML model — Premier League
├── routes/                    # Modular API route handlers
│   ├── auth.py                # Registration & Login logic
│   ├── football.py            # External API fetcher (Multi-competition)
│   ├── prediction.py          # Prediction, H2H analytics, and ML endpoints
│   ├── profile.py             # User profile & avatar upload logic
│   └── watchlist.py           # CRUD operations for saved matches
├── services/
│   ├── external_api.py        # football-data.org fetcher with in-memory cache
│   ├── wc_h2h.py               # Historical World Cup H2H query (Supabase)
│   ├── ml_predictor.py        # Generic ML prediction logic (WC & PL, auto-detect)
│   └── ai_insight.py          # AI-generated match insight via Groq
├── scripts/                   # One-time / manual data pipeline scripts
│   ├── etl_wc_history.py      # Fetch & load World Cup historical data
│   ├── etl_pl_history.py      # Fetch & load Premier League historical data
│   └── train_model.py         # Train ML models (--league wc / --league pl)
├── .env                        # Environment variables (Gitignored)
├── requirements.txt            # Python dependencies
└── ...
```

---

## 🤖 About the Prediction System

The prediction feature combines multiple data sources to work around free-tier API limitations:

1. **Live H2H** from football-data.org — filtered by competition, flagged when sample size is too small to be reliable.
2. **Historical H2H** from [openfootball](https://github.com/openfootball) datasets (World Cup 2014-2026, Premier League last 5 seasons), stored in Supabase and refreshed manually via ETL scripts.
3. **ML prediction** — a Logistic Regression model trained on H2H-derived features (win rate, average goals, meeting count), producing win/draw/loss probabilities. One model is trained per league; the correct one is selected automatically based on the team names provided.
4. **AI Insight** — every prediction result is passed to Groq (Llama 3.3) to generate a short natural-language summary in Bahasa Indonesia.

**Known limitations:** the historical dataset is relatively small (296 World Cup matches, ~1900 Premier League matches), so model accuracy is modest (~44-50%) and draws are historically hard for the model to predict. All prediction responses include a `low_confidence` flag when fewer than 3 historical meetings are found, so this should always be surfaced in the UI.

---

## 📝 Notes

- Ensure the **"Confirm email"** setting is **disabled** in your Supabase Auth dashboard for seamless local testing.
- For Avatar uploads, ensure a public bucket named `avatars` is created in Supabase Storage with unrestricted `INSERT`, `UPDATE`, and `SELECT` RLS policies.
- The `.env` file is intentionally excluded from version control for security.
- Historical data ETL scripts (`etl_wc_history.py`, `etl_pl_history.py`) can be re-run anytime to refresh data as new matches finish — they use upsert and won't create duplicates.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
