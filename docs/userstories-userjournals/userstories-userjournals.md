
Below are user stories written strictly in **Who–What–Why** format followed by sample **user journeys** (day‑in‑the‑life narratives).

---

**As a new user,** I want to create an anonymous cultural profile with age range, languages, hobbies, and region, **so that** I can be matched without revealing my identity.
**As a user,** I want to choose between one‑time letters and long‑term correspondence, **so that** I control the kind of pen‑pal experience I have.
**As a user,** I want to set language and time‑zone overlap preferences, **so that** I’m matched with people I can realistically converse with.
**As a user,** I want the app to prevent me from entering contact details or links in my profile, **so that** my identity stays protected.

**As a user,** I want to tap “Find a pen pal” and get paired based on my filters, **so that** I can start a conversation quickly.
**As a user,** I want to accept or skip a suggested match, **so that** I feel in control of who I talk to.
**As a user,** I want the system to avoid rematching me with people I’ve blocked or reported, **so that** I don’t encounter them again.
**As a user,** I want suggestions if no match is available (broaden filters/retry), **so that** I’m not stuck waiting without options.

**As a user,** I want to compose **text‑only** letters with basic emojis, **so that** I can express myself while keeping the platform safe and simple.
**As a user,** I want my letters to have a delivery delay (e.g., 12 hours), **so that** the exchange feels like real pen‑pal postal timing.
**As a user,** I want a short “Undo send” window after sending, **so that** I can fix mistakes before the letter is queued.
**As a user,** I want an inbox that shows pending deliveries, delivered letters, and arrival countdowns, **so that** I always know the status of my messages.
**As a user,** I want to nudge a pen pal or end the match if there’s no reply after a set time, **so that** I can keep my experience active and respectful of my time.

**As a user,** I want to see neutral region facts (holidays, sayings, fun facts) about my pen pal’s area, **so that** I have conversation starters.
**As a user,** I want to update my intro over time, **so that** future matches reflect my current interests and availability.

**As a user,** I want to block or report a conversation, **so that** I can protect myself from uncomfortable or inappropriate interactions.
**As a user,** I want the app to detect and prevent sharing of PII (emails, phone numbers, social handles, links) in messages, **so that** chats remain anonymous and safe.
**As a user,** I want clear, friendly guidance when my message violates safety rules, **so that** I can correct it without feeling punished.
**As a moderator,** I want a queue of reported/flagged content with anonymized context, **so that** I can review fairly and take proportionate action.
**As a moderator,** I want actions like dismiss, warn, temp‑ban, or ban with audit logging, **so that** enforcement is consistent and traceable.

**As a user,** I want opt‑in notifications when letters arrive, **so that** I don’t miss messages.
**As a user,** I want to export my data (profile, matches, message timestamps/content), **so that** I can keep a personal record.
**As a user,** I want to permanently delete my account and data (with a cooling‑off period), **so that** I retain control over my privacy.
**As a user,** I want accessible UI (screen reader support, keyboard navigation, adjustable text size, high contrast), **so that** I can use the app comfortably regardless of ability.
**As a user,** I want to configure quiet hours or notification schedules based on my time zone, **so that** I’m not disturbed at inconvenient times.
**As a user,** I want to set my default match type and preferences once and reuse them, **so that** I can match quickly without reconfiguring each time.
**As a user,** I want a clear reminder that the platform is text‑only and media/file sharing is disabled, **so that** I understand the boundaries upfront.
**As a user,** I want to archive or pin important threads, **so that** I can organize my inbox as conversations grow.

---
User Journeys

User journeys describe end‑to‑end flows across touchpoints (UI, services, policies) from the user’s perspective. Each journey below uses the generic persona **User**, and includes: **trigger**, **pre‑conditions**, **happy‑path steps**, a **journey map** (stage × actions × system), and **edge cases**. Services referenced: **Auth** (anonymous/Clerk), **Profile**, **Matchmaking**, **Messaging/Delivery Scheduler**, **Cultural Explorer**, **Moderation**, **Notifications**, **Data & Privacy**.

---

## Journey 1 — First‑time Onboarding → First Letter Sent

