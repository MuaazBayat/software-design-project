# GlobeTalk — WorkPlan

> Scrum + GitHub Projects. Ultra‑brief, project‑specific. No dates.

---

## Ground Rules

* **Board:** Backlog → Ready → In Progress → In Review → QA → Done
* **PRs:** Small, reviewed, CI green; link PR ↔ Issue; squash & Conventional Commits
* **DoD (Defenition of Done):** Tests & docs updated; text‑only/privacy/a11y enforced; evidence (PR/GIF) on Issue

---

## Sprint 1

* Planned together; set expectations & pairs
* Raffle → teams of two → wireframes; mid‑sprint check‑ins
* Showcase & discuss;
* Assigned FastAPI services; later meeting to split docs & reinforce API docs
* Unexpected win: several **small working FastAPI APIs** shipped 
* Baseline ready: **Auth (Clerk)**, **CI/CD**, **simple dashboard**, **Clerk + Supabase** wiring, **profile edit** flow

---

## Sprint 2

* **Matchmaking MVP:** `POST /match` + FE thread stub
* **Message delivery:** schema locked; worker flips `pending → delivered`
* **Compose + Inbox:** text‑only compose with “deliver in …”; Pending/Delivered tabs
* **Moderation hook:** call `/check` on compose; block on severe
* **Docs/CI:** expose `/docs` + `/openapi.json`; add pytest + Playwright in CI

---

## Sprint 3

* **Moderation workflow:** flag → queue → action; audit logs
* **DB/Security:** RLS policies; indexes on `deliver_at`, `match_id`
* **Cultural Explorer:** basic external‑API fact card on thread
* **Quality:** a11y sweep; empty/error states; logs/metrics

---

## Sprint 4 

* Bug burn‑down; harden worker (retries/backoff)
* Finalise docs (Dev Guides + OpenAPI links); short demo script/GIF
* Sprint review + retro; carry 1–3 actions into next sprint

---

## Tracking (Minimal)

* Create one **Issue** per bullet; set **Epic** (Matching/Messaging/Profiles/Moderation/Docs/QA)
* Move by **Status**; attach PR + quick evidence link (GIF/demo URL)
