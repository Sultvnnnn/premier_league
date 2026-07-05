import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("[SUCCESS] Supabase client initialized successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to initialize Supabase client: {str(e)}")
else:
    print("[Warning] Supabase credentials not found in .env file.")
