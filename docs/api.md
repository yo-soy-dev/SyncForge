# Coduet: API Reference

**Base URL:** `http://localhost` (Docker setup, through nginx). In production use your own domain. For debugging, the gateway is also available at `http://localhost:3001`.

All routes except the public ones below require a JWT:

```
Authorization: Bearer <token>
```

Every response is JSON with a `success` boolean. Errors look like this:

```json
{ "success": false, "message": "Human-readable reason" }
```

Validation errors may also include an `errors` array.

## Conventions

| Item | Value |
|---|---|
| Public routes | `POST /api/auth/signup`, `login`, `guest`, `forgot-password`, `reset-password` |
| Ids | 24-character hex MongoDB ObjectIds; invalid ids return `400` |
| Common statuses | `400` bad input, `401` not logged in, `403` no permission, `404` not found, `409` conflict, `413` too large, `422` rejected content, `429` rate limited, `502` AI provider failed, `503` rate limiter unavailable |
| Rate limits (per 15 min) | `/api/execute` 150, `/api/ai` 60, `/api/auth` 30, everything else 600. Guests: 20 execute, 10 AI |

**`429` response** (also sets `Retry-After`; success responses carry `X-RateLimit-Limit` and `X-RateLimit-Remaining`):

```json
{
  "success": false,
  "message": "Too many requests. Please wait and try again.",
  "retryAfterSeconds": 540
}
```

---

## Authentication

### `POST /api/auth/signup`
Create an account. Sends a welcome email (best effort, never blocks signup).

```json
{ "username": "alice", "email": "alice@example.com", "password": "alice123" }
```

Response:

```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "user": { "id": "664abc123", "username": "alice", "email": "alice@example.com" }
}
```

Errors: `400` validation failed or email/username already exists.

### `POST /api/auth/login`

```json
{ "email": "alice@example.com", "password": "alice123" }
```

Response is the same shape as signup, and `user` also includes `avatarUrl`. Logging in invalidates any earlier session for the account. Errors: `401` invalid credentials.

### `POST /api/auth/guest`
Start a temporary demo session. No body. The account and token last 24 hours, with reduced rate limits.

```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "user": { "id": "664def456", "username": "Guest-3fa91c", "email": "guest-...@guest.invalid", "isGuest": true }
}
```

### `POST /api/auth/logout`
Protected. Ends the current session.

### `GET /api/auth/verify-token`
Used by the gateway and the collaboration service. Returns the user from the token (`userId`, `username`, `iat`, `exp`, plus `isGuest` for guests) together with `avatarUrl`. Fails with `401` if the token is invalid or the session has ended.

### `POST /api/auth/forgot-password`
Public. Always answers the same way, whether or not the email has an account, so it can't be used to discover accounts. Limited to one email per address per minute.

```json
{ "email": "alice@example.com" }
```

```json
{ "success": true, "message": "If that email exists, a reset link has been sent" }
```

### `POST /api/auth/reset-password`
Public. Consumes the token from the emailed link (valid 15 minutes, single use) and logs the account out everywhere.

```json
{ "token": "<from the email link>", "password": "new-password" }
```

Password must be at least 6 characters. Errors: `400` invalid or expired link.

### `POST /api/auth/avatar`
Protected, not for guests. `multipart/form-data` with one file field named `avatar` (JPG, PNG or WEBP, max 2 MB).

```json
{
  "success": true,
  "user": { "id": "664abc123", "username": "alice", "email": "alice@example.com", "avatarUrl": "https://res.cloudinary.com/..." }
}
```

Errors: `400` missing file, wrong type or larger than 2 MB.

---

## Rooms

A room is either a normal **collab** room or an **interview** room. Members have the role `editor` or `viewer`; the creator is the implicit **owner**.

### `POST /api/rooms/create`
Protected.

```json
{ "name": "My Workspace", "language": "javascript", "type": "collab" }
```

`name` is required (max 50 characters). `language` is one of `javascript`, `python`, `typescript`, `java`, `cpp`, `go` (only the first three can be executed). `type` is `collab` (default) or `interview`.

