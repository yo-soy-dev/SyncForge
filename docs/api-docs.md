# SyncForge — API Documentation

**Base URL:** `https://syncforge-gateway.onrender.com`

All protected routes require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Authentication

### POST `/api/auth/signup`
Create a new user account.

**Request:**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "alice123"
}
```

**Response `201`:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "664abc123",
    "username": "alice",
    "email": "alice@example.com"
  }
}
```

**Errors:**
| Status | Message |
|---|---|
| 400 | Email or username already exists |
| 400 | Validation failed |

---

### POST `/api/auth/login`
Login with existing credentials.

**Request:**
```json
{
  "email": "alice@example.com",
  "password": "alice123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "664abc123",
    "username": "alice",
    "email": "alice@example.com"
  }
}
```

**Errors:**
| Status | Message |
|---|---|
| 401 | Invalid credentials |

---

### POST `/api/auth/logout`
🔒 Protected — Logout the current user.

**Response `200`:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET `/api/auth/verify-token`
Verify if a token is valid. Used internally by the API Gateway.

**Headers:**
```
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "success": true,
  "user": {
    "userId": "664abc123",
    "iat": 1716000000,
    "exp": 1716604800
  }
}
```

**Response `401`:**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

## Rooms

### POST `/api/rooms/create`
🔒 Protected — Create a new room.

**Request:**
```json
{
  "name": "My Workspace",
  "language": "javascript"
}
```

**Response `201`:**
```json
{
  "success": true,
  "room": {
    "_id": "664room123",
    "name": "My Workspace",
    "code": "ABC12XYZ",
    "language": "javascript",
    "owner": "664abc123",
    "members": [
      {
        "userId": "664abc123",
        "username": "alice",
        "joinedAt": "2024-05-19T10:00:00.000Z"
      }
    ],
    "isActive": true,
    "createdAt": "2024-05-19T10:00:00.000Z"
  }
}
```

---

### POST `/api/rooms/join`
🔒 Protected — Join a room using a room code.

**Request:**
```json
{
  "code": "ABC12XYZ"
}
```

**Response `200`:**
```json
{
  "success": true,
  "room": {
    "_id": "664room123",
    "name": "My Workspace",
    "code": "ABC12XYZ",
    "language": "javascript",
    "members": [ "..." ]
  }
}
```

**Errors:**
| Status | Message |
|---|---|
| 404 | Room not found or inactive |

---

### GET `/api/rooms/my-rooms`
🔒 Protected — Get all rooms for the current user.

**Response `200`:**
```json
{
  "success": true,
  "rooms": [
    {
      "_id": "664room123",
      "name": "My Workspace",
      "code": "ABC12XYZ",
      "language": "javascript",
      "members": [ "..." ],
      "createdAt": "2024-05-19T10:00:00.000Z"
    }
  ]
}
```

---

### GET `/api/rooms/:roomId`
🔒 Protected — Get a room by ID.

**Response `200`:**
```json
{
  "success": true,
  "room": {
    "_id": "664room123",
    "name": "My Workspace",
    "code": "ABC12XYZ",
    "language": "javascript",
    "owner": "664abc123",
    "members": [ "..." ]
  }
}
```

**Errors:**
| Status | Message |
|---|---|
| 404 | Room not found |

---

### GET `/api/rooms/code/:code`
🔒 Protected — Get a room by its room code.

**Response `200`:**
```json
{
  "success": true,
  "room": { "..." }
}
```

---

### DELETE `/api/rooms/:roomId`
🔒 Protected — Delete a room. Only the room owner can delete.

**Response `200`:**
```json
{
  "success": true,
  "message": "Room deleted successfully"
}
```

**Errors:**
| Status | Message |
|---|---|
| 403 | Only the room owner can delete this room |
| 404 | Room not found |

---

### POST `/api/rooms/:roomId/leave`
🔒 Protected — Leave a room. Only collaborators can leave (not the owner).

**Response `200`:**
```json
{
  "success": true,
  "message": "Left the room successfully"
}
```

**Errors:**
| Status | Message |
|---|---|
| 400 | Room owner cannot leave — delete the room instead |

---

## Files

### POST `/api/files/save`
🔒 Protected — Save a file in a room.

**Request:**
```json
{
  "roomId": "664room123",
  "filename": "main.js",
  "content": "console.log('Hello World')",
  "language": "javascript"
}
```

