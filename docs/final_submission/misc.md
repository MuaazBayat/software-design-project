## Misc

This section maps miscellaneous development practices and tools to the assessment rubric criteria.

---

### Git Methodology

**Documentation:** [Git Methodology](../methodology/git-methodology.md)

**Methodology: Trunk-Based Development with Conventional Commits**

Our team followed a disciplined **Trunk-Based Development (TBD)** strategy:

- **Single Trunk Branch**: `develop` branch always kept in deployable state
- **Short-Lived Feature Branches**: `feature/*` branches merged within days, not weeks
- **Conventional Commits**: Standardized commit messages (`feat:`, `fix:`, `docs:`, etc.) for automated changelogs
- **Pull Request Reviews**: All changes reviewed by peers before merging
- **CI/CD Integration**: Automated tests and builds on every PR
- **Branch Protection**: `develop` branch protected with required reviews and passing tests

**Workflow:**

1. Create feature branch from `develop`
2. Make small, frequent commits with conventional commit format
3. Open PR with clear description and issue reference
4. Peer review and CI checks
5. Merge to `develop` after approval
6. Automatic deployment on merge

**Evidence:**

- [docs/methodology/git-methodology.md](../methodology/git-methodology.md) complete methodology documentation
- Figure 1: Commit history showing conventional commit format
- Figure 2: Pull request review process
- Figure 3: GitHub Projects board integration with commits
- Consistent use of `Closes #<issue>` in commit footers for traceability

---

### Integration

**Documentation:**

- [External Libraries](../implementation/external-libraries.md)
- [API Endpoints](../design/api/endpoints.md)

**Integration Level: Multiple External APIs + Microservices + Inter-Group Integration**

**External Service Integrations:**

1. **Clerk Authentication** (Third-party SaaS)
   - User authentication and session management
   - OAuth providers (Google, GitHub)
   - User profile management
   - JWT token generation and validation

2. **Supabase** (Third-party BaaS)
   - PostgreSQL database hosting
   - Real-time subscriptions
   - File storage
   - Auto-generated REST API
   - Row-level security policies

3. **Google Cloud Run** (Cloud Platform)
   - Serverless container deployment
   - Automatic scaling
   - HTTPS endpoints
   - Health monitoring

**Inter-Group Integration:**

4. **"The SQL" Group - Forum Moderation**
   - External group uses our **Moderation API** for profanity detection
   - API Key-based authentication
   - Rate limiting enforced
   - Documented endpoints with examples

**Internal Microservice Architecture:**

- **Core Service**: Profile management
- **Matchmaking Service**: User matching logic
- **Messaging Service**: Letter delivery and scheduling
- **Moderation Service**: Content filtering (used internally + externally)
- **Frontend**: Next.js communicating with all backend services

**Evidence:**

- [docs/implementation/external-libraries.md](../implementation/external-libraries.md) comprehensive list of all integrations
- [docs/design/api/endpoints.md](../design/api/endpoints.md) shows moderation API used externally
- [docs/design/api/endpoints.md](../design/api/endpoints.md) line 76-78 shows external API key authentication
- Four deployed microservices on Google Cloud Run
- Supabase integration across all services
- Clerk authentication integrated in frontend

---

### Testing

**Documentation:**

- [Testing Strategy](../testing/strategy.md)
- [Running Tests](../testing/running-tests.md)

**Testing Approach: Comprehensive Unit + Integration Testing with CI Enforcement**

**Frontend Testing (Jest):**

- **Unit Tests**: React components, helper functions, utilities
- **Integration Tests**: Multi-component flows using Mock Service Worker (MSW)
- **Coverage**: 75%+(unit) and 50%+(integration) enforced by CI pipeline
- **Snapshot Testing**: UI component regression detection
- **User Interaction**: Testing Library for realistic user behavior

**Backend Testing (Pytest):**

- **Unit Tests**: Individual functions, business logic
- **Integration Tests**: API endpoints, database interactions
- **Coverage**: (75,60)%+(unit) 50%+(integration) enforced by CI pipeline for each api service
- **Fixtures**: Reusable test data and mocked dependencies
- **Async Testing**: Testing async endpoints and operations

