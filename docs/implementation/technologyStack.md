# Technology stack

This project leverages a modern, containerized architecture designed for scalability, maintainability, and developer productivity.  

---

## Frontend  
- **Next.js (React + TypeScript)** – Chosen for its full-stack capabilities, including server-side rendering, static generation, and built-in routing, which improves performance and SEO while reducing boilerplate.  
- **Tailwind CSS** – Selected for its utility-first approach that speeds up styling, enforces design consistency, and integrates seamlessly with Next.js.  

---

## Microservices (Backend Services)  
- **FastAPI (Python)** – Chosen for its speed and type-hint support making it ideal for microservices that need to be lightweight yet robust.  
- **Uvicorn** – Used as the ASGI server due to its speed, simplicity, and compatibility with FastAPI.  
- **Microservices Architecture** – Adopted instead of a monolithic backend to allow independent scaling, easier maintainability, and the flexibility to develop and deploy services separately.  

---

## Database & Authentication  
- **Supabase** – Selected as a managed PostgreSQL solution with built-in real-time subscriptions, file storage, and APIs, reducing the need to maintain a custom database backend.  
- **Clerk** – Chosen for its developer-friendly authentication and user management, which handles secure sessions and identity out of the box, saving time.

---

## Deployment & Infrastructure  
- **Docker** – Used for containerization to ensure consistent environments across development, testing, and production.  
- **Google Cloud Run** – Chosen for its serverless, autoscaling container deployment, which reduces infrastructure management overhead while handling unpredictable traffic smoothly.  
- **Supabase Cloud** – Used for hosting PostgreSQL and storage in a fully managed, scalable environment.  
 

---

## Tooling & Development  

### Frontend  
- **npm** – Standard package manager for JavaScript/TypeScript projects.  
- **Turbopack** – Next-generation bundler built for Next.js, chosen for faster builds and better developer experience compared to traditional bundlers.  
- **ESLint & Prettier** – Enforced code style and quality, reducing bugs and ensuring consistency across the team.  

### Microservices (Python)  
- **uv** – Chosen as a modern Python package/environment manager that simplifies dependency handling.  
- **Ruff** – Selected for its speed and reliability in linting/formatting Python code, keeping microservices clean and performant.  

### Repository & General  
- **Git & GitHub** – Industry-standard for version control and collaboration, making it easy for distributed teams to work together.  
- **GitHub Actions** – Used for CI/CD to automate testing, linting, and deployments, ensuring reliability and reducing manual steps in the workflow.  

### Testing & Quality Assurance
- **Jest (Frontend)** and **Pytest (Backend)** ensure unit and integration coverage.
- **GitHub Actions** automates test execution and coverage enforcement on each pull request.

### Version Control Standards
- **Conventional Commits** standardize commit messages and automate changelog generation.
- **Branch Protection Rules** enforce peer review and passing CI checks before merge.

### Project Management & Collaboration
- **GitHub Projects** and **GitHub Issues** track sprint progress, bugs, and features.
- **Google meet / WhatsApp** facilitate team communication and stand-ups.

### Environment Management
- **.env files** manage secrets and configuration across environments.
- **Docker Compose** supports consistent local orchestration for microservices.



## Evidence of Tool Usage

To support our Scrum workflow, we used the following integrated tooling setup:

* **Project Tracking (GitHub Projects):**  
  Each sprint was managed on a Kanban board (`GlobeTalk`) with columns  
  *Backlog → Ready → In Progress → In Review → QA → Done*.  
  Each issue represented a user story, bug, or task and was automatically linked to a PR (via commit footer `Closes #<id>`).  
  *(See Figure 3 in Git Methodology section — GitHub Project Board)*

* **Bug Tracking (GitHub Issues):**  
  Bugs were labeled and moved through the same board workflow.  
  Example: `[Bug]: Facts of countries that have reached their total of cards` in Sprint 2.

* **Code Quality & Testing:**  
  Automated linting and integration tests were enforced via **ESLint**, **Jest**, and **GitHub Actions** CI checks on each PR.  
  These ensured code consistency and prevented merges if builds or tests failed.

* **Branching & Reviews:**  
  All development followed the `develop` + `feature/*` Trunk-Based workflow.  
  Each PR required at least one reviewer approval and a passing CI pipeline before merge.  
  *(See Figure 2 — PR Review Screenshot)*

* **Communication & Coordination:**  
  Stand-ups (2–3× per week) and sprint reviews were conducted via Discord and WhatsApp group calls.  
  Key sprint updates were logged on GitHub issues and the board for traceability.

---

### Summary
This combination of **GitHub Projects**, **GitHub Issues**, **CI/CD**, and **testing/linting pipelines** provided full visibility into sprint progress, ownership, and quality enforcement—directly satisfying the “Tools (5%)” assessment criterion.
