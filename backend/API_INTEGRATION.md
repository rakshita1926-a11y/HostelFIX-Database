# HostelFix — Backend API Integration Guide

This guide is the verified contract between the HostelFix Backend API and the Frontend client application. Every endpoint, payload, query parameter, status code, and header documented here has been verified directly against active backend source code (`server.js`, `routes/`, `middleware/`).

---

## 1. Quick Start & Environment Configuration

### Starting the Backend
```bash
cd HostelFIX/backend
npm install
npm start
```
The server will start at:
```
http://localhost:5000
```

### Running Backend Tests
```bash
npm test
# Runs the full automated regression suite across all 4 test suites:
# - tests/complaints.test.js
# - tests/lookups.test.js
# - tests/stage3_priority_rejection.test.js
# - tests/stage4b_assignment_security.test.js
```

### Server Health Check
Verify backend availability and live NeonDB database connectivity:
- **Endpoint:** `GET /health`
- **Authentication:** None (Public)
- **Response (200 OK):**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-10-24T01:30:00.000Z"
}
```

---

## 2. Network & CORS Configuration

- **API Base URL:** `http://localhost:5000/api`
- **Permitted Frontend Origins:**
  - Configured via `FRONTEND_URL` in `.env` (comma-separated list).
  - Built-in development fallbacks automatically permitted:
    - `http://localhost:5173` (Vite default)
    - `http://127.0.0.1:5173`
    - `http://localhost:3000` (React/Next default)
    - `http://127.0.0.1:3000`
- **Credentials:** `credentials: true` is enabled (cookies/auth headers allowed).
- **Allowed HTTP Methods:** `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS`.
- **Allowed Request Headers:** `Content-Type`, `Authorization`.
- **CORS Failure Behavior:** Requests from unauthorized origins receive `403 Forbidden` with `{ "error": "CORS policy rejection: Origin '<origin>' is not authorized." }`.

---

## 3. Authentication & JWT Handling

HostelFix uses JWT (JSON Web Tokens) with a 24-hour expiration.

### How to Attach Token
For all protected endpoints, attach the JWT token in the HTTP `Authorization` header:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Authentication Response Shapes

#### `POST /api/auth/login`
- **Access:** Public
- **Request Body (Student):**
```json
{
  "role": "student",
  "student_id": "RA2111003010123",
  "password": "YourStrongPassword123"
}
```
*(Alternatively, students may supply `"email"` instead of `"student_id"`)*

- **Request Body (Warden):**
```json
{
  "role": "warden",
  "warden_id": 1,
  "password": "YourStrongPassword123"
}
```
*(Alternatively, wardens may supply `"email"` instead of `"warden_id"`)*

- **Request Body (Technician):**
```json
{
  "role": "technician",
  "technician_id": 1,
  "password": "YourStrongPassword123"
}
```
*(Alternatively, technicians may supply `"phone"` instead of `"technician_id"`)*

