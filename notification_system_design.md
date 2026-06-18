# Stage 1: REST API Design & Real-Time Mechanism

### Core Actions Supported
1. **Fetch Notifications**: Allows an authenticated student to retrieve their stream of notifications with support for filtering (by type and read status) and pagination.
2. **Mark as Read**: Updates the status of specific notifications (or all notifications) from unread to read.
3. **Real-time Alert Stream**: Establishes a persistent channel to push new alerts to the student instantly.

### API Specifications

#### 1. GET /api/v1/notifications
Retrieves a paginated list of notifications for the logged-in student.
* **Headers**: 
  - `Authorization: Bearer <access_token>`
  - `Accept: application/json`
* **Query Parameters**:
  - `page` (integer, default: 1): Current page.
  - `limit` (integer, default: 10): Items per page.
  - `notification_type` (string, optional): Filter by `Placement`, `Result`, or `Event`.
  - `is_read` (boolean, optional): Filter by read status.
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
        "type": "Result",
        "message": "Mid-semester exams scheduled from next Monday.",
        "isRead": false,
        "timestamp": "2026-06-18 11:42:00"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "limit": 10,
      "totalItems": 45,
      "totalPages": 5
    }
  }
}
```

#### 2. PATCH /api/v1/notifications/{id}/read
Marks a single notification as read.
* **Headers**:
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
* **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Notification marked as read successfully."
}
```

#### 3. POST /api/v1/notifications/read-all
Marks all unread notifications for the student as read.
* **Headers**:
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
* **Response (200 OK)**:
```json
{
  "success": true,
  "message": "All notifications marked as read."
}
```

---

### Real-time Notification Mechanism
We will implement **Server-Sent Events (SSE)** via `GET /api/v1/notifications/stream`.

#### Rationale (SSE vs. WebSockets):
1. **Unidirectional Flow**: Notifications flow exclusively from server to client. WebSockets (bidirectional) add unnecessary overhead.
2. **HTTP Native**: SSE runs over standard HTTP/1.1 or HTTP/2, easily passing through corporate firewalls and proxies without special port configurations.
3. **Automatic Reconnection**: Browsers natively handle connection dropouts and reconnect automatically using the `Last-Event-ID` header.
4. **Multiplexing**: Under HTTP/2, SSE connections are multiplexed over a single TCP connection, preventing browser port exhaustion.

#### SSE API Contract:
- **Endpoint**: `GET /api/v1/notifications/stream`
- **Headers**:
  - `Authorization: Bearer <access_token>`
  - `Accept: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- **Payload Stream Format**:
```http
event: notification
data: {"id":"b283218f-ea5a-4b7c-93a9-1f2f240d64b0","type":"Placement","message":"CSX Corporation hiring application starts now.","timestamp":"2026-06-18 12:00:00"}
```

---

# Stage 2: Database Storage Design

### Database Choice: PostgreSQL
We select **PostgreSQL** (Relational DBMS) for the following reasons:
1. **Transactional Consistency (ACID)**: Critical for tracking read/unread state. We must ensure that marking a notification as read is durable and never lost.
2. **Advanced Indexing**: Supports composite indexes, partial indexes, and expression indexes which are vital for optimizing read/write speeds on millions of rows.
3. **Table Partitioning**: Natively supports declarative partitioning by range (e.g., date ranges), making it easy to separate historical archives from active operational data.
4. **Relational Constraints**: Strongly enforces referential integrity between students and their notification records.

### Database Schema Design

#### `students` Table
```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `notifications` Table
```sql
CREATE TYPE notification_category AS ENUM ('Placement', 'Result', 'Event');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    notification_type notification_category NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Indexing Strategy
```sql
-- Partial index to optimize unread notifications query (covers active reads)
CREATE INDEX idx_notifications_unread 
ON notifications(student_id, created_at DESC) 
WHERE is_read = FALSE;

-- Composite index to cover general history queries
CREATE INDEX idx_notifications_history 
ON notifications(student_id, notification_type, created_at DESC);
```

---

### Data Volume Scaling & Solutions
As the notification volume increases to millions of rows, the following issues arise:
1. **Index Bloat in RAM**: Indexes grow too large to fit in memory, forcing slower disk reads.
2. **Table Bloat**: Write/update operations on database tables slow down due to write amplification.
3. **Slow Queries**: Sorting millions of historical records chronologically consumes substantial CPU.

#### Architectural Solutions:
* **Table Partitioning**: Partition the `notifications` table by range on the `created_at` column (e.g., monthly partitions). Recent partitions (active) will fit entirely in RAM, keeping queries fast. Older partitions can be detached or indexed separately.
* **Partial Indexes**: Instead of indexing every row, we use partial indexes (like `idx_notifications_unread` above). Since students read notifications quickly, the size of unread records is small, meaning this index stays tiny and highly performant in RAM.
* **Cold Data Archival**: Run a daily cron job that moves read notifications older than 90 days to a cold storage solution (like Amazon S3 or a data warehouse like BigQuery), deleting them from the operational DB.
* **Read Replicas**: Separate reads (students fetching feeds) from writes (sending notifications) by routing read queries to database replicas.

---

### Database Queries

#### 1. Fetch Unread Notifications for a Student (Paginated)
```sql
SELECT id, notification_type, message, is_read, created_at 
FROM notifications
WHERE student_id = :student_id AND is_read = FALSE
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

