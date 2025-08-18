# Comprehensive Development Plan

## 📋 Table of Contents
- [Purpose of this Document](#0-purpose-of-this-document)
- [Project Vision](#1-project-vision)
- [Guiding Principles](#2-guiding-principles)
- [User Personas & Scenarios](#3-user-personas--scenarios)
- [Team and Roles](#4-team-and-roles)
- [Documentation & Collaboration](#5-documentation--collaboration-artifacts)
- [Sprint 1: Foundation & Initial Setup](#6-sprint-1-foundation--initial-setup)
- [Sprint 2: Core Feature Development](#7-sprint-2-core-feature-development)
- [Sprint 3: Refinement & Polish](#8-sprint-3-refinement--polish)
- [Module Interactions & Data Flow](#9-module-interactions--data-flow)
- [Future Scope](#10-future-scope)
- [Core Technologies](#11-core-technologies)

---

## 0. Purpose of this Document
> This document serves as the single source of truth for the GlobeTalk development team. Its primary goal is to provide a comprehensive, high-level blueprint that aligns every team member on the project's vision, guiding principles, technical execution, and collaboration standards. It is a living document that will evolve alongside the project, ensuring everyone is working toward a shared, clear objective.

---

## 1. Project Vision
GlobeTalk aims to revolutionize global connection by simulating the classic pen pal experience through modern, secure, and asynchronous digital messaging. The focus is on fostering curiosity, promoting cultural exchange, and creating a safe, anonymous, and text-only environment for users to connect with new people around the world.

---

## 2. Guiding Principles
These principles will guide all technical and design decisions throughout the project.

- 🕰️ **Asynchronous First**: The core experience is based on delayed, asynchronous communication. This is a deliberate design choice to encourage thoughtful, long-form replies rather than instant, conversational exchanges.

- 🔒 **Safety & Trust**: The platform will be a safe and anonymous space. All content and profiles will be subject to moderation to prevent abuse and harassment. User accounts will be identified by unique IDs and handles, never by personal information.

- 🌍 **Cultural Exchange**: The app will actively promote cultural discovery by providing users with fun facts and information about their pen pal's region, and through engaging icebreakers like a language quiz.

- 🧩 **Simplicity & Discovery**: The user interface will be minimalist and intuitive, with a strong focus on the core experience of connecting with new people.

---

## 3. User Personas & Scenarios
To help the team build with our users in mind, we've defined a core persona and a key scenario.

### 👩‍🎓 Persona: The Curious Student

- **Name**: Lena
- **Age**: 20
- **Location**: Germany
- **Motivation**: Lena is studying international relations and wants to practice her English while learning about different cultures from real people. She is looking for a meaningful, long-term connection, not just a quick chat.

### 📝 Scenario: Lena's First Match

1. Lena signs up for GlobeTalk and first completes a short language quiz. (See the Collaboration Doc for how the Authentication API provides a unique user_id, and the Data Design Doc for the user profile schema).

2. She receives a unique user_id and a randomly generated anonymous handle, or alternatively choose a penname.

3. She requests a new match, filtering for someone in North America who speaks English. (This step involves the Matchmaking API, as outlined in the Division of Labor Doc).

4. The Matchmaking API connects her with "Jay" from Canada.

5. She receives a notification and writes her first long-form message to Jay. (The messaging functionality and technical implementation are detailed in the Development Guides).

6. The Message API stores her message and schedules a delayed delivery.

7. A few hours later, Jay receives a notification that a new letter has arrived. He reads it, learns a fun fact about Germany, and writes back.

---

## 4. Team and Roles
Our project team is structured to ensure clear ownership and a smooth development process. Each team member has a core responsibility, and we all contribute to the overall success of the project.

| Team Role | Key Responsibilities | Key Deliverables |
|:----------|:---------------------|:-----------------|
| 🔐 **Authentication & CI/CD** | Manage user authentication, continuous integration, and continuous delivery pipelines. | Authentication Implementation, CI/CD Pipelines, Repository Setup, Collaboration Doc |
| 🔄 **Git Methodology & UI/UX** | Define the branching strategy, create wireframes, and map data flow. | Branching Strategy, Wireframes, Data Flow per Page, Division of Labor Doc |
| 👤 **Profiles UI & Backend** | Implement the front-end user interface and back-end logic for user profiles. | User Journey/Story, Profiles UI, Profiles Backend |
| 🧠 **Core API & Planning** | Define the high-level development strategy and implement the core API backend. | High-Level Development Doc, Notion Setup, Core API Backend |
| 📊 **Data & Moderation** | Design the database schema and implement the moderation backend. | Data Design Document, Scrum Master, GitHub Projects Migration, Moderation Backend |
| 🛠️ **Tech Stack & Matchmaking** | Select and document the technology stack and implement the matchmaking backend. | Tech Stack Doc, Matchmaking Backend |
| 💬 **Messaging Backend** | Implement the backend services for saving and retrieving messages. | Messaging Backend (save and retrieve letters) |

---

## 5. Documentation & Collaboration Artifacts
To maintain a single source of truth and keep our team aligned, we will maintain the following documentation artifacts.

- 🔐 **Authentication & CI/CD**: Maintained by the Authentication & CI/CD lead.
- 🔄 **Git Methodology**: Maintained by the UI/UX lead.
- 👤 **User Journey/Story**: Maintained collaboratively by the Profiles and UI/UX leads.
- 📊 **Data Design Doc**: Maintained by the Data & Moderation lead.
- 🛠️ **Tech Stack Doc**: Maintained by the Tech Stack & Matchmaking lead.
- 📚 **Development Guides**: Led by the Data & Moderation lead.

---

## 6. Sprint 1: Foundation & Initial Setup
**Duration**: 3 weeks  
**Primary Goal**: Establish all core technical infrastructure and complete initial proof-of-concept commits for each API module.

### Week 1: Project Planning & Initial Design
**Objective**: Define the project's foundational elements, including technology, architecture, and team roles.

**Key Activities**:
- Establish the high-level architecture with a microservice approach.
- Select the technology stack: Next.js (Frontend), FastAPI (Backend), PostgreSQL via Supabase (Database), and Clerk for authentication.
- Define the core pages (Match, Compose letter, Message, Cultural Explorer, Settings) and backend tables (Profiles, Matches, Messages, Logs).
- Researched project management tools (Notion/GitHub Projects) to manage tasks and backlogs.

**Deliverables**:
- Initial, high-level Development Plan.
- Confirmed Tech Stack choices with justifications.

### Week 2: Design & Version Control
**Objective**: Translate high-level concepts into detailed designs and establish a robust version control system.

**Key Activities**:
- Design the initial wireframes and mockups in Figma to visualize the core user journey.
- Establish the online Git repository as the single source of truth for the codebase.
- Define and document the Git branching strategy and naming conventions (e.g., feature/user-auth).
- Start setting up a basic Continuous Integration/Continuous Deployment (CI/CD) pipeline to automate testing.

**Deliverables**:
- Figma designs for key UI pages.
- Functional Git repository with team access.
- Documented branching and collaboration strategy.

### Week 3: Core Implementation & Documentation
**Objective**: Implement the most critical feature—user authentication—and create the necessary documentation to guide future development.

**Key Activities**:
- Implement a functional authentication service that integrates with Clerk. This is the top priority for Sprint 1.
- Begin work on the Core API to handle user profiles, as this is a foundational requirement.
- Create Development Guides with clear instructions for setting up the development environment, including database and API configuration.
- Begin drafting the Data Design Document with the initial database schema.
- Identify an external collaboration group or API for the Cultural Explorer feature.

**Deliverables**:
- A functional Authentication Implementation.
- Initial commit for the Core API, the Moderation API and the Messaging API.
- Live and accessible Documentation Site with non-trivial content.
- A comprehensive guide for setting up the development environment.

---

## 7. Sprint 2: Core Feature Development
**Duration**: 3 weeks  
**Primary Goal**: To complete the development of all core API functionality and begin work on the primary UI modules that consume these APIs.

| Objective | Deliverables | Status |
|:----------|:-------------|:-------|
| 👤 **Profiles & Core** | • Core API: Full implementation of user profile creation and management endpoints.<br>• Profiles UI: Front-end screens for viewing and editing user profiles. | 📅 Planned |
| 🔄 **Matchmaking & Messaging** | • Matchmaking API: Full implementation of matchmaking logic.<br>• Message API: Full implementation of message storage, delay, and retrieval endpoints. | 📅 Planned |
| 🛡️ **Moderation** | • Moderation API: Initial implementation of user reporting and content flagging endpoints. | 📅 Planned |

---

## 8. Sprint 3: Refinement & Polish
**Duration**: 3 weeks  
**Primary Goal**: To finalize all remaining features, address bugs, and prepare the application for a public release.

| Objective | Deliverables | Status |
|:----------|:-------------|:-------|
| 🎨 **UI Enhancements** | • Finalize the Cultural Explorer and Message Inbox UI.<br>• Full implementation of the Settings & Safety screens. | 📅 Planned |
| 🔧 **API Finalization** | • Full implementation of all remaining Moderation API endpoints.<br>• Final round of bug fixing and performance optimization across all services. | 📅 Planned |
| 🚀 **Public Release** | • All high-priority bugs are addressed and resolved.<br>• Final Collaboration Document and a comprehensive backend setup guide. | 📅 Planned |

---

## 9. Module Interactions & Data Flow
Understanding how our microservices communicate is critical. The following flow outlines the primary interactions between our API modules and the UI.

### 🔐 Authentication & Profile Creation:
1. A user signs up on the frontend and completes a language quiz.
2. The frontend receives a unique user_id from Clerk.
3. The frontend then makes a POST request to the Core API to create the user's profile, using the user_id to link the profile to their authenticated session.

### 🔄 Matchmaking:
1. When a user requests a new match, the Matchmaking API is called.
2. This API queries the Core API to get the user's profile data (e.g., primary_language, time_zone, interests).
3. Based on these preferences, the Matchmaking API finds a suitable pen pal and creates a new match_record in the database.

### 💬 Messaging:
1. When a user sends a message, the frontend makes a POST request to the Message API.
2. This API takes the message content and the match_id from the URL.
3. It retrieves the recipient's information from the Core API to determine the delivery delay (if needed).
4. The Message API then stores the message and schedules its delivery.

### 🛡️ Moderation:
1. If a user flags content, the frontend makes a POST request to the Moderation API.
2. This API stores the report and a reference to the target_id (e.g., a message or another user's profile).
3. A moderator can then use a separate frontend to review these reports, which may involve getting additional information from the Core API (for user reports) or the Message API (for flagged messages).

---

## 10. Future Scope
The following features are beyond the scope of the initial three sprints but represent our long-term vision for the project.

- 🎮 **Cultural Discovery Mini-Games**: Developing small interactive games that teach users about their pen pal's culture.
- 📆 **API for Pen Pal Events**: Creating an API that allows users to schedule virtual events with their pen pals.

---

## 11. Core Technologies
For a comprehensive overview of the entire project's technology stack, including versions and external services, please refer to the Tech Stack Document maintained by the Tech Stack & Matchmaking lead.

---

<div align="center">
<h3>GlobeTalk Project</h3>
<p>Connecting the world, one letter at a time.</p>
</div>