import os
from supabase import create_client, Client

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

def sign_up():
    email = "test@test.com"
    password = "password"
    try:
        response = supabase.auth.sign_up({"email": email, "password": password})
        print(response)
    except Exception as e:
        print(e)

if __name__ == "__main__":
    sign_up()
