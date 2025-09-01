# Sprint 2 — Report (Virtual Pen Pals)

## Summary

Team members were assigned tasks across the core services (Messaging, Matchmaking, Cultural Explorer, etc.). Work prioritized the **Minimum Viable Product (MVP)**: getting core functionality working before styling. A formal user‑feedback channel (Google Form) was launched. When a teammate finished their task, they assisted others to close remaining items.

> As referenced in the attached board snapshot, tasks were distributed to ensure progress across all services.

---

## What We Did

* **Core features implemented:**

  * **Messaging** (inbox, delayed letters)
  * **Matchmaking** (accept/decline; new match record creation)
  * **Cultural Explorer** (country facts)
* **Bug tracker:** Identified issues in Messaging API and local filtering; scheduled for next sprint.
* **MVP focus:** Deferred non‑critical styling in favor of core functionality.
* **User feedback process:** Launched a Google Form for beta testers; bugs routed to GitHub Projects for triage.
* **Collaboration:** After completing assigned work, members assisted others to reduce bottlenecks.

---

## Sprint 2 Deliverables (Evidence)

* **Inbox:** Working inbox demo (with known API issues to resolve).
* **Matchmaking:** Accept/decline profiles; creates a new **match record** on accept.
* **Cultural Explorer:** Shows neutral facts for selected countries/regions.
* **Testing setup:**

  * **Backend:** Automated tests configured (target ≈ **80%** coverage achieved on key modules).
  * **Frontend:** Jest tests scaffolded; acknowledged as more challenging and ongoing.

> Note: Detailed “how to run tests” lives in the unified testing guide / runbook.

---

## Services & Ownership (Sprint 2 Snapshot)

| Service                    | Task                                    | Owner(s)                                                   | Status / Notes                          |
| -------------------------- | --------------------------------------- | ---------------------------------------------------------- | --------------------------------------- |
| **frontend**               | UI & API Testing                        | **Muhammad Hoosen**                                        | Set up; baseline tests running          |
| **profiles & matchmaking** | API Integration; Matchmaking & Profiles | **Rameez**                                                 | Feature demo complete; API issues noted |
| **messaging**              | Core messaging features                 | **Arno Strauss**, **Sufyaan Mahomed**, **Mohammed Bangie** | Buggy; inbox demo shown; fixes planned  |
| **moderation**             | API Integration                         | **Sufyaan Mahomed**, **Muaaz Bayat**                       | Awaiting API specifications             |
| **quizzes**                | Core features                           | **Muaaz Bayat**                                            | In progress (quiz feature)              |

---

## Hidden / Deferred Features (Not Yet Implemented)

* **IP Tracking:** Prevent ban evasion (new accounts after ban).
* **PDF Export:** Export letters to a “fancy” PDF format.

---

## Retro (Sprint 2)

### Went Well

* Successful demos of **Matchmaking**, **Inbox**, and **Cultural Explorer**.
* Formal **user‑feedback process** established (Google Form → GitHub Projects).
* Backend automated tests reached **\~80% coverage** on targeted areas.
* Shared focus on the **MVP** improved alignment and velocity.

### To Improve

* **Work distribution:** Some 2‑person tasks evolved into 3‑person efforts; refine scoping & handoffs.
* **Bug resolution:** Messaging API issues and empty cards in inbox must be fixed before the next demo.

---

## Next Sprint — Headline Goal

**Fix all core features, raise PRs, and demonstrate a complete end‑to‑end flow to the tutor.**

---

## High‑Level Backlog (Sprint 3 Targets)

* **Bug:** Fix Messaging API bug (duplicate threads, incorrect sender IDs).
* **Bug:** Resolve inbox API issue that aggregates every match.
* **Feature:** Finalize chat view for ongoing conversations.
* **QA:** Prepare and run a comprehensive end‑to‑end flow test.
* **Docs:** Update and standardize documentation (incl. data docs).
* **Infra/UX:** Implement the **“Sauna”** component for push notifications to improve theming.

---

## Notes & Assumptions

* Coverage number reflects the most recent measurement on key backend modules; exact service‑by‑service figures will be captured in CI dashboards.
* Styling and non‑critical polish are intentionally deferred until core flows stabilize.