**What We Test:**

-  Component rendering and props handling
-  State management and updates
-  API request/response handling
-  Error states and edge cases
-  Authentication flows
-  Database queries (mocked)
-  Business logic and validation
-  Cross-component integration

**What We Don't Test (Deliberate Exclusions):**

- L External API implementations (Clerk, Supabase internals) - rely on vendor testing
- L Third-party library internals - focus on our integration code
- L Generated code from frameworks
- L Simple pass-through functions with no logic

**CI/CD Integration:**

- **GitHub Actions**: Automated test runs on every PR
- **Coverage Gates**: PRs fail if coverage drops below 50%
- **Parallel Execution**: Frontend and backend tests run simultaneously
- **Artifacts**: Coverage reports uploaded for review
- **Branch Protection**: Cannot merge without passing tests

**Evidence:**

- [docs/testing/strategy.md](../testing/strategy.md) comprehensive testing documentation
- Test snapshots showing unit and integration test coverage (Figure: Frontend Unit Tests, Backend Unit Tests)
- MSW integration for realistic API testing
- CI/CD configuration enforcing coverage thresholds
- [docs/testing/running-tests.md](../testing/running-tests.md) instructions for running tests locally

---

### Tools

**Documentation:**

- [Technology Stack - Tools](../implementation/technologyStack.md#evidence-of-tool-usage)
- [Bug Tracker](../methodology/bug-tracker.md)
- [Git Methodology](../methodology/git-methodology.md)

**Tool Categories:**

**1. Project Work Tracker: GitHub Projects**

- **Kanban Board**: Columns from Backlog � Ready � In Progress � In Review � QA � Done
- **Sprint Planning**: Two-week sprints with issue tracking
- **Automated Workflows**: PRs move cards automatically
- **Issue Linking**: Commits reference issues with `Closes #<id>`
- **Burndown Tracking**: Sprint progress visible on board

**2. Bug Tracker: GitHub Issues**

- **Structured Templates**: Severity, priority, steps to reproduce, expected/actual results
- **Labels**: `type:bug`, `sev:S0-S3`, `prio:P0-P3`, `area:<service>`
- **SLA Tracking**: S0 (24h), S1 (2-3 days), S2 (1 sprint), S3 (backlog)
- **Integration**: Bugs appear on project board and link to PRs
- **Evidence Requirements**: Screenshots, logs, API proofs, test references

**3. Code Quality Tools:**

**Frontend:**
- **ESLint**: JavaScript/TypeScript linting with Next.js config
- **Prettier**: Code formatting (implicit via ESLint config)
- **TypeScript**: Static type checking (enforced in CI)
- **Jest**: Test coverage tracking and reporting

**Backend:**
- **MyPy**: Static type checking for Python (optional)
- **Pytest**: Test coverage with `--cov-fail-under=50`
- **Black**: Code formatting 

**4. CI/CD Enforcement:**

- **GitHub Actions**: Automated workflows on every PR
- **Linting Jobs**: ESLint (frontend)
- **Test Jobs**: Jest and Pytest with coverage gates
- **Build Jobs**: Verify builds complete successfully
- **Branch Protection**: Cannot merge without all checks passing
- **Required Reviews**: At least one peer approval required

**5. Communication & Coordination:**

- **GitHub Discussions**: Team collaboration
- **WhatsApp**: Daily stand-ups and quick sync
- **Google Meet**: Sprint planning and reviews
- **Google Forms**: User feedback collection
- **Slack/Discord**: Async team communication

**Evidence:**

- [docs/implementation/technologyStack.md](../implementation/technologyStack.md) "Evidence of Tool Usage" section
- [docs/methodology/bug-tracker.md](../methodology/bug-tracker.md) with screenshots of issue tracking
- Figure 3: GitHub Project Board showing Kanban workflow
- Figure 4: Repository structure showing config files (eslint.config.mjs, jest.config.js)
- CI configuration files enforcing quality gates
- Documented bug lifecycle with severity/priority system
- Pull request templates and code review process