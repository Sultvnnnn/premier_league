# ⚽ Football Data API (Premier League & World Cup)

A robust REST API built with **Flask** that integrates **football-data.org** for match statistics and **Supabase** for secure user authentication, personalized watchlists, user profiles, and match predictions.

---

## 🚀 Features

* 📊 **Multi-Competition Data** — Standings, fixtures, results, top scorers, assists, and squad details with dynamic support for Premier League (PL) and World Cup (WC).
* 🔐 **Authentication & Profiles** — Secure user registration/login, user profile management, and avatar uploads powered by **Supabase Auth & Storage**.
* 🎯 **Prediction System** — Custom Head-to-Head (H2H) analytics, win probability calculation, and a prediction scoring system.
* 📋 **Watchlist** — Personalized CRUD functionality to save and manage match notes in the cloud.

---

## 🛠️ Tech Stack

* **Python** + **Flask** (Modular with Blueprints)
* **Supabase** — Backend-as-a-Service for Auth, Database, and Cloud Storage
* **Flask-CORS** — Cross-origin support
* **python-dotenv** — Environment variable management

---

## ⚙️ Installation & Setup

### 1. Clone & Setup Environment

```bash
git clone https://github.com/Sultvnnnn/premier_league.git
cd premier_league

# Create & activate venv
python -m venv venv
# Windows: venv\Scripts\activate
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
```

### 3. Run the Server

```bash
python app.py
```

---

## 📡 API Endpoints

### ⚽ Football Data (Multi-League)

> **Note:** By default, all endpoints fetch **Premier League** data. Append `?competition=WC` to fetch **World Cup** data (e.g., `/api/standings?competition=WC`).

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/standings` | Competition standings table |
| `GET` | `/api/fixtures` | Upcoming scheduled fixtures |
| `GET` | `/api/results` | Latest finished match results |
| `GET` | `/api/top-scorers` | Top goal scorers |
| `GET` | `/api/top-assists` | Top assist providers |
| `GET` | `/api/teams` | List of teams and club details |
| `GET` | `/api/squad/<team_id>` | Team squad & coach details (Universal ID) |

### 👤 User Profile & Settings

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/profile?user_id=<id>` | Get user profile and favorite team |
| `POST` | `/api/profile` | Create or update user profile |
| `POST` | `/api/profile/avatar` | Upload avatar to Supabase Storage |

### 🎯 Match Prediction System

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/prediction/<id>/analytics` | Get H2H analytics and win probabilities |
| `POST` | `/api/prediction` | Submit a score prediction |
| `PUT` | `/api/prediction/<id>/evaluate` | Evaluate pending predictions against actual score |

### 📋 Auth & Watchlist (Supabase)

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/register` | Register a new user |
| `POST` | `/api/login` | Login user |
| `POST` | `/api/watchlist` | Add match to watchlist |
| `GET` | `/api/watchlist?user_id=<id>` | Get user's saved matches |
| `PUT` | `/api/watchlist/<id>` | Update match notes |
| `DELETE` | `/api/watchlist/<id>` | Remove match from watchlist |

---

## 📁 Project Structure

```text
premier_league/
├── app.py              # Application entry point & Blueprints setup
├── config.py           # Supabase connection configuration
├── routes/             # Modular API route handlers
│   ├── auth.py         # Registration & Login logic
│   ├── football.py     # External API fetcher (Multi-competition)
│   ├── prediction.py   # Prediction & H2H analytics logic
│   ├── profile.py      # User profile & avatar upload logic
│   └── watchlist.py    # CRUD operations for saved matches
├── .env                # Environment variables (Gitignored)
├── requirements.txt    # Python dependencies
└── ...
```

---

## 📝 Notes

* Ensure the **"Confirm email"** setting is **disabled** in your Supabase Auth dashboard for seamless local testing.
* For Avatar uploads, ensure a public bucket named `avatars` is created in Supabase Storage with unrestricted `INSERT`, `UPDATE`, and `SELECT` RLS policies.
* The `.env` file is intentionally excluded from version control for security.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