Response `201`:

```json
{
  "success": true,
  "room": {
    "_id": "664room123",
    "name": "My Workspace",
    "code": "ABC12XYZ",
    "language": "javascript",
    "type": "collab",
    "owner": "664abc123",
    "members": [{ "userId": "664abc123", "username": "alice", "role": "editor", "joinedAt": "2026-01-01T10:00:00.000Z" }],
    "isActive": true
  }
}
```

Interview rooms also contain an `interview` object, including `candidateCode` and `observerCode` for the owner.

### `POST /api/rooms/join`
Protected. Join with a room code, or with an interview **candidate** or **observer** code.

```json
{ "code": "ABC12XYZ" }
```

Response `200`: `{ "success": true, "room": { ... } }`. Interview codes are only visible to the owner.

| Status | Message |
|---|---|
| `404` | Room not found |
| `409` | This interview has ended |
| `409` | This candidate link has already been used |
| `409` | You are already in this room and cannot become the candidate |
| `409` | You own this room / You are already in this room with a different role |

### `GET /api/rooms/my-rooms`
Protected. `{ "success": true, "rooms": [ ... ] }`

### `GET /api/rooms/code/:code`
Protected. Lightweight invite preview used by `/join/:code`.

```json
{ "success": true, "room": { "_id": "664room123", "name": "My Workspace", "code": "ABC12XYZ", "language": "javascript", "memberCount": 3 } }
```

### `GET /api/rooms/:roomId`
Protected. Returns the room and what the caller may do in it.

```json
{
  "success": true,
  "room": { "...": "..." },
  "role": "editor",
  "canWrite": true,
  "canUseAI": true,
  "canAskAI": true
}
```

`role` is `owner`, `editor` or `viewer`. In interview rooms the join codes are removed unless the caller is the owner. Errors: `403` no access to this room.

### `DELETE /api/rooms/:roomId`
Protected. Owner only. `403` otherwise.

### `POST /api/rooms/:roomId/leave`
Protected. Collaborators only; the owner must delete the room instead (`400`, "Room owner cannot leave the room. Delete the room instead.").

### `PATCH /api/rooms/:roomId/members/:userId`
Protected. Owner only. Change a member's role.

```json
{ "role": "viewer" }
```

`role` is `editor` or `viewer`. Returns `{ "success": true, "room": { ... } }`.

---

## Interviews

Only for rooms with `type: "interview"`.

### `PATCH /api/rooms/:roomId/interview`
Protected. Owner only. Send any subset of these fields; unknown fields are rejected.

| Field | Type | Rule |
|---|---|---|
| `candidateId` | string | Must be a room member (not the owner). Only while `scheduled` |
| `status` | string | `scheduled` -> `live` -> `ended`. Going `live` needs a candidate |
| `locked` | boolean | Locks or unlocks the candidate's editor |
| `aiAssist` | boolean | Turns Suggest on or off for people who can edit |
| `durationMin` | integer | 5 to 240 |
| `finalText` | string | Only accepted together with `status: "ended"`; saved as the `interview-end` snapshot |

Returns `{ "success": true, "room": { ... } }`. Errors: `400` invalid change, `403` not the owner.

### `PUT /api/rooms/:roomId/scorecard`
Protected. Interviewers only (the owner and editors who are not the candidate). Creates or updates your scorecard. All fields are optional.

```json
{
  "ratings": { "problemSolving": 3, "codeQuality": 4, "communication": 3, "testing": 2 },
  "notes": "Strong approach, light on tests.",
  "recommendation": "yes"
}
```

Ratings are integers 1 to 4 (or `null`). `notes` max 5,000 characters. `recommendation` is `strong_no`, `no`, `yes`, `strong_yes` or `null`. Returns `{ "success": true, "scorecard": { ... } }`.

### `GET /api/rooms/:roomId/scorecards`
Protected. Interviewers only. The owner receives every scorecard; other interviewers receive only their own. `{ "success": true, "scorecards": [ ... ] }`

