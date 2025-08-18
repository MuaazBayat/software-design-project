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
