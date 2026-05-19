# SyncForge — System Architecture

## Overview

SyncForge follows a **microservices architecture** where each service has a single responsibility, communicates via HTTP (REST) or WebSocket, and can be scaled independently.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENTS                          │
│              Browser (React + Monaco + Yjs)             │
└──────────────────────┬──────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │ REST API              │ WebSocket
           ▼                       ▼
┌─────────────────┐    ┌──────────────────────┐
│   API Gateway   │    │  Collaboration       │
│   :3000         │    │  Service :4003       │
│                 │    │                      │
│ • Rate limiting │    │ • Socket.IO server   │
│ • Auth check    │    │ • Yjs CRDT sync      │
│ • Request proxy │    │ • Redis Pub/Sub      │
└────────┬────────┘    └──────────┬───────────┘
         │                        │
    ┌────┴──────────────┐         │
    │                   │         │
    ▼                   ▼         ▼
┌──────────┐  ┌──────────────┐  ┌──────────┐
│  Auth    │  │    Room      │  │  Redis   │
│ Service  │  │   Service    │  │          │
│  :4001   │  │   :4002      │  │ Sessions │
│          │  │              │  │ Cache    │
│ JWT auth │  │ Room CRUD    │  │ Pub/Sub  │
│ Sessions │  │ File save    │  │ Rate lmt │
└────┬─────┘  └──────┬───────┘  └──────────┘
     │                │
     ▼                ▼
┌─────────────────────────┐
│      MongoDB Atlas      │
│                         │
│  users    rooms  files  │
└─────────────────────────┘

    ┌────────────────────┐
    │     AI Service     │
    │       :4005        │
    │                    │
    │ Review / Fix       │
    │ Explain / Chat     │
    │ Mistral AI API     │
    └────────────────────┘

    ┌────────────────────┐
    │  Code Execution    │
    │  Service :4004     │
    │                    │
    │ JS / Python / TS   │
    │ Sandboxed runner   │
    │ 5s timeout         │
    └────────────────────┘
```

---

## Real-time Collaboration Flow

Yjs CRDT (Conflict-free Replicated Data Type) ensures all users stay in sync without conflicts.

```
Alice types "Hello"
      │
      ▼
Monaco Editor onChange
      │
      ▼
Yjs encodes update (binary)
      │
      ▼
socket.emit("yjs-update", update)
      │
      ▼
Collaboration Service (Server 1)
      │
      ├──► Y.applyUpdate(ydoc)     — update local document
      │
      ├──► socket.to(room).emit()  — broadcast to same-server users
      │
      └──► redisPub.publish()      — broadcast to other servers
                  │
                  ▼
            Redis Channel
            "yjs:roomXYZ"
                  │
                  ▼
      Collaboration Service (Server 2)
                  │
                  ▼
            Bob's browser
                  │
                  ▼
      Y.applyUpdate(ydoc) — Bob sees Alice's changes instantly
```

---

## API Gateway Pattern

Every request goes through the API Gateway — no service is directly accessible from outside.

```
Request: POST /api/rooms/create
              │
              ▼
        API Gateway
              │
         ┌────┴────┐
         │  Step 1 │ Rate Limiter
         │         │ Redis: check IP request count
         └────┬────┘ 100 requests / 15 minutes
              │
         ┌────┴────┐
         │  Step 2 │ Auth Check
         │         │ Calls auth-service /verify-token
         └────┬────┘ Validates JWT + Redis session
              │
         ┌────┴────┐
         │  Step 3 │ Proxy
         │         │ Forward request to room-service:4002
         └────┬────┘
              │
              ▼
        Room Service
        Creates room, caches result in Redis
