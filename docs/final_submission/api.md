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

- [Load Testing & Performance Analysis](../testing/load-testing.md)
- [Testing Strategy](../testing/strategy.md)
- [API Endpoints - Error Handling](../design/api/endpoints.md#status-codes-common)

**Load Testing Results (Locust):**

Our Core API has been tested under load using Locust with real-world scenarios:

**Test Configuration:**
- **20 concurrent users**, 83 total requests over ~20 seconds
- **Tested endpoints:** Health checks, profile retrieval (existing & nonexistent users)

**Key Results:**
- **0% failure rate** on health checks (63 requests, 0 failures) ✅
- **0% failure rate** on 404 handling (nonexistent profiles handled correctly) ✅
- **API stability**: No crashes or 500 errors throughout testing
- **Throughput**: 4.1 requests/second sustained
- **Auto-scaling**: Google Cloud Run automatically handles load spikes

**Performance Characteristics:**
- Health endpoint: 6.6s average (affected by serverless cold starts)
- Profile endpoints: 13-15s average (includes database queries + potential auth checks)
- Note: Response times reflect serverless architecture cold starts; warm instances respond significantly faster

**Error Handling:**

All malformed requests are handled gracefully without crashes:
- **400 Bad Request**: Invalid business logic (duplicates, invalid IDs)
- **401 Unauthorized**: Missing/invalid JWT tokens
- **404 Not Found**: Non-existent resources
- **422 Unprocessable Entity**: Pydantic validation failures (wrong types, missing fields)
- **429 Too Many Requests**: Rate limiting on moderation service
- **500 Internal Server Error**: Database errors (never from user input validation)

**Crash Prevention:**

- **Health monitoring**: All services include `/health` endpoints
- **Database connection checks**: Services validate connections before handling requests
- **Auto-restart**: Cloud Run automatically restarts unhealthy containers
- **Input validation**: Pydantic models catch malformed data before processing

**Evidence:**

- [docs/testing/load-testing.md](../testing/load-testing.md) - Comprehensive load test results and methodology
- [tests/load/locustfile.py](../../tests/load/locustfile.py) - Load test scenarios for all services
- [docs/design/api/endpoints.md](../design/api/endpoints.md) - Error handling documentation
- Health endpoint implementations in all service main.py files

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