#### 2. Mark a Notification as Read
```sql
UPDATE notifications 
SET is_read = TRUE 
WHERE id = :id AND student_id = :student_id;
```

---

# Stage 3: SQL Query Optimization

### Relational Query Analysis
**Original Query:**
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

#### 1. Accuracy
The query is **accurate** in terms of logic: it successfully filters by student ID and unread status, and orders chronologically.

#### 2. Why is this query slow?
Without a dedicated index, the query planner must scan the entire `notifications` table (Full Table Scan) containing 5,000,000 rows. Even if there is an index on just `studentID`, the database must load all notifications for student 1042, filter out `isRead = false`, and perform an in-memory sort on `createdAt` (filesort), which is extremely slow on high volumes.

#### 3. The Optimal Change
We should create a **composite partial index** on `(studentID, createdAt)` filtering for `isRead = false`:
```sql
CREATE INDEX idx_student_unread_sort 
ON notifications(studentID, createdAt ASC) 
WHERE isRead = FALSE;
```
* **Computation Cost**: The query time drops from $O(N)$ (where $N=5,000,000$) to $O(\log N + K)$ (where $K$ is the number of unread notifications for that student). In practice, this execution time reduces from hundreds of milliseconds (or seconds) to **less than 1 millisecond** (index seek and sequential scan of index leaf nodes).

#### 4. Critique: "Add indexes on every column to be safe"
This advice is **highly counter-productive** for several reasons:
- **Write Performance Degradation**: Every `INSERT` and `UPDATE` statement forces the database engine to update *every* index. This causes massive write delays.
- **Disk Space and RAM Bloat**: Indexes occupy substantial disk storage. If every column is indexed, the total index size will exceed table size and easily overwhelm the server's RAM, causing constant page swapping.
- **Optimizer Confusion**: Too many indexes can confuse the database query optimizer, causing it to choose suboptimal query plans (e.g. index merging instead of a clean scan).

---

### Placement Notification Query (Last 7 Days)
To retrieve all students who received a placement notification in the last 7 days:
```sql
SELECT DISTINCT studentID 
FROM notifications
WHERE notificationType = 'Placement' 
  AND createdAt >= NOW() - INTERVAL '7 days';
```
*(Note: To make this query fast, a composite index on `(notificationType, createdAt)` is recommended).*

---

# Stage 4: High-Frequency Load Handling

### Solutions & Performance Improvements

1. **Redis Caching (Write-Through/Cache-Aside)**:
   - Store the active feed of unread notifications for each student in a Redis sorted set (`ZSET`), with the notification timestamp as the score.
   - When a student requests their notifications, serve them directly from Redis.
   - Update the cache when a new notification is generated or when a student marks a notification as read.
2. **Server-Sent Events (SSE) Push Stream**:
   - Establish an open connection so that the database isn't queried repeatedly. When a new notification occurs, the backend publishes it to the open stream immediately, eliminating polling.
3. **HTTP Cache Controls (Conditional Requests)**:
   - Use `ETag` (based on the latest notification ID/timestamp for a student) and `Cache-Control: private, max-age=0, must-revalidate`.
   - If no new notifications are available, the server returns `304 Not Modified`, saving database queries and body transport costs.

---

### Tradeoffs of Strategies

| Strategy | Pros | Cons |
| :--- | :--- | :--- |
| **Redis Caching** | Extremely fast reads (<1ms). Relieves DB from read pressure. | Cache invalidation complexity. High RAM cost for Redis cluster. |
| **SSE Real-Time Push** | Zero client polling. Immediate delivery. | Keeps TCP connections open. Demands higher server thread/connection limits. |
| **HTTP Conditional (ETag)**| Reduces payload transport, saves CPU on unchanged feeds. | Still requires a check on the server (though lightweight). |

---

# Stage 5: Notify All & Reliability

### Critique of Proposed Synchronous Implementation
```javascript
function notify_all(student_ids: array, message: string):
  for student_id in student_ids:
    send_email(student_id, message) # calls Email API
    save_to_db(student_id, message) # DB insert
    push_to_app(student_id, message) # SSE/WS push
```

#### Shortcomings Identified:
1. **Synchronous Blocking**: Making 50,000 sequential external HTTP requests (`send_email`) and database writes in a single loop blocks the server process/thread. At an average of 200ms per email request, this function would take **2.7 hours** to complete, resulting in standard gateway timeouts.
2. **No Fault Tolerance / Failure Cascading**: If the email API or database fails at student 20,000 (e.g. rate limit, connection drop), the script crashes. The remaining 30,000 students never receive the alert.
3. **Lack of Idempotency**: If the process crashes and is restarted, we risk resending duplicate notifications and emails to the first 20,000 students.
4. **Connection Exhaustion**: Running 50,000 individual queries one-by-one (`save_to_db`) overwhelms the database connection pool.