### `GET /api/rooms/:roomId/timeline`
Protected. Interviewers only. `{ "success": true, "events": [ { "type": "interview_started", "actorName": "alice", "at": "...", "meta": {} } ] }`

Event types: `room_created`, `member_joined`, `candidate_set`, `interview_started`, `interview_ended`, `candidate_locked`, `candidate_unlocked`, `ai_enabled`, `ai_disabled`, `snapshot_saved`, `scorecard_saved`, `summary_saved`, `call_joined`, `call_left`, `call_screen_started`, `call_screen_stopped`.

### `GET /api/rooms/:roomId/summary`
Protected. Interviewers only. `{ "success": true, "summary": { "text": "...", "aiAssisted": false } }`, or `"summary": null` if none is written yet.

### `PUT /api/rooms/:roomId/summary`
Protected. Owner only.

```json
{ "text": "Candidate solved the task ...", "aiAssisted": false }
```

`text` max 8,000 characters. Returns `{ "success": true, "summary": { ... } }`.

### `GET /api/rooms/:roomId/summary-source`
Protected. Owner only. Returns the interview data used to draft a summary. `409` until the interview has ended.

---

## Version history

### `POST /api/rooms/:roomId/snapshots`
Protected. Requires write access.

```json
{ "text": "console.log('hi')", "language": "javascript", "kind": "manual" }
```

`kind` is `manual` (default), `auto`, `before-ai` or `before-restore`. `text` max 150,000 characters. Response `201`: `{ "success": true, "snapshot": { "_id": "...", "kind": "manual", "size": 17, "createdByName": "alice", "createdAt": "..." } }`. Only the newest 200 snapshots per room are kept.

### `GET /api/rooms/:roomId/snapshots`
Protected. Metadata only (no text), newest first. `{ "success": true, "snapshots": [ ... ] }`

### `GET /api/rooms/:roomId/snapshots/:snapshotId`
Protected. One snapshot including `text`. `404` if not found.

---

## Files

### `POST /api/files/save`
Protected. Requires write access. Saves (creates or updates) a file in a room; filenames are unique per room.

```json
{ "roomId": "664room123", "filename": "main.js", "content": "console.log('Hello')", "language": "javascript" }
```

Returns `{ "success": true, "file": { "_id": "...", "roomId": "...", "filename": "main.js", "language": "javascript", "savedBy": "...", "updatedAt": "..." } }`. Errors: `400` invalid room id or filename, `403` no write access, `413` file too large.

### `GET /api/files/:roomId`
Protected. Files in a room. `{ "success": true, "files": [ ... ] }`

### `DELETE /api/files/:fileId`
Protected. Deletes a file. `404` if it does not exist.

---

## Code execution

### `POST /api/execute/run`
Protected. Rate limited (150 per 15 minutes, 20 for guests).

```json
{ "code": "print(input())", "language": "python", "input": "hello" }
```

`input` is optional and is sent to the program's stdin. Supported `language` values: `javascript`, `typescript`, `python`.

```json
{ "success": true, "stdout": "hello\n", "stderr": "", "executionTime": 124 }
```

Program errors are returned in `stderr` with `success: true`. Exceeding the time limit produces a timeout message in `stderr`.

| Limit | Value |
|---|---|
| Time | 10 seconds |
| Code size | 50,000 characters |
| Output | 512 KB |
| Network | none |

---

## AI assistant

All AI routes need a `roomId`: the service checks that you may use AI in that room. In interview rooms free-form AI (`review`, `explain`, `fix`, `chat`) is disabled; only `suggest` works, and only when the owner has turned AI assistance on.

Code that looks like it contains a secret (API key, token, password) is rejected with `422` before reaching any model.

### `POST /api/ai/review`, `/api/ai/explain`, `/api/ai/fix`, `/api/ai/chat`

```json
{
  "roomId": "664room123",
  "code": "function add(a,b){ return a+b }",
  "language": "javascript",
  "message": "How can I make this faster?",
  "error": "SyntaxError: missing ) after argument list"
}
```