**Response `200`:**
```json
{
  "success": true,
  "file": {
    "_id": "664file123",
    "roomId": "664room123",
    "filename": "main.js",
    "content": "console.log('Hello World')",
    "language": "javascript",
    "savedBy": "664abc123",
    "updatedAt": "2024-05-19T10:30:00.000Z"
  }
}
```

---

### GET `/api/files/:roomId`
🔒 Protected — Get all files in a room.

**Response `200`:**
```json
{
  "success": true,
  "files": [
    {
      "_id": "664file123",
      "filename": "main.js",
      "language": "javascript",
      "updatedAt": "2024-05-19T10:30:00.000Z"
    }
  ]
}
```

---

### DELETE `/api/files/:fileId`
🔒 Protected — Delete a file.

**Response `200`:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## Code Execution

### POST `/api/execute/run`
🔒 Protected — Execute code in a sandboxed environment.

**Request:**
```json
{
  "code": "print('Hello from Python!')",
  "language": "python"
}
```

**Supported languages:** `javascript`, `python`, `typescript`

**Response `200`:**
```json
{
  "success": true,
  "stdout": "Hello from Python!\n",
  "stderr": "",
  "executionTime": 124
}
```

**Error response (compile/runtime error):**
```json
{
  "success": true,
  "stdout": "",
  "stderr": "SyntaxError: Unexpected token",
  "executionTime": 45
}
```

**Execution Limits:**
| Limit | Value |
|---|---|
| Timeout | 5 seconds |
| Max code size | 50 KB |
| Max output buffer | 512 KB |

---

## AI Assistant

### POST `/api/ai/review`
🔒 Protected — AI-powered code review.

**Request:**
```json
{
  "code": "function add(a,b){ return a+b }",
  "language": "javascript"
}
```

**Response `200`:**
```json
{
  "success": true,
  "review": "## Code Review\n\n### Issues Found\n..."
}
```

---

### POST `/api/ai/fix`
🔒 Protected — AI-powered code fix.

**Request:**
```json
{
  "code": "console.log('hello'",
  "language": "javascript",
  "error": "SyntaxError: missing ) after argument list"
}
```

**Response `200`:**
```json
{
  "success": true,
  "fixedCode": "console.log('hello')"
}
```

---

### POST `/api/ai/explain`
🔒 Protected — AI-powered code explanation.

**Request:**
```json
{
  "code": "const result = arr.reduce((acc, val) => acc + val, 0)",
  "language": "javascript"
}
```

**Response `200`:**
```json
{
  "success": true,
  "explanation": "This code calculates the sum of all elements in the array..."
}
```

---

### POST `/api/ai/chat`
🔒 Protected — Chat with AI about your code.

**Request:**
```json
{
  "message": "How can I optimize this function?",
  "code": "function slowSort(arr) { ... }",
  "language": "javascript"
}
```

**Response `200`:**
```json
{
  "success": true,
  "response": "You can optimize this by using a more efficient sorting algorithm..."
}
```

---

## WebSocket Events

**Connection URL:** `https://syncforge-collab.onrender.com`

```javascript
const socket = io(SOCKET_URL, {
  auth: {
    userId: "664abc123",
    username: "alice"
  }
})
```

### Client → Server Events

| Event | Payload | Description |
|---|---|---|
| `join-room` | `{ roomId, userId, username }` | Join a collaboration room |
| `yjs-update` | `Uint8Array` | Send a Yjs document update |
| `awareness-update` | `{ roomId, awarenessState }` | Send cursor or user presence state |

### Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `yjs-sync` | `Uint8Array` | Initial document state sent on join |
| `yjs-update` | `Uint8Array` | Incoming update from another user |
| `awareness-update` | `{ socketId, awarenessState }` | Another user's cursor or presence state |
| `user-left` | `{ socketId, username }` | A user disconnected from the room |
| `error` | `{ message }` | Error message from server |

---

## Rate Limiting

All API routes are rate limited at the gateway level:

| Limit | Value |
|---|---|
| Window | 15 minutes |
| Max requests per IP | 100 |
| Response on limit exceeded | `429 Too Many Requests` |

**429 Response:**
```json
{
  "success": false,
  "message": "Too many requests. Please slow down.",
  "retryAfter": "12 minutes"
}
```

---

## Health Checks

Every service exposes a health check endpoint:

```
GET /health

Response 200:
{
  "status": "ok",
  "service": "auth-service"
}
```

| Service | Visibility |
|---|---|
| API Gateway | Public |
| Auth Service | Internal |
| Room Service | Internal |
| Collaboration Service | Public |
| AI Service | Internal |
| Code Execution Service | Internal |