#### Failure Resolution: "send_email failed for 200 students midway"
With the original implementation, the system lacks tracking. The failed entries are lost unless we parse raw application logs, isolate the failed student IDs, and manually run a custom script.

#### Architectural Redesign (Asynchronous Queue Pattern):
We should separate the database inserts, email deliveries, and app pushes using a **Message Queue** (e.g., BullMQ or RabbitMQ) and background workers.
1. The API endpoint `/api/v1/notify-all` immediately enqueues a single bulk job (`NotifyAllJob`) and returns a `202 Accepted` response.
2. A background worker picks up `NotifyAllJob` and:
   - Batches the DB inserts (e.g., inserts notifications for 1,000 students at a time in a single query).
   - Enqueues 50,000 individual micro-jobs (`SendEmailJob` and `PushAppJob`) into respective queues.
3. Workers process the micro-jobs in parallel, utilizing retries with exponential backoff.
4. If a job fails repeatedly, it is moved to a **Dead-Letter Queue (DLQ)** for inspection, without affecting other deliveries.

---

### Revised Reliable Pseudocode

```typescript
// Producer / API Handler
async function handle_notify_all_request(student_ids: Array<string>, message: string) {
  // Enqueue a job to trigger the bulk process asynchronously
  await NotificationQueue.add("bulk_notify", { student_ids, message });
  return { status: "accepted", message: "Notification process started." };
}

// Consumer / Worker for Bulk Processing
async function process_bulk_notify_job(job) {
  const { student_ids, message } = job.data;
  const BATCH_SIZE = 1000;

  // 1. Batch insert notifications to DB to reduce query overhead
  for (let i = 0; i < student_ids.length; i += BATCH_SIZE) {
    const batch = student_ids.slice(i, i + BATCH_SIZE);
    await db.bulk_insert_notifications(batch, message, "Placement");
  }

  // 2. Enqueue individual send jobs for parallel processing & tracking
  for (const student_id of student_ids) {
    await EmailQueue.add("send_email", { student_id, message }, {
      attempts: 5, // Retry up to 5 times
      backoff: { type: "exponential", delay: 5000 } // Exponential backoff starting at 5s
    });
    
    await PushQueue.add("push_app", { student_id, message }, {
      attempts: 3,
      backoff: { type: "fixed", delay: 2000 }
    });
  }
}

// Consumer / Worker for Emails
async function process_send_email_job(job) {
  const { student_id, message } = job.data;
  const emailAddress = await db.get_student_email(student_id);
  
  // Call Email service provider API
  await emailServiceProvider.send(emailAddress, "New Campus Notification", message);
}

// Consumer / Worker for Real-time In-App Push
async function process_push_app_job(job) {
  const { student_id, message } = job.data;
  // Send message to active SSE stream or WebSocket client channel
  await pushService.publishToClient(student_id, {
    type: "Placement",
    message: message,
    timestamp: new Date().toISOString()
  });
}
```

---

# Stage 6: Priority Inbox Algorithm & Implementation

### Sorting Logic (Priority Criteria)
Priority is determined using a primary and a secondary sorting key:
1. **Category Weight (Primary Key)**: Categories are mapped to numerical weights:
   - `Placement`: Weight `3`
   - `Result`: Weight `2`
   - `Event`: Weight `1`
   - Others: Weight `0`
   A higher weight signifies higher priority.
2. **Recency (Secondary Key)**: If weights are identical, the notification with the more recent `Timestamp` (closer to the current time) is prioritized.

### Efficient In-Memory Maintenance
Since new notifications arrive dynamically, sorting the entire collection of size $N$ repeatedly is highly inefficient ($O(N \log N)$ per insertion).

#### Highly Efficient Maintenance using Bounded Insertion-Sorted Queue
Instead of keeping all notifications sorted, we maintain a **bounded sorted list of size exactly 10**:
- When a new notification arrives:
  1. Compare it with the 10th (last) element in our Priority Inbox array.
  2. If the array has less than 10 elements OR the new notification has a *higher* priority than the current 10th element:
     - Perform a binary search or linear search to find its correct insertion index ($O(\log 10) \approx O(1)$ operations).
     - Insert it at the calculated index.
     - If the list now has 11 elements, remove (`pop`) the 11th element.
  3. Otherwise, discard it.
- **Time Complexity**: $O(K)$ where $K$ is the size of the inbox ($10$). Since $K$ is constant, this is an **$O(1)$ constant time complexity** per insertion, making it highly efficient.
- **Space Complexity**: $O(K) = O(10)$ storage.

This bounded sorting structure is implemented in [priorityInbox.js](file:///C:/Users/mashe/OneDrive/Desktop/2303A51205/Campus-Evaluation-FS/notification-app-be/priorityInbox.js).