| Field | Used by | Limit |
|---|---|---|
| `roomId` | all | required |
| `code` | all (optional for `chat`) | 10,000 characters |
| `language` | all | `javascript`, `python`, `typescript`, `java`, `cpp`, `go` |
| `message` | `chat` (required) | 1,000 characters |
| `error` | `fix` (optional) | 1,000 characters |

Responses:

| Route | Response |
|---|---|
| `review` | `{ "success": true, "review": "<markdown>", "language": "javascript", "reviewedAt": "..." }` |
| `explain` | `{ "success": true, "explanation": "<markdown>", "language": "javascript", "explainedAt": "..." }` |
| `chat` | `{ "success": true, "response": "<markdown>", "timestamp": "..." }` |
| `fix` | `{ "success": true, "fixedCode": "<code>", "summary": "...", "language": "javascript" }` |

Errors: `403` no access / AI turned off / cannot edit right now, `422` secret detected or unusable AI output, `502` provider failure.

### `POST /api/ai/suggest`
Requires write access. Returns a replacement for a selection; apply it only after the user reviews the diff.

```json
{ "roomId": "664room123", "instruction": "Add input validation", "baseText": "function add(a,b){ return a+b }", "language": "javascript" }
```

`instruction` max 1,000 characters, `baseText` max 20,000. Response: `{ "success": true, "replacement": "<code>", "summary": "Added type checks" }`.

### `POST /api/ai/interview-summary`
Owner of a finished interview. Drafts a summary from the interview data.

```json
{ "roomId": "664room123" }
```

Response: `{ "success": true, "text": "<draft>" }`. Review and edit it, then save it with `PUT /api/rooms/:roomId/summary`.

---

## WebSocket (Socket.IO)

**URL:** the same origin as the app (`/socket.io/` through nginx). Authenticate with your JWT in the handshake; the server verifies it itself, so any `userId` or `username` sent by the client is ignored.

```javascript
import { io } from "socket.io-client"

const socket = io(SOCKET_URL, { auth: { token } })
socket.emit("join-room", { roomId })
```

### Client to server

| Event | Payload | Description |
|---|---|---|
| `join-room` | `{ roomId }` | Join a room. Access is checked against room-service |
| `leave-room` | none | Leave the current room |
| `yjs-update` | binary update | Send a document change. Ignored if you can't write |
| `awareness-update` | awareness state | Cursor, selection and presence |
| `call-join` / `call-leave` | none | Enter or leave the video call |
| `call-signal` | WebRTC signaling data | Offer, answer or ICE candidate for a peer |
| `call-media-state` | camera/mic state | Tell others about mute/camera changes |
| `call-screen-start` / `call-screen-stop` | none | Screen sharing |

### Server to client

| Event | Payload | Description |
|---|---|---|
| `yjs-sync` | array of bytes | Full document state, sent after joining |
| `yjs-update` | binary update | A change from another user |
| `awareness-update` | `{ socketId, ... }` | Another user's cursor or presence, including username and avatar |
| `room-role` | `{ role, canWrite }` | Your permissions, so the UI can become read-only (re-sent when they change) |
| `user-left` | `{ socketId, username }` | A user left the room |
| `call-peer-joined` / `call-peer-left` | peer info | Call participants changed |
| `call-signal` | WebRTC signaling data | Relayed signaling from a peer |
| `call-media-state` / `call-screen-state` | peer state | A peer changed camera, mic or screen sharing |
| `call-error` | `{ message }` | The call action failed |
| `error` | `{ message }` | General error |

Video calls are peer-to-peer; the server only relays signaling. TURN credentials are time-limited and derived from `TURN_SECRET`.

---

## Health checks

Every service answers `GET /health`:

```json
{ "status": "ok", "service": "auth-service" }
```

Through nginx only `GET /nginx-health` is exposed (`nginx ok`). The gateway's `/health` is reachable on `127.0.0.1:3001`.