# Stage 1: REST API Design & Real-Time Mechanism

### Core Actions Supported
1. **Fetch Notifications:** Allows an authenticated user to pull down their historical log stream.
2. **Mark as Read:** Updates a targeted unique entry resource state from unread to read.
3. **Real-time Live Stream:** Initiates a single continuous network stream channel to catch immediate live broadcast items instantly.

### API Specifications

#### 1. GET /api/v1/notifications
* **Headers:** `Authorization: Bearer <access_token>`
* **Query Params:** `page`, `limit`, `notification_type`
* **Response (200 OK):**
```json
{
  "success": true,
  "notifications": [
    {
      "ID": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "Type": "Result",
      "Message": "mid-sem exams postponed",
      "Timestamp": "2026-06-18 11:42:00"
    }
  ]
}