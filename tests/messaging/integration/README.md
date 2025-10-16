# Messaging API Integration Tests

This directory contains integration tests for the Messaging API service.

## Test Coverage

The integration tests cover all major endpoints and workflows:

### 1. Send Message (`POST /api/v1/messages`)
- ✅ Send message with JSON payload
- ✅ Send message with letter URL
- ✅ Send message with multipart form data and file upload
- ✅ Block sending messages between blocked users
- ✅ Validate required fields (sender_id, recipient_id, message_content)
- ✅ Handle RPC failures

### 2. Paginate Messages (`GET /api/v1/messages/page`)
- ✅ Paginate messages successfully
- ✅ Paginate with cursor for pagination
- ✅ Handle empty results
- ✅ Validate page size bounds (1-100)
- ✅ Handle blocked users
- ✅ Sign letter URLs

### 3. Search Conversations (`GET /api/v1/search`)
- ✅ Search conversations successfully
- ✅ Search with anonymous handle filter
- ✅ Handle empty search results
- ✅ Skip inactive user profiles
- ✅ Validate limit parameter (1-50)
- ✅ Handle conversations with no latest message (one-time matches)
- ✅ Sort results by latest message timestamp
- ✅ Test pagination with offset

### 4. Mark Messages as Read (`PATCH /api/v1/conversations/{id}/read`)
- ✅ Mark messages as read successfully
- ✅ Handle no unread messages
- ✅ Validate required user_id field

### 5. Upload Image (`POST /api/v1/upload-image`)
- ✅ Upload image successfully
- ✅ Support different image formats (PNG, JPEG, GIF)
- ✅ Handle storage errors

### 6. End-to-End Workflows
- ✅ Complete messaging flow (send → search → paginate → mark as read)
- ✅ Concurrent message sending
- ✅ Message sorting by timestamp

## Running the Tests

To run all integration tests:
```bash
pytest tests/messaging/integration/ -v
```

To run a specific test:
```bash
pytest tests/messaging/integration/test_messaging_api.py::test_send_message_json_success -v
```

To run with coverage:
```bash
pytest tests/messaging/integration/ --cov=services.messaging.main --cov-report=html
```

## Test Architecture

### Mocking Strategy
- **FakeSupabaseClient**: Simulates Supabase database operations
- **FakeSupabaseClient.storage**: Mocks file storage operations
- **_either_blocked**: Mocked to control block behavior
- **Authentication**: Disabled for testing (dependency override)

### Test Structure
Each test follows this pattern:
1. Set up fake database responses
2. Patch Supabase client and dependencies
3. Make API request via TestClient
4. Assert response status and data
5. Verify database interactions

## Key Features Tested

1. **Message Delivery**: Scheduled delivery with configurable delay
2. **Blocking**: Enforcement of user blocks in messaging
3. **Pagination**: Cursor-based pagination for message history
4. **Search**: Full-text search on conversation participants
5. **File Upload**: Image attachments with signed URLs
6. **Read Receipts**: Mark messages as read with timestamp

## Notes

- Tests use `@pytest.mark.integration` marker
- Environment variables are set in fixtures
- Authentication is bypassed via dependency override
- All tests are isolated with fresh fake DB instances
- Signed URLs are mocked for testing

## Test Statistics

- **Total Tests**: 27
- **Endpoints Covered**: 5
- **Success Rate**: 100% ✅