**Persona:** User.
**Trigger:** Opens app for the first time.
**Goal:** Get matched and send the first text‑only letter.

**Pre‑conditions**

* App reachable; Auth supports anonymous/pseudonymous session.
* Profile not yet completed.

**Happy‑path (numbered)**

1. User accepts T\&Cs and anonymity policy.
2. User completes cultural profile: age range, languages, hobbies, region (no PII allowed).
3. User chooses **One‑time letter** as match type and sets time‑zone overlap (e.g., ±2h) and preferred language.
4. User taps **Find a pen pal** → sees a suggested match (region + languages only).
5. User **accepts** the match → navigates to **Compose Letter**; text‑only editor shown; media inputs disabled.
6. User writes \~300 chars; UI shows **Delivery delay: 12h** banner + exact local arrival time.
7. User taps **Send** → 120‑second **Undo** snackbar shows; then letter enters the **Delivery Scheduler** queue.
8. User returns to **Inbox**; thread appears with a countdown (e.g., “arrives in 11h 59m”).

**Journey map**

| Stage     | User action                     | UI feedback                                 | System/services                | Data captured                                   | Emotion      | Risks                         | Success metrics                   |
| --------- | ------------------------------- | ------------------------------------------- | ------------------------------ | ----------------------------------------------- | ------------ | ----------------------------- | --------------------------------- |
| Discover  | Launches app                    | Welcome + brief on anonymity/text‑only      | Auth session created           | Session ID                                      | Curious      | Drop‑off                      | Activation rate                   |
| Onboard   | Completes profile               | Validation of fields; PII blocked           | Profile API writes; PII filter | Profile doc (age range, langs, region, hobbies) | Safe         | Friction on validation        | Profile completion %              |
| Configure | Chooses match type & TZ overlap | Sticky selector summary                     | Profile prefs saved            | Match prefs                                     | In control   | Misunderstanding of “overlap” | Pref save success                 |
| Match     | Taps **Find**; accepts          | Match card with region/lang                 | Matchmaking API reserves pair  | Match record                                    | Excited      | Cold‑start scarcity           | Time‑to‑match                     |
| Compose   | Writes letter                   | Text‑only input; emoji picker; delivery ETA | Messaging creates draft        | Draft msg                                       | Engaged      | Editor confusion              | Draft completion %                |
| Send      | Sends; sees undo                | Undo countdown; scheduled arrival time      | Delivery Scheduler enqueues    | Message job                                     | Confident    | Accidental send               | Undo usage rate                   |
| Post‑send | Returns to inbox                | Thread w/ countdown                         | Notifications set for arrival  | Notification token                              | Anticipation | Notification failure          | D0 retention; notification opt‑in |

**Edge cases**

* **No match available:** Offer to broaden filters or notify when available; keep user in light loop.
* **PII entered in profile:** Inline warning; disable save until removed.
* **Network drop at send:** Keep local draft; retry queueing.

---

## Journey 2 — First Letter Arrives → Compose Reply (Delayed)

**Persona:** User.
**Trigger:** Notification that a letter has arrived.
**Goal:** Read and reply within the pen‑pal pacing (12h delay).

**Pre‑conditions**

* Thread exists; a letter arrived at scheduled time.

**Happy‑path**

1. User taps notification → **Inbox** opens to thread; unread badge clears when opened.
2. User reads the letter; opens **Cultural Explorer** to see facts about the counterpart’s region.
3. User taps **Reply**; writes \~500 chars; the UI shows **Delivery in 12h** and exact timestamp.
4. User sends; sees **Undo (120s)**; then queued. Thread shows **“Your letter will arrive at HH\:MM”**.

**Journey map**

