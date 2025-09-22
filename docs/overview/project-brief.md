# Project 9: Virtual Pen Pals — **GlobeTalk**

## Objective

GlobeTalk is an app that connects users with anonymous pen pals for cultural message exchanges. The app simulates postal mail with a delivery delay to encourage curiosity and a focus on global diversity.

## Key Features

* **Random Matchmaking**
  Connect with users from random countries based on **language** or **time zone** preferences.

* **Asynchronous Messaging**
  Text-only messages are delivered **after a delay** (e.g., **12 hours**) to mimic traditional postal mail.

* **Cultural Profiles**
  Users create a short intro and view anonymous facts about their pen pal’s region.

* **Safety & Moderation**

  * All chats are **anonymous** (no names/emails).
  * **No media or file sharing** (text only).
  * Users can **flag** inappropriate content and **block** others.

## Core Concept

The core of this project is the **asynchronous messaging system** with a configurable, simulated delivery delay.

## API Modules (High-Level)

* **Matchmaking** — finds pen pals based on language/time zone preferences and randomization.
* **Message Storage** — persists text messages and enforces delayed delivery.
* **Profile Management** — handles cultural profile creation and retrieval.
* **Moderation** — supports flagging, blocking, and anonymity safeguards.

## UI Modules (High-Level)

* **Match Screen** — start or view a new match.
* **Message Inbox** — list of ongoing conversations and delivery statuses.
* **Letter Composer** — write and queue messages; shows scheduled delivery time.
* **Cultural Explorer** — anonymous regional facts and cultural context for your pen pal.

## Security & Anonymity

* **No PII exposure**: no names or emails shown anywhere in the app.
* **Text-only interactions** to reduce risk.
* **Moderation tools**: flagging, blocking, and content checks.
