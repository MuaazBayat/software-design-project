## API

This section maps our API implementation to the assessment rubric criteria.

---

### Availability

**Documentation:** [API Endpoints](../design/api/endpoints.md)

All APIs are available both internally and externally:

- **Core Service**: Profile management and user data
  - URL: [https://globetalk-core-388957617777.us-central1.run.app/health](https://globetalk-core-388957617777.us-central1.run.app/health)

- **Matchmaking Service**: User matching and suggestions
  - URL: [https://globetalk-matchmaking-388957617777.us-central1.run.app/health](https://globetalk-matchmaking-388957617777.us-central1.run.app/health)

- **Messaging Service**: Scheduled message delivery
  - URL: [https://globetalk-messaging-388957617777.us-central1.run.app/health](https://globetalk-messaging-388957617777.us-central1.run.app/health)

- **Moderation Service**: Profanity detection (used by external group "The SQL")
  - URL: [https://globetalk-moderation-388957617777.us-central1.run.app/health](https://globetalk-moderation-388957617777.us-central1.run.app/health)

Each service includes health check endpoints for monitoring availability.

**Evidence:** [docs/design/api/endpoints.md](../design/api/endpoints.md) shows all service endpoints with authentication requirements and health checks.

---

### Architecture

**Documentation:** [Technology Stack - Microservices](../implementation/technologyStack.md#microservices-backend-services)

Our API follows **RESTful microservices architecture**:

- **FastAPI** framework for all microservices
- **RESTful principles**: proper use of HTTP methods (GET/POST/PUT)
- **Stateless services** with JWT authentication via Clerk
- **Service isolation**: Each service (Core, Matchmaking, Messaging, Moderation) has independent deployment and scaling

**Evidence:**

- [docs/implementation/technologyStack.md](../implementation/technologyStack.md) explains microservices choice
- [docs/design/api/endpoints.md](../design/api/endpoints.md) shows RESTful endpoint design

---

### Deployment

**Documentation:** [Technology Stack - Deployment & Infrastructure](../implementation/technologyStack.md#deployment--infrastructure)

All APIs are deployed using:

- **Google Cloud Run** (serverless container platform)
- **Docker** containerization for consistency
- **Automated CI/CD** via GitHub Actions

**Evidence:** [Above](#availability)

---

### Performance

**Documentation:**

- [Testing Strategy](../testing/strategy.md)
- [API Endpoints - Error Handling](../design/api/endpoints.md#status-codes-common)

**Load handling:**

- **Rate limiting** on moderation service (external API key limits)
- **Daily match limits** enforced by matchmaking service
- **Error handling**: Proper HTTP status codes (400, 401, 404, 409, 429)
- **Validation**: Request validation at API layer prevents crashes
- **Testing**: Integration tests verify error handling and edge cases

**Evidence:**

- [docs/design/api/endpoints.md](../design/api/endpoints.md) shows rate limiting and comprehensive error handling
- [docs/testing/strategy.md](../testing/strategy.md) shows integration testing of API behavior

---

### Design

**Documentation:** [API Endpoints](../design/api/endpoints.md)

**HTTP Methods:**

- **GET**: Retrieving resources (profiles, suggestions, messages)
- **POST**: Creating resources (profiles, matches, messages)
- **PUT**: Updating resources (profiles)

**Organization:**

- **Clear hierarchy**: `/profiles/{clerk_id}`, `/matches/find`, `/messages/page`
- **No redundancy**: Each endpoint serves a distinct purpose
- **Intuitive naming**: Resource-based paths (e.g., `/profiles/suggestions/{clerk_id}`)
- **Consistent patterns**: All services follow similar conventions
- **Versioning**: Moderation API uses `/api/v1` prefix for version control

**Evidence:** Full endpoint tables in [docs/design/api/endpoints.md](../design/api/endpoints.md) with models, examples, and cURL commands