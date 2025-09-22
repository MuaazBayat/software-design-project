# Running Tests — CI/CD Automation

Our project uses an automated **Continuous Integration / Continuous Deployment (CI/CD)** pipeline to ensure code quality and stability. Test suites run automatically on:

* Pushes to the **`main`** and **`develop`** branches
* **Pull requests** targeting those branches

---

## Automated Test Execution

When new code is pushed or a PR is opened, the CI pipeline triggers test jobs for each service.

### Frontend (Jest)

Runs unit tests for UI components and logic.

```bash
npm test -- --coverage --ci
```

* Generates a coverage report as part of the CI job.

### Backend Microservices (pytest)

Each backend service (Core, Matchmaking, Messaging, Moderation) runs its own pytest job.

```bash
pytest --cov=services/[service_name] --cov-fail-under=50
```

* Replace `[service_name]` with the specific service folder (e.g., `core`, `matchmaking`).

---

## Code Coverage Threshold

To maintain quality, the CI pipeline enforces a **minimum coverage** per service.

* **Current threshold:** **50%** line coverage (per service)
* **Rule:** Deployments proceed **only if** the service’s tests meet or exceed the threshold
* If coverage falls below 50%, the CI build **fails** and the new code is **not deployed**

This automation helps catch bugs early and keeps our services stable and reliable.