| Stage   | User action               | UI feedback              | System/services                | Data captured        | Emotion    | Risks           | Success metrics           |
| ------- | ------------------------- | ------------------------ | ------------------------------ | -------------------- | ---------- | --------------- | ------------------------- |
| Notify  | Taps arrival notification | Deep‑links to thread     | Notifications → Inbox route    | Open event           | Prompted   | Missed tap      | Open‑from‑push rate       |
| Read    | Reads letter              | Delivered badge/time     | Messaging marks delivered/read | Read receipt (local) | Connected  | Misread tone    | Avg read time             |
| Explore | Opens cultural panel      | Cards with neutral facts | Cultural Explorer fetch        | Content viewed       | Curious    | Stereotype risk | Panel engagement          |
| Compose | Writes reply              | Editor; ETA banner       | Draft saved                    | Draft content        | Thoughtful | Overlong text   | Reply length distribution |
| Send    | Sends reply               | Undo + scheduled time    | Delivery queue                 | Message job          | Satisfied  | Fat‑finger      | Reply rate                |

**Edge cases**

* **Quiet hours enabled:** Deliver push silently; show badge only.
* **User tries to paste a link:** Inline PII guard blocks and educates.

---

## Journey 3 — One‑time → Long‑term Correspondence

**Persona:** User.
**Trigger:** Enjoys the exchange; wants to keep writing to the same pen pal.
**Goal:** Convert to long‑term, with minimal friction.

**Pre‑conditions**

* Active one‑time thread with at least one exchange.

**Happy‑path**

1. In thread header, User taps **“Make this long‑term”**.
2. Modal explains pacing & safety; User confirms.
3. Thread gains **Long‑term** badge; future matchmaking deprioritizes new one‑time matches while this thread is active.

**Journey map**

| Stage   | User action           | UI feedback             | System/services                    | Data captured      | Emotion  | Risks                | Success metrics     |
| ------- | --------------------- | ----------------------- | ---------------------------------- | ------------------ | -------- | -------------------- | ------------------- |
| Decide  | Opens thread settings | Toggle visible          | Thread settings fetch              | Preference flag    | Hopeful  | Commitment anxiety   | Toggle CTR          |
| Confirm | Confirms change       | Badge + tooltip         | Matchmaking updates pairing policy | Long‑term=true     | Invested | Expectation mismatch | Long‑term retention |
| Sustain | Continues letters     | Normal delayed exchange | Scheduler & Notifications          | Message continuity | Content  | Burnout              | Avg thread lifespan |

**Edge cases**

* **One user opts out later:** Either party can revert to one‑time; thread remains but new matching normalizes.

---

## Journey 4 — Safety: Block & Report (PII Solicitation)

**Persona:** User.
**Trigger:** Pen pal asks for Instagram/phone.
**Goal:** Stop contact, report behavior, and feel safe.

**Pre‑conditions**

* Active thread; message violating policy.

**Happy‑path**

1. User sees the message; **PII guard** either blocks the sender’s attempt (if outbound) or highlights the violation (if received).
2. User taps **Report → “Soliciting contact info”** and adds an optional note.
3. User taps **Block**; thread mutes and archives; matching excludes the reported user.
4. User is offered **Rematch now** or **Return to Inbox**.

**Journey map**

| Stage   | User action         | UI feedback           | System/services           | Data captured    | Emotion       | Risks            | Success metrics    |
| ------- | ------------------- | --------------------- | ------------------------- | ---------------- | ------------- | ---------------- | ------------------ |
| Detect  | Reads violating msg | Inline warning/flag   | Messaging + Policy engine | Flag event       | Uncomfortable | False positives  | Flag accuracy      |
| Report  | Selects reason      | Guided form, examples | Moderation API ticket     | Report record    | Assertive     | Friction         | Report completion  |
| Block   | Confirms block      | Thread muted/archived | Blocklist write           | Block entry      | Relief        | Accidental block | Blocks per MAU     |
| Recover | Chooses next step   | Rematch CTA           | Matchmaking new search    | New match record | Reassured     | Re‑exposure      | Time‑to‑safe‑state |

**Edge cases**

* **Malicious user evasion:** Repeat attempts trigger rate‑limits/soft‑locks.
* **Abuse of reporting:** Moderation reviews patterns; progressive friction for serial false reports.

---

## Journey 5 — No Response → Nudge → End & Rematch

**Persona:** User.
**Trigger:** No reply after N days.
**Goal:** Keep momentum or move on respectfully.

**Pre‑conditions**

* Sent message delivered; no response within SLA (e.g., 3 days).

**Happy‑path**