```

---

## Redis Usage

Redis plays multiple roles in SyncForge:

```
┌─────────────────────────────────────────┐
│                  Redis                  │
│                                         │
│  1. Session Store                       │
│     Key: session:{userId}               │
│     Value: JWT token                    │
│     TTL: 7 days                         │
│                                         │
│  2. Room Cache (Cache-aside pattern)    │
│     Key: room:{roomId}                  │
│     Key: room:code:{code}               │
│     TTL: 1 hour                         │
│                                         │
│  3. Yjs Document Persistence            │
│     Key: ydoc:{roomId}                  │
│     Value: base64 encoded state         │
│     TTL: 7 days                         │
│                                         │
│  4. Rate Limiting                       │
│     Key: rate_limit:{ip}                │
│     Value: request count                │
│     TTL: 15 minutes                     │
│                                         │
│  5. Pub/Sub (Multi-server sync)         │
│     Channel: yjs:{roomId}               │
│     Channel: awareness:{roomId}         │
└─────────────────────────────────────────┘
```

---

## Cache-aside Pattern

Used in room-service for fast room lookups:

```
Request: GET /rooms/{roomId}
              │
              ▼
       Check Redis cache
              │
      ┌───────┴───────┐
      │               │
   HIT ✅           MISS ❌
      │               │
      ▼               ▼
  Return cached    Query MongoDB
    room data           │
                        ▼
                   Save to Redis
                   (TTL: 1 hour)
                        │
                        ▼
                   Return room data
```

---

## Authentication Flow

```
POST /api/auth/login
        │
        ▼
API Gateway → auth-service
        │
        ▼
1. Find user in MongoDB
2. bcrypt.compare(password, hash)
3. Generate JWT (7 days expiry)
4. Save token in Redis: session:{userId}
5. Return { token, user }
        │
        ▼
Client stores token in localStorage

Every subsequent request:
        │
        ▼
API Gateway reads Authorization header
        │
        ▼
Calls auth-service: GET /verify-token
        │
        ▼
1. jwt.verify(token, JWT_SECRET)
2. Redis check: session:{userId} exists?
3. Return { valid: true, user: decoded }
        │
        ▼
Sets x-user-id header for downstream services
```

---

## Code Execution Flow

```
User clicks "Run" (Ctrl+Enter)
        │
        ▼
POST /api/execute/run
{ code: "console.log('hi')", language: "javascript" }
        │
        ▼
API Gateway → code-execution-service
        │
        ▼
1. Validate code size (max 50KB)
2. Write to temp file (/tmp/{uuid}.js)
3. execFile("node", [file], { timeout: 5000 })
4. Capture stdout + stderr
5. Delete temp file
6. Return { stdout, stderr, executionTime }
        │
        ▼
Terminal panel displays output
```

---

## Database Schema

### Users Collection
```json
{
  "_id": "ObjectId",
  "username": "string (unique)",
  "email": "string (unique)",
  "password": "string (bcrypt hashed)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Rooms Collection
```json
{
  "_id": "ObjectId",
  "name": "string",
  "code": "string (8 chars, unique)",
  "language": "javascript | python | typescript | ...",
  "owner": "ObjectId (ref: User)",
  "members": [
    {
      "userId": "ObjectId",
      "username": "string",
      "joinedAt": "Date"
    }
  ],
  "isActive": "boolean",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Files Collection
```json
{
  "_id": "ObjectId",
  "roomId": "ObjectId (ref: Room)",
  "filename": "string",
  "content": "string",
  "language": "string",
  "savedBy": "ObjectId (ref: User)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## Security Measures

| Threat | Protection |
|---|---|
| Brute force login | Rate limiting (Redis) — 100 req/15min |
| Invalid JWT | jwt.verify() + Redis session check |
| Unauthorized room delete | Owner verification in room-service |
| Malicious code execution | 5s timeout + 50KB limit + temp file cleanup |
| XSS in AI responses | DOMPurify sanitization |
| Credential exposure | .env files, never committed to Git |

---

## Scalability

SyncForge is designed to scale horizontally:

```
Load Balancer
     │
     ├── Collaboration Service (Instance 1)
     ├── Collaboration Service (Instance 2)  ← Redis Pub/Sub keeps them in sync
     └── Collaboration Service (Instance 3)

All instances share:
  ✅ Same MongoDB Atlas
  ✅ Same Redis (Upstash)
  ✅ Yjs updates broadcast via Redis channels
```