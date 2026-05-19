# SyncForge — Real-time Collaborative Code Editor

> **Code Together. Build Smarter.**

SyncForge is a production-grade real-time collaborative code editor with AI assistance, built using a microservices architecture. Multiple developers can code simultaneously in the same editor, with changes synced in real-time across all connected users.

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | https://sync-forge-psi.vercel.app |
| API Gateway | https://syncforge-gateway.onrender.com |
| WebSocket | https://syncforge-collab.onrender.com |

---

## Features

- **Real-time Collaboration** — Multiple users edit simultaneously using Yjs CRDT
- **AI Code Assistant** — Review, fix, explain, and chat about your code
- **Code Execution** — Run JavaScript, Python, TypeScript directly in the browser
- **File Save** — Save and load code files within rooms
- **Room Management** — Create rooms with unique codes and invite collaborators
- **Role-based Access** — Owner can delete rooms; collaborators can leave
- **JWT Authentication** — Secure login with Redis session management
- **Rate Limiting** — API protection via Redis-based rate limiter

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI Framework |
| Vite | Build Tool |
| Monaco Editor | Code Editor (VS Code engine) |
| Yjs | CRDT real-time sync |
| Socket.IO Client | WebSocket connection |
| Framer Motion | Animations |
| Tailwind CSS | Styling |
| Sonner | Toast notifications |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | Backend runtime |
| Socket.IO | Real-time WebSocket server |
| Yjs | CRDT document management |
| MongoDB + Mongoose | Primary database |
| Redis | Sessions, caching, pub/sub |
| JWT | Authentication tokens |
| Docker | Containerization |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker Compose | Local orchestration |
| Nginx | Reverse proxy |
| MongoDB Atlas | Cloud database |
| Upstash Redis | Cloud Redis |
| Vercel | Frontend deployment |
| Render | Backend deployment |

---

## Architecture

```
Browser
   │
   ▼
Vercel (React Client)
   │
   ├──── REST API ────► Render (API Gateway :3000)
   │                         │
   │                    ┌────┴────┐
   │                    │  Redis  │ Rate limiting
   │                    └────┬────┘
   │                         │
   │              ┌──────────┼──────────┐
   │              ▼          ▼          ▼
   │         auth-service  room-service  ai-service
   │              │          │
   │         MongoDB Atlas  MongoDB Atlas
   │
   └──── WebSocket ────► Render (Collaboration Service :4003)
                              │
                         ┌────┴────┐
                         │  Redis  │ Pub/Sub sync
                         └─────────┘
```

---

## Microservices

| Service | Port | Responsibility |
|---|---|---|
| api-gateway | 3000 | Rate limiting, auth check, request routing |
| auth-service | 4001 | Signup, login, JWT, Redis sessions |
| room-service | 4002 | Room CRUD, file save/load, Redis caching |
| collaboration-service | 4003 | Socket.IO, Yjs sync, Redis pub/sub |
| ai-service | 4005 | AI review, fix, explain, chat |
| code-execution-service | 4004 | Sandboxed code runner (JS, Python, TS) |

---

## Getting Started

### Prerequisites

```bash
Node.js >= 18
Docker + Docker Compose
MongoDB Atlas account (free)
Upstash Redis account (free)
```

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/yo-soy-dev/syncforge.git
cd syncforge

# 2. Set up environment variables
cp .env.example .env
# Fill in your values in the .env file

# 3. Start with Docker
docker compose up --build

# 4. Open in browser
http://localhost:80
```

### Environment Variables

```env
# Root .env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
MISTRAL_API_KEY=your-mistral-key
REDIS_URL=rediss://...
```

---

## Project Structure

```
syncforge/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── pages/             # Route pages
│   │   ├── hooks/             # Custom hooks
│   │   ├── context/           # Auth context
│   │   └── services/          # API calls
│   └── Dockerfile
│
├── services/
│   ├── api-gateway/           # Entry point
│   ├── auth-service/          # Authentication
│   ├── room-service/          # Room management
│   ├── collaboration-service/ # Real-time sync
│   ├── ai-service/            # AI features
│   └── code-execution-service/# Code runner
│
├── shared/                    # Common utilities
│   ├── errors/                # Custom error classes
│   ├── middleware/            # Error handler
│   ├── utils/                 # Logger, asyncHandler
│   └── constants/             # Shared constants
│
├── infrastructure/
│   ├── nginx/                 # Nginx config
│   ├── redis/                 # Redis config
│   └── mongodb/               # DB init script
│
├── scripts/                   # Dev scripts
│   ├── dev.sh
│   ├── deploy.sh
│   └── seed.sh
│
└── docker-compose.yml
```

---

## Scripts

```bash
# Development
./scripts/dev.sh up                     # Start all services
./scripts/dev.sh down                   # Stop all services
./scripts/dev.sh logs                   # View logs
./scripts/dev.sh restart auth-service   # Restart a single service

# Seed demo data
./scripts/seed.sh

# Deploy to production
./scripts/deploy.sh
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

MIT License — free to use and modify.

---

Made with ❤️ by Devansh Kumar Tiwari