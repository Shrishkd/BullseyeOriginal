"""
Script to renew Upstox Access Token and update .env automatically.
Usage:
    python renew_upstox_token.py
"""

import os
import sys
import webbrowser
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import httpx
from dotenv import load_dotenv

candidate_paths = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "Backend", ".env"),
    os.path.join(os.getcwd(), ".env"),
    os.path.join(os.getcwd(), "Backend", ".env"),
]
ENV_PATH = next((p for p in candidate_paths if os.path.exists(p)), candidate_paths[0])
load_dotenv(ENV_PATH, override=True)

API_KEY = os.getenv("UPSTOX_API_KEY")
API_SECRET = os.getenv("UPSTOX_API_SECRET")
REDIRECT_URI = os.getenv("UPSTOX_REDIRECT_URI", "http://localhost:8080")

if not API_KEY or not API_SECRET:
    print("Error: UPSTOX_API_KEY or UPSTOX_API_SECRET is missing in .env")
    sys.exit(1)

auth_code_holder = {"code": None}

class OAuthCallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if "code" in params:
            auth_code_holder["code"] = params["code"][0]
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            success_html = """
            <html>
                <body style="font-family:sans-serif; text-align:center; padding:50px; background:#0f172a; color:#f8fafc;">
                    <h2 style="color:#22c55e;">&#10004; Upstox Authorization Successful!</h2>
                    <p>Authorization code received. You can now close this tab and return to the terminal.</p>
                </body>
            </html>
            """
            self.wfile.write(success_html.encode("utf-8"))
        else:
            self.send_response(400)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(b"No code parameter found in redirect.")

    def log_message(self, format, *args):
        # Suppress noisy HTTP server logs
        return


def update_env_token(new_token: str):
    if not os.path.exists(ENV_PATH):
        print(f"Error: {ENV_PATH} not found.")
        return False

    with open(ENV_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()

    token_found = False
    new_lines = []
    for line in lines:
        if line.startswith("UPSTOX_ACCESS_TOKEN="):
            new_lines.append(f"UPSTOX_ACCESS_TOKEN={new_token}\n")
            token_found = True
        else:
            new_lines.append(line)

    if not token_found:
        new_lines.append(f"\nUPSTOX_ACCESS_TOKEN={new_token}\n")

    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    print(f"Successfully saved new UPSTOX_ACCESS_TOKEN to {ENV_PATH}")
    return True


def exchange_code_for_token(code: str):
    token_url = "https://api.upstox.com/v2/login/authorization/token"
    payload = {
        "code": code,
        "client_id": API_KEY,
        "client_secret": API_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    headers = {
        "accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    print("\nExchanging authorization code for access token with Upstox API...")
    res = httpx.post(token_url, data=payload, headers=headers, timeout=20.0)

    if res.status_code != 200:
        print(f"Failed to fetch token ({res.status_code}): {res.text}")
        return None

    data = res.json()
    access_token = data.get("access_token")
    user_name = data.get("user_name", "User")

    if not access_token:
        print("Response did not contain an access_token:", data)
        return None

    print(f"Token received for: {user_name} ({data.get('user_id', '')})")
    return access_token


def test_token(token: str):
    print("Testing token with a live market quote (Reliance LTP)...")
    url = "https://api.upstox.com/v2/market-quote/ltp"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    params = {"instrument_key": "NSE_EQ|INE002A01018"}

    res = httpx.get(url, headers=headers, params=params, timeout=10.0)
    if res.status_code == 200:
        quote_data = res.json().get("data", {})
        print(f"Token is valid and live! Quote response: {quote_data}")
        return True
    else:
        print(f"Warning: Test quote request returned status {res.status_code}: {res.text}")
        return False


def main():
    encoded_redirect = urllib.parse.quote(REDIRECT_URI, safe="")
    login_url = (
        f"https://api.upstox.com/v2/login/authorization/dialog"
        f"?response_type=code&client_id={API_KEY}&redirect_uri={encoded_redirect}"
    )

    parsed_redirect = urllib.parse.urlparse(REDIRECT_URI)
    port = parsed_redirect.port or 8080

    print("=" * 60)
    print("Upstox Token Renewal Helper")
    print("=" * 60)
    print(f"Login URL:\n{login_url}\n")

    server = None
    try:
        server = HTTPServer(("localhost", port), OAuthCallbackHandler)
        server.timeout = 180  # Wait up to 3 minutes
        print(f"Listening on localhost:{port} for OAuth redirect...")
    except Exception as e:
        print(f"Note: Could not start local listener on port {port} ({e}). Manual input will be used.")

    print("Opening Upstox login page in default browser...")
    try:
        webbrowser.open(login_url)
    except Exception:
        pass

    if server:
        print(f"\nPlease log in via Upstox in your browser. Waiting up to 3 minutes for redirect...")
        while not auth_code_holder["code"]:
            server.handle_request()
            if auth_code_holder["code"]:
                break
        server.server_close()

    code = auth_code_holder.get("code")
    if not code:
        print("\nIf automatic redirect capture didn't catch the code, paste either:")
        print("1) The full redirected URL (e.g., http://localhost:8080/?code=XXXXXX), or")
        print("2) The code parameter directly.")
        user_input = input("Paste URL or code here (or press Enter to cancel): ").strip()
        if not user_input:
            print("Cancelled.")
            sys.exit(0)
        if "code=" in user_input:
            parsed = urllib.parse.urlparse(user_input)
            params = urllib.parse.parse_qs(parsed.query)
            code = params.get("code", [None])[0]
        else:
            code = user_input

    if not code:
        print("No valid authorization code provided.")
        sys.exit(1)

    token = exchange_code_for_token(code)
    if token:
        update_env_token(token)
        test_token(token)
        print("\nAll done! The backend will now serve live data with this token.")
    else:
        print("\nToken renewal failed.")


if __name__ == "__main__":
    main()
