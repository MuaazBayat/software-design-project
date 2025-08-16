# database.py
# This file is responsible for initializing and managing the Supabase client.

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Use a relative path to ensure the .env file is found correctly.
# This assumes the .env file is in the root directory of your project.
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path)

# Retrieve Supabase credentials from environment variables.
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Initialize the Supabase client.
# This client instance is a singleton and will be reused throughout the application.
try:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase credentials not found in environment variables.")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    # Handle the case where the client cannot be initialized due to missing
    # environment variables or connection issues.
    supabase = None
    print(f"ERROR: Supabase client failed to initialize. Details: {e}")
