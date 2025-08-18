# GlobeTalk — Sprint 1 Scrum Doc 
> Scrum with **GitHub Projects**; standups **2–3 times a week** (not daily). This captures what we actually did in Sprint 1 and how we’re working going forward.

---

## Team & Roles

* **Product Owner (PO):** Tapiwa
* **Scrum Master (SM):** Sufyaan
* **Dev Team:** FE, BE (FastAPI), Docs, QA, Ops (cross‑functional, shared ownership)

---

## Ways of Working (Scrum)

* **Cadence:**
    * **Standups:** 2–3×/week (e.g., Mon/Wed/Fri) either in person on discord or a whastapp group call.
    * **Refinement:** weekly (split/estimate stories)
    * **Review:** end of sprint (demo increment)
    * **Retro:** end of sprint (1–3 actions)
* **Board (GitHub Projects):** Backlog → Ready → In Progress → In Review → QA → Done
* **Branches/PRs:** `feat|fix|docs/*`, small PRs, ≥1 reviewer, CI green, squash merge, Conventional Commits
* **Definitions:**
    * **DoR:** story has scope, AC, estimate, test ideas, deps known
    * **DoD:** PR merged, tests/docs updated, text‑only/privacy/a11y enforced, logs/metrics added, evidence linked on Issue

---

## Sprint 1 — What We Did

* Planned together for the first few days; set expectations & pairs
* **Raffle pairing → teams of two → wireframes** produced; mid‑sprint check‑ins
* Showcase + discussion of wireframes; **tech stack finalised same day**
* Assigned each member a **FastAPI service** to initialise; later meeting to **split documentation** and **reinforce API docs**
* **Unexpected win:** some members shipped **small but working FastAPI APIs** (beyond initialise)
* Already in place (carried into sprint): **Auth (Clerk)**, **CI/CD pipeline**, **simple dashboard**, **Clerk + Supabase** wiring, **profile edit** flow allowing users to adjust profile details

---

## Sprint 1 Deliverables (Evidence)

* Wireframes
* Repo structure + working **Clerk** auth path
* **CI/CD** configured (build/test/deploy)
* **FastAPI micro‑APIs** (initialised + some working endpoints)
* **Dashboard** shell and **profile editor** (Supabase persistence)
* API documentation stubs/pages; decisions captured in ADRs/README



---

## Services & Ownership (Sprint 1 snapshot)

| Service              | Status                                  |
| -------------------- | --------------------------------------- |
| `core` (profiles)    | initial endpoints working               |
| `messaging`          | initialised / partial                   |
| `moderation`         | initialised / partial                   |
| `matchmaking`        | initialised / partial                   |
| `frontend` (Next.js) | dashboard + Clerk/Supabase profile edit |


---


---

## Retro (Sprint 1)

**Went well**

* Pair wireframing + mid‑sprint check‑ins kept scope aligned
* Early wins (working micro‑APIs, auth, CI/CD) accelerated confidence

**To improve**

* Work distribution
* Time spent on a tasks


---

## Next Sprint (Headline Goal)

**Deliver a thin end‑to‑end text‑only pen‑pal slice:** match → compose (delayed) → deliver → inbox; moderation check and anonymous profiles in place.

**High‑level backlog**

* `POST /match` + FE thread stub
* Message schema + **worker** to flip `pending → delivered`
* Compose (text‑only) with “deliver in …” + Inbox tabs (Pending/Delivered)
* Compose → Moderation `/check` (block on severe)