- **Success Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "role": "student",
    "student_id": "RA2111003010123",
    "name": "Arjun Sharma",
    "email": "arjun@hostel.edu",
    "phone": "9876543210",
    "hostel_id": 1
  }
}
```
*(Warden `user` contains `warden_id`, `name`, `email`, `phone`, `hostel_id`, `role`. Technician `user` contains `technician_id`, `name`, `phone`, `specialization`, `role`)*

- **Error Responses:**
  - `400 Bad Request`: Missing role, invalid role, or missing identifier/password.
  - `401 Unauthorized`: `{ "error": "Invalid credentials" }` (constant-time check mitigates user enumeration).

---

## 4. Student Workflow Endpoints

### 4.1 Lookup Locations Scoped to Hostel
- **Endpoint:** `GET /api/locations`
- **Role:** `student`, `warden`
- **Query Parameters (Optional):**
  - `floor_no` (integer)
  - `location_type` (string, e.g. `Room`, `Washroom`, `Corridor`, `Common Area`)
  - `hostel_id` (integer, must match authenticated user's hostel)
- **Response (200 OK):**
```json
[
  {
    "location_id": 1,
    "location_name": "Room 101",
    "floor_no": 1,
    "location_type": "Room",
    "hostel_id": 1,
    "hostel_name": "L Block",
    "hostel_block": "Mens"
  }
]
```

### 4.2 Lookup Assets
- **Endpoint:** `GET /api/assets`
- **Role:** `student`, `warden`, `technician`
- **Query Parameters (Optional):**
  - `location_id` (integer)
  - `category` (string, matches `asset_type`)
- **Response (200 OK):**
```json
[
  {
    "asset_id": 1,
    "asset_name": "Ceiling Fan",
    "asset_type": "Electrical",
    "status": "Functional",
    "location_id": 1
  }
]
```

### 4.3 Submit New Complaint
- **Endpoint:** `POST /api/complaints`
- **Role:** `student`
- **Request Body:**
```json
{
  "location_id": 1,
  "description": "Ceiling fan making clicking sound on regulator speed 3 and above",
  "priority": "Medium",
  "asset_id": 1
}
```
- **Validation Rules:**
  - `location_id` (Required, Integer): Must exist and belong to the student's assigned `hostel_id`. Cross-hostel submissions return `403 Forbidden`.
  - `description` (Required, String): Non-empty text.
  - `priority` (Optional, String): Permitted student values are `'Low'`, `'Medium'`, `'High'`. Default is `'Medium'`.
    > [!IMPORTANT]
    > Submitting `'Urgent'` as a student returns `400 Bad Request`. Priority `'Urgent'` is reserved for administrative/warden escalation.
  - `asset_id` (Optional, Integer): If provided, must physically belong to the selected `location_id` (mismatch returns `400 Bad Request`).
- **Response (201 Created):**
```json
{
  "message": "Complaint registered successfully",
  "complaint_id": 105,
  "status": "Pending",
  "priority": "Medium"
}
```

### 4.4 View Own Complaints
- **Endpoint:** `GET /api/complaints`
- **Role:** `student`
- **Query Parameters (Optional):**
  - `status`: `'Pending'`, `'Assigned'`, `'In Progress'`, `'Resolved'`, `'Rejected'`
  - `priority`: `'Low'`, `'Medium'`, `'High'`, `'Urgent'`
- **Response (200 OK):** Array of complaints filed by the authenticated student, sorted by `complaint_date DESC`:
```json
[
  {
    "complaint_id": 105,
    "student_id": "RA2111003010123",
    "description": "Ceiling fan making clicking sound",
    "priority": "Medium",
    "status": "Assigned",
    "complaint_date": "2026-10-24T01:15:00.000Z",
    "location_name": "Room 101",
    "floor_no": 1,
    "location_type": "Room",
    "asset_name": "Ceiling Fan",
    "asset_type": "Electrical",
    "assigned_technician": "Rajesh Kumar",
    "technician_phone": "9876543211",
    "status_history": [
      {
        "history_id": 201,
        "status": "Pending",
        "changed_date": "2026-10-24T01:15:00.000Z",
        "changed_by": "RA2111003010123",
        "remarks": "Complaint created by student"
      },
      {
        "history_id": 202,
        "status": "Assigned",
        "changed_date": "2026-10-24T01:20:00.000Z",
        "changed_by": "1",
        "remarks": "Assigned to technician Rajesh Kumar (Electrical)"
      }
    ]
  }
]
```

### 4.5 View Single Complaint Detail
- **Endpoint:** `GET /api/complaints/:id`
- **Role:** `student` (Must own the complaint; cross-student access returns `403 Forbidden`).

---

## 5. Warden Workflow Endpoints

### 5.1 View Warden Complaint Queue (Priority-Ordered)
- **Endpoint:** `GET /api/warden/complaints`
- **Role:** `warden`
- **Query Parameters (Optional):**
  - `status`: Filter by `'Pending'`, `'Assigned'`, `'In Progress'`, `'Resolved'`, `'Rejected'`
  - `priority`: Filter by `'Urgent'`, `'High'`, `'Medium'`, `'Low'`
  - `page`: Integer (default 1)
  - `limit`: Integer (default 10)
- **Automatic Sorting Order:**
  Pre-sorted by database Priority Queue:
  `Urgent` (1) → `High` (2) → `Medium` (3) → `Low` (4) → `complaint_date ASC` (oldest complaints first within the same priority tier).
- **Response (200 OK):**
```json
[
  {
    "complaint_id": 105,
    "student_id": "RA2111003010123",
    "student_name": "Arjun Sharma",
    "student_contact": "9876543210",
    "description": "Ceiling fan making clicking sound",
    "priority": "High",
    "status": "Pending",
    "complaint_date": "2026-10-24T01:15:00.000Z",
    "location_name": "Room 101",
    "floor_no": 1,
    "location_type": "Room",
    "hostel_name": "L Block",
    "asset_name": "Ceiling Fan",
    "asset_type": "Electrical",
    "assigned_technician_id": null,
    "assigned_technician_name": null
  }
]
```

### 5.2 Lookup Technicians for Warden's Hostel
- **Endpoint:** `GET /api/warden/technicians`
- **Role:** `warden`
- **Query Parameters (Optional):** `specialization` (e.g. `'Electrical'`, `'Plumbing'`, `'Carpentry'`, `'Painting'`)
- **Hostel Isolation:** Automatically returns only technicians assigned to wardens in the authenticated warden's hostel.
- **Security:** `password_hash` is completely excluded from the query.
- **Response (200 OK):**
```json
[
  {
    "technician_id": 1,
    "name": "Rajesh Kumar",
    "phone": "9876543211",
    "specialization": "Electrical",
    "warden_id": 1,
    "supervising_warden_name": "Ananya Rao",
    "hostel_id": 1
  }
]
```

### 5.3 Assign Complaint to Technician
- **Endpoint:** `POST /api/warden/complaints/:id/assign`
- **Role:** `warden`
- **Request Body:**
```json
{
  "technician_id": 1,
  "remarks": "Assigned for immediate inspection"
}
```
- **Enforced Security Checks:**
  - Complaint must belong to the authenticated warden's hostel (else `403 Forbidden`).
  - Technician must belong to the authenticated warden's hostel (else `403 Forbidden`).
  - Cannot assign complaints with status `'Resolved'` (returns `400 Bad Request`).
  - Cannot assign complaints with status `'Rejected'` (returns `400 Bad Request`).
- **Response (200 OK):**
```json
{
  "message": "Complaint assigned successfully",
  "complaint_id": 105,
  "status": "Assigned",
  "assignment": {
    "assignment_id": 42,
    "complaint_id": 105,
    "technician_id": 1,
    "assigned_date": "2026-10-24T01:20:00.000Z",
    "completed_date": null
  },
  "status_history": {
    "history_id": 202,
    "complaint_id": 105,
    "status": "Assigned",
    "changed_date": "2026-10-24T01:20:00.000Z",
    "changed_by": "1",
    "remarks": "Assigned for immediate inspection"
  }
}
```

### 5.4 Reject Complaint
- **Endpoint:** `PATCH /api/warden/complaints/:id/reject`
- **Role:** `warden`
- **Request Body:**
```json
{
  "reason": "Duplicate complaint already logged by roommate in Room 101"
}
```
- **Validation Rules:**
  - `reason` (Required, String): Minimum 5 characters.
  - Cannot reject a complaint that is already `'Resolved'` or `'Rejected'` (returns `400 Bad Request`).
  - Cross-hostel rejection returns `403 Forbidden`.
- **Response (200 OK):**
```json
{
  "message": "Complaint rejected successfully",
  "complaint_id": 105,
  "status": "Rejected",
  "status_history": {
    "history_id": 203,
    "complaint_id": 105,
    "status": "Rejected",
    "changed_date": "2026-10-24T01:25:00.000Z",
    "changed_by": "Warden #1",
    "remarks": "Duplicate complaint already logged by roommate in Room 101"
  }
}
```

---

## 6. Technician Workflow Endpoints

### 6.1 View Assigned Work
- **Endpoint:** `GET /api/technician/assignments`
- **Role:** `technician`
- **Query Parameters (Optional):**
  - `status`: `'Pending'`, `'Assigned'`, `'In Progress'`, `'Resolved'`
  - `priority`: `'Urgent'`, `'High'`, `'Medium'`, `'Low'`
- **Scoping:** Strictly returns only complaints assigned to the authenticated technician (`req.user.technician_id`).
- **Response (200 OK):**
```json
[
  {
    "assignment_id": 42,
    "complaint_id": 105,
    "assigned_date": "2026-10-24T01:20:00.000Z",
    "completed_date": null,
    "complaint_status": "Assigned",
    "description": "Ceiling fan making clicking sound",
    "priority": "High",
    "complaint_date": "2026-10-24T01:15:00.000Z",
    "student_name": "Arjun Sharma",
    "student_contact": "9876543210",
    "location_name": "Room 101",
    "floor_no": 1,
    "location_type": "Room",
    "asset_name": "Ceiling Fan",
    "asset_type": "Electrical"
  }
]
```

### 6.2 Update Assignment Status
- **Endpoint:** `PATCH /api/technician/assignments/:id/status`
- **Role:** `technician`
- **Request Body:**
```json
{
  "status": "In Progress",
  "remarks": "Inspection complete; awaiting replacement capacitor"
}
```
*(Or when finished:)*
```json
{
  "status": "Resolved",
  "remarks": "Capacitor replaced and fan bearings lubricated. Operational."
}
```
- **Validation Rules:**
  - `status` (Required): Must be either `'In Progress'` or `'Resolved'`. Submitting `'Rejected'`, `'Pending'`, or arbitrary text returns `400 Bad Request`.
  - The technician must be the one assigned to this assignment (cross-technician tampering returns `403 Forbidden`).
  - When marked `'Resolved'`, `completed_date` is automatically set to `CURRENT_TIMESTAMP`.
- **Response (200 OK):**
```json
{
  "message": "Assignment status updated successfully",
  "assignment_id": 42,
  "complaint_id": 105,
  "status": "Resolved",
  "completed_date": "2026-10-24T02:00:00.000Z",
  "status_history": {
    "history_id": 204,
    "status": "Resolved",
    "changed_date": "2026-10-24T02:00:00.000Z",
    "changed_by": "1",
    "remarks": "Capacitor replaced and fan bearings lubricated. Operational."
  }
}
```

---

## 7. Status & Priority Allowed Value Matrix

| Field | Allowed Database Values | Frontend Notes |
| :--- | :--- | :--- |
| **`complaints.status`** | `'Pending'`, `'Assigned'`, `'In Progress'`, `'Resolved'`, `'Rejected'` | Enforced by `complaints_status_check`. |
| **`status_history.status`**| `'Pending'`, `'Assigned'`, `'In Progress'`, `'Resolved'`, `'Rejected'` | Enforced by `status_history_status_check`. |
| **`complaints.priority`** | `'Low'`, `'Medium'`, `'High'`, `'Urgent'` | Students can select `'Low'`, `'Medium'`, `'High'`. Wardens can view and escalate to `'Urgent'`. |
| **`hostel.block`** | `'Mens'`, `'Ladies'` | Enforced by `hostel_block_check`. |
| **`location.location_type`**| Strings up to 30 chars (e.g. `'Room'`, `'Washroom'`, `'Corridor'`, `'Common Area'`) | Used in filter dropdowns. |
| **`asset.status`** | Strings up to 50 chars (default `'Functional'`) | Operational status. |

---

## 8. HTTP Status Codes & Error Handling Conventions

| Status Code | Reason | Example Response Body |
| :--- | :--- | :--- |
| **`200 OK`** | Successful read, status update, or assignment. | Response payload object or array |
| **`201 Created`** | Successful complaint registration. | `{ "message": "...", "complaint_id": ... }` |
| **`400 Bad Request`** | Validation failure (e.g., student selecting `'Urgent'`, reason < 5 chars, non-integer ID). | `{ "error": "Reason must be at least 5 characters" }` |
| **`401 Unauthorized`** | Missing, malformed, or expired Bearer JWT token; invalid credentials on login. | `{ "error": "Access token required" }` or `{ "error": "Invalid credentials" }` |
| **`403 Forbidden`** | Role mismatch (e.g. student calling warden endpoint); cross-hostel complaint/technician access. | `{ "error": "Access denied: cannot assign a technician from another hostel" }` |
| **`404 Not Found`** | Requested complaint, assignment, or resource does not exist. | `{ "error": "Complaint not found" }` |
| **`500 Internal Error`**| Uncaught server or database failure. | `{ "error": "Internal server error" }` |

---

## 9. Known Limitations for Frontend Developers

1. **Hostel Scoping:** All operations are strictly partitioned by `hostel_id`. A student in Hostel 1 cannot view locations or lodge complaints for Hostel 2. A warden of Hostel 1 cannot assign or view complaints for Hostel 2. Ensure the UI filters dropdowns based on the authenticated user's hostel.
2. **Technician Hostel Assignment:** Technicians do not have a direct `hostel_id` column; they are linked to hostels via their supervising warden (`technician.warden_id -> warden.hostel_id`). The endpoint `GET /api/warden/technicians` automatically filters technicians matching the warden's hostel.
3. **Complaint Rejection is Terminal:** Once rejected, a complaint cannot be assigned or re-rejected without a formal re-open workflow (currently returns `400 Bad Request`).
4. **Student Identifier:** The student primary key and identifier is `student_id` (a `VARCHAR(20)` representing the college registration number, e.g. `RA2111003010123`).
