"""
Simple load test for GlobeTalk Core API.

Tests:
1. /health endpoint (no auth)
2. GET /profiles/{clerk_id} with real and fake IDs

Usage:
    # Headless mode (100 users, 60 seconds)
    locust -f tests/load/core_load_test.py \
      --host=https://globetalk-core-388957617777.us-central1.run.app \
      --headless -u 100 -r 10 -t 60s

    # Web UI (for screenshots)
    locust -f tests/load/core_load_test.py \
      --host=https://globetalk-core-388957617777.us-central1.run.app

    Then open http://localhost:8089
"""

from locust import HttpUser, task, between
import random


class CoreAPIUser(HttpUser):
    """
    Simulates users interacting with the Core API.
    50% health checks, 50% profile requests.
    """

    # Wait 1-2 seconds between requests
    wait_time = between(1, 2)

    # Real Clerk IDs from database
    real_clerk_ids = [
        "024e2cf5-ef47-4ada-a49a-d344c90f8311",
        "0a0cdf8a-ec2c-4ce8-b347-a44eb1abbca1",
        "2404cf5e-69e0-49e1-a122-0156c25f5719",
    ]

    # Fake ID to test 404 handling
    fake_clerk_id = "user_fake_nonexistent_12345"

    @task(5)  # 50% of requests
    def health_check(self):
        """
        Test /health endpoint.
        Should always return 200 OK.
        """
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")

    @task(4)  # 40% of requests - test real profiles
    def get_existing_profile(self):
        """
        Test GET /profiles/{clerk_id} with real IDs.
        Should return 200 or 401 (if auth required).
        """
        clerk_id = random.choice(self.real_clerk_ids)

        with self.client.get(
            f"/profiles/{clerk_id}",
            catch_response=True,
            name="/profiles/[clerk_id] (existing)"
        ) as response:
            if response.status_code == 200:
                # Success - profile found
                response.success()
            elif response.status_code == 401:
                # Auth required - still counts as success (shows error handling)
                response.success()
            else:
                response.failure(
                    f"Unexpected status {response.status_code} for existing profile"
                )

    @task(1)  # 10% of requests - test 404 handling
    def get_nonexistent_profile(self):
        """
        Test GET /profiles/{clerk_id} with fake ID.
        Should return 404 (not found) gracefully.
        """
        with self.client.get(
            f"/profiles/{self.fake_clerk_id}",
            catch_response=True,
            name="/profiles/[clerk_id] (nonexistent)"
        ) as response:
            if response.status_code == 404:
                # Expected - profile doesn't exist
                response.success()
            elif response.status_code == 401:
                # Auth required - still success
                response.success()
            else:
                response.failure(
                    f"Expected 404 or 401, got {response.status_code}"
                )