1. Thread shows **“No reply yet”** with options: **Nudge** or **End & Rematch**.
2. User taps **Nudge** → lightweight, respectful system message is scheduled (no extra personal content).
3. If still no reply after K days, User taps **End & Rematch**.
4. Thread archives; matchmaking starts with previous preferences.

**Journey map**

| Stage  | User action      | UI feedback          | System/services          | Data captured  | Emotion          | Risks              | Success metrics     |
| ------ | ---------------- | -------------------- | ------------------------ | -------------- | ---------------- | ------------------ | ------------------- |
| Wait   | Notices delay    | Friendly status pill | SLA timer service        | Idle timer     | Mild frustration | Pressure perceived | SLA compliance      |
| Nudge  | Sends nudge      | Non‑intrusive banner | Messaging system message | Nudge event    | Hopeful          | Spammy feel        | Nudge response rate |
| Decide | Ends & rematches | Archive confirmation | Archive + matchmaking    | Archive record | Closure          | Premature ending   | Rematch time        |

**Edge cases**

* **Recipient on break:** Auto‑status can indicate “Taking a break” to reduce pressure.

---

## Journey 6 — Data Control: Export & Delete

**Persona:** User.
**Trigger:** Wants a copy of data or to leave platform.
**Goal:** Self‑service export and deletion with clear expectations.

**Pre‑conditions**

* Logged in; identity verified (even if pseudonymous).

**Happy‑path**

1. User opens **Settings → Data & Privacy**; sees **Export** and **Delete account**.
2. User taps **Export** → receives downloadable JSON when ready (email/push link or in‑app).
3. User taps **Delete** → sees 7‑day cooling‑off explanation; confirms.
4. Account enters **Pending deletion**; User can **Undo** within 7 days; after that, data is erased/anonymized per policy.

**Journey map**

| Stage  | User action            | UI feedback                  | System/services       | Data captured   | Emotion    | Risks      | Success metrics         |
| ------ | ---------------------- | ---------------------------- | --------------------- | --------------- | ---------- | ---------- | ----------------------- |
| Review | Opens privacy settings | Clear copy, no dark patterns | Data svc status check | Intent event    | Empowered  | Confusion  | Settings CTR            |
| Export | Requests export        | Progress + link on ready     | Export job; storage   | Export artifact | Reassured  | Link leaks | Export success rate     |
| Delete | Confirms               | Pending/deadline banner      | Deletion scheduler    | Deletion ticket | In control | Regret     | Completion & undo rates |

**Edge cases**

* **Partial outages:** Queue requests; surface status; provide status without promises.

---

## Journey 7 — Accessibility‑first Use (Screen Reader)

**Persona:** User.
**Trigger:** First visit + ongoing usage.
**Goal:** Complete core tasks (onboard, match, send, read) without barriers.

**Pre‑conditions**

* WCAG‑aligned UI; ARIA labels present; focus order logical.

**Happy‑path**

1. User tabs through onboarding; every input has a label and error state is announced.
2. User uses keyboard to open **Find a pen pal**; accepts via Enter.
3. User composes a letter; editor supports plain text; delivery ETA is announced.
4. User sends; **Undo** is keyboard‑reachable and announced; returns to inbox list with a countdown that updates politely.

**Journey map**

| Stage   | User action          | UI feedback                              | System/services | Data captured | Emotion     | Risks             | Success metrics      |
| ------- | -------------------- | ---------------------------------------- | --------------- | ------------- | ----------- | ----------------- | -------------------- |
| Onboard | Navigate by keyboard | Visible focus ring; ARIA live for errors | N/A             | N/A           | Included    | Focus traps       | A11y audit pass      |
| Match   | Trigger via keyboard | Toast announced                          | Match API       | Match event   | Confident   | Hidden controls   | Keyboard coverage %  |
| Compose | Enter text           | Live region announces ETA                | Draft save      | Draft         | Comfortable | Ambiguous labels  | Screen‑reader checks |
| Send    | Confirm              | Undo announced                           | Queue job       | Send event    | Assured     | Short undo window | Undo access rate     |

**Edge cases**

* **Countdown spam:** Use polite ARIA live regions; throttle announcements.

---


