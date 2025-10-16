#!/usr/bin/env python3
"""
Generate a Clerk session token for API authentication testing.

This script creates a JWT session token that can be used to test authenticated endpoints.
The token is valid and can be used with ENABLE_AUTH=true.

Usage:
    python3 scripts/generate_clerk_token.py <user_id>
    python3 scripts/generate_clerk_token.py user_31EFLw4laYSru3ghCjb9o2uNee0

Requirements:
    - CLERK_SECRET_KEY must be set in environment
    - clerk-backend-api package installed
"""

import os
import sys


def generate_session_token(user_id: str) -> str:
    """Generate a Clerk session and get its JWT token."""

    clerk_secret = os.getenv("CLERK_SECRET_KEY")

    if not clerk_secret:
        print("ERROR: CLERK_SECRET_KEY not found in environment")
        print("Run: source .env")
        sys.exit(1)

    try:
        from clerk_backend_api import Clerk
        from clerk_backend_api.models import CreateSessionRequestBody

        # Initialize Clerk client
        clerk = Clerk(bearer_auth=clerk_secret)

        # Create a session for the user (testing only)
        print(f"Creating session for user: {user_id}")

        request_body = CreateSessionRequestBody(user_id=user_id)
        session = clerk.sessions.create(request=request_body)

        if not session or not session.id:
            print("ERROR: Failed to create session")
            sys.exit(1)

        # Get a JWT token for this session
        print(f"Generating JWT token for session: {session.id}")

        # Create a JWT token from the session
        from clerk_backend_api.models import CreateSessionTokenRequestBody

        token_request = CreateSessionTokenRequestBody()
        token_response = clerk.sessions.create_token(
            session_id=session.id,
            request=token_request
        )

        if not token_response or not token_response.jwt:
            print("ERROR: Failed to generate JWT token")
            sys.exit(1)

        return token_response.jwt

    except ImportError:
        print("ERROR: clerk-backend-api not installed")
        print("Run: pip3 install clerk-backend-api==3.3.1")
        sys.exit(1)
    except AttributeError as e:
        if "has no attribute 'create_token'" in str(e):
            print("ERROR: Cannot create JWT tokens via API")
            print("\nAlternative methods:")
            print("1. Get token from frontend: window.Clerk.session.getToken()")
            print("2. Use Clerk Dashboard to impersonate user")
            print("3. Set ENABLE_AUTH='false' for testing without auth")
            sys.exit(1)
        raise
    except Exception as e:
        print(f"ERROR: Failed to generate token: {str(e)}")
        print("\nPossible issues:")
        print("1. Invalid user_id - user may not exist in Clerk")
        print("2. Invalid CLERK_SECRET_KEY")
        print("3. Testing endpoints may be disabled in production")
        print("4. Network issues connecting to Clerk API")
        print("\nTry:")
        print("- Verify user exists: Go to https://dashboard.clerk.com")
        print("- Set ENABLE_AUTH='false' to test without authentication")
        sys.exit(1)


def test_token(token: str, user_id: str):
    """Test the generated token against a local endpoint."""
    import subprocess

    print("\n" + "="*70)
    print("TESTING TOKEN")
    print("="*70)

    # Test against core service
    core_url = os.getenv("CORE_URL", "http://localhost:8000")

    print(f"\nTesting GET {core_url}/profiles/{user_id}")

    cmd = [
        "curl", "-s", "-w", "\\nHTTP Status: %{http_code}\\n",
        "-H", f"Authorization: Bearer {token}",
        f"{core_url}/profiles/{user_id}"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout)

    if result.returncode != 0:
        print(f"Request failed: {result.stderr}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/generate_clerk_token.py <user_id>")
        print("\nExample:")
        print("  python3 scripts/generate_clerk_token.py user_31EFLw4laYSru3ghCjb9o2uNee0")
        print("\nTo get a user_id:")
        print("  1. Go to https://dashboard.clerk.com")
        print("  2. Select your application")
        print("  3. Go to 'Users' section")
        print("  4. Click on a user and copy their User ID")
        print("\nNote: This uses Clerk's testing API which may not work in production.")
        print("For production, use tokens from your frontend or Clerk Dashboard.")
        sys.exit(1)

    user_id = sys.argv[1]

    # Generate the token
    token = generate_session_token(user_id)

    print("\n" + "="*70)
    print("TOKEN GENERATED SUCCESSFULLY")
    print("="*70)
    print(f"\nUser ID: {user_id}")
    print(f"\nJWT Token:\n{token}")
    print("\n" + "="*70)
    print("HOW TO USE THIS TOKEN")
    print("="*70)
    print("\n1. Test with curl:")
    print(f'   curl -H "Authorization: Bearer {token}" \\')
    print(f'        http://localhost:8000/profiles/{user_id}')
    print("\n2. Use in your API client (Postman, Insomnia, etc.):")
    print("   Header: Authorization")
    print(f"   Value: Bearer {token}")
    print("\n3. Use in JavaScript:")
    print("   fetch(url, {")
    print(f'     headers: {{ "Authorization": "Bearer {token}" }}')
    print("   })")

    # Ask if user wants to test the token
    print("\n" + "="*70)
    response = input("\nWould you like to test this token against your API? (y/n): ")

    if response.lower() in ['y', 'yes']:
        test_token(token, user_id)

    print("\nCopy token to clipboard:")
    print(f"  echo '{token}' | pbcopy  # macOS")
    print(f"  echo '{token}' | xclip -selection clipboard  # Linux")


if __name__ == "__main__":
    main()