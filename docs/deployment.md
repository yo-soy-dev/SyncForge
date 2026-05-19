# SyncForge — Deployment Guide

## Deployment Stack

| Service | Platform | Cost |
|---|---|---|
| Frontend (React) | Vercel | Free |
| Backend Services | Render | Free tier |
| Database | MongoDB Atlas | Free (512MB) |
| Redis | Upstash | Free (10K req/day) |

---

## Prerequisites

- GitHub account
- MongoDB Atlas account — [cloud.mongodb.com](https://cloud.mongodb.com)
- Upstash account — [upstash.com](https://upstash.com)
- Vercel account — [vercel.com](https://vercel.com)
- Render account — [render.com](https://render.com)
- Mistral API key — [console.mistral.ai](https://console.mistral.ai)

---

## Step 1 — GitHub Setup

```bash
# Initialize repo
git init
git add .
git commit -m "Initial commit — SyncForge"

# Push to GitHub
git remote add origin https://github.com/yo-soy-dev/syncforge.git
git push -u origin main
```

**Important — Make sure `.gitignore` includes:**
```
.env
.env.production
node_modules/
dist/
*.log
```

---

## Step 2 — MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. **New Project** → "SyncForge"
3. **Build a Cluster** → Free tier (M0)
4. Region: Mumbai (ap-south-1) — for faster access in India
5. **Database Access** → Add user → set username + password
6. **Network Access** → Add IP → `0.0.0.0/0` (allow all)
7. **Connect** → Drivers → Copy the connection string

```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/realtime-collab
```

---

## Step 3 — Upstash Redis Setup

1. Go to [upstash.com](https://upstash.com)
2. **Create Database** → Redis
3. Name: syncforge-redis
4. Region: ap-south-1 (Mumbai)
5. Select free tier
6. Copy the **REST URL** — it will be in this format:

```
rediss://default:password@host.upstash.io:6379
```

---

## Step 4 — Render Backend Deploy

### 4.1 — Account Setup

1. Go to [render.com](https://render.com)
2. **Sign up with GitHub**

### 4.2 — Deploy Services (in this order)

**auth-service:**
```
New + → Web Service
Name: syncforge-auth
Repository: username/syncforge
Branch: main
Root Directory: (blank)
Dockerfile Path: services/auth-service/Dockerfile
Instance Type: Free
```

Environment Variables:
```
PORT = 4001
MONGO_URI = <Atlas URL>
REDIS_URL = <Upstash URL>
JWT_SECRET = <random 32+ char string>
NODE_ENV = production
```

---

**room-service:**
```
Name: syncforge-room
Dockerfile: services/room-service/Dockerfile
Instance Type: Free
```

Environment Variables:
```
PORT = 4002
MONGO_URI = <Atlas URL>
REDIS_URL = <Upstash URL>
NODE_ENV = production
```

---

**ai-service:**
```
Name: syncforge-ai
Dockerfile: services/ai-service/Dockerfile
Instance Type: Free
```

Environment Variables:
```
PORT = 4004
REDIS_URL = <Upstash URL>
MISTRAL_API_KEY = <Mistral key>
NODE_ENV = production
```

---

**code-execution-service:**
```
Name: syncforge-executor
Dockerfile: services/code-execution-service/Dockerfile
Instance Type: Free
```

Environment Variables:
```
PORT = 4005
NODE_ENV = production
```

---

**collaboration-service:**

> Deploy first — we will update CLIENT_URL later

```
Name: syncforge-collab
Dockerfile: services/collaboration-service/Dockerfile
Instance Type: Free
```

Environment Variables:
```
PORT = 4003
REDIS_URL = <Upstash URL>
ROOM_SERVICE_URL = https://syncforge-room.onrender.com
CLIENT_URL = https://syncforge.vercel.app
SERVER_ID = collab-server-1
NODE_ENV = production
```

---

**api-gateway:**

> Deploy this last

```
Name: syncforge-gateway
Dockerfile: services/api-gateway/Dockerfile
Instance Type: Free
```

Environment Variables:
```
PORT = 3000
REDIS_URL = <Upstash URL>
AUTH_SERVICE_URL = https://syncforge-auth.onrender.com
ROOM_SERVICE_URL = https://syncforge-room.onrender.com
COLLAB_SERVICE_URL = https://syncforge-collab.onrender.com
AI_SERVICE_URL = https://syncforge-ai.onrender.com
EXECUTE_SERVICE_URL = https://syncforge-executor.onrender.com
NODE_ENV = production
```

### 4.3 — Note down Render URLs

```
https://syncforge-auth.onrender.com
https://syncforge-room.onrender.com
https://syncforge-collab.onrender.com
https://syncforge-ai.onrender.com
https://syncforge-executor.onrender.com
https://syncforge-gateway.onrender.com  ← this one is important
```

---

## Step 5 — Vercel Frontend Deploy

### 5.1 — Update Client Dockerfile

`client/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

`client/nginx.conf`:
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

### 5.2 — Vercel Deploy

1. Go to [vercel.com](https://vercel.com)
2. **New Project** → Import GitHub repo → SyncForge
3. Settings:
```
Framework Preset: Vite
Root Directory: client
Build Command: npm run build
Output Directory: dist
```

4. Environment Variables:
```
VITE_API_URL = https://syncforge-gateway.onrender.com
VITE_SOCKET_URL = https://syncforge-collab.onrender.com
```

5. Click **Deploy**!

You will get a Vercel URL: `https://sync-forge-psi.vercel.app`

---

## Step 6 — Final Updates

### Update CLIENT_URL in the Collaboration Service

Render Dashboard → syncforge-collab → Environment:
```
CLIENT_URL = https://sync-forge-psi.vercel.app
```

Redeploy the service.

---

## Step 7 — Verify Deployment

```bash
# Health checks
curl https://syncforge-gateway.onrender.com/health
curl https://syncforge-collab.onrender.com/health

# Auth test
curl -X POST https://syncforge-gateway.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'

# Frontend
open https://sync-forge-psi.vercel.app
```

---

## Cold Start Issue — Render Free Tier

Render free tier services **sleep after 15 minutes** of inactivity. The first request can take 30–50 seconds.

**Fix — `client/src/utils/wakeup.js`:**
```javascript
const SERVICES = [
  `${import.meta.env.VITE_API_URL}/health`,
  `${import.meta.env.VITE_SOCKET_URL}/health`,
]

export const wakeUpServices = async () => {
  console.log("Waking up services...")
  await Promise.allSettled(
    SERVICES.map(url =>
      fetch(url).catch(() => null)
    )
  )
}
```

**Add this to `client/src/main.jsx`:**
```javascript
import { wakeUpServices } from "./utils/wakeup"
wakeUpServices() // Runs in the background when the app loads
```

---

## Local Development

```bash
# Create .env file
cp .env.example .env
# Fill in the required values

# Run with Docker
docker compose up --build

# Open in browser
http://localhost:80
```

---

## Environment Variables Reference

### Root `.env`
```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=minimum-32-character-random-string
MISTRAL_API_KEY=your-mistral-api-key
REDIS_URL=rediss://default:password@host.upstash.io:6379
```

### Client `.env`
```env
VITE_API_URL=https://syncforge-gateway.onrender.com
VITE_SOCKET_URL=https://syncforge-collab.onrender.com
```

---

## Port Reference

| Service | Port |
|---|---|
| api-gateway | 3000 |
| auth-service | 4001 |
| room-service | 4002 |
| collaboration-service | 4003 |
| code-execution-service | 4004 |
| ai-service | 4005 |
| client (local) | 5173 |
| nginx (local) | 80 |

---

## Troubleshooting

**Build fails — shared/ not found:**
```
Make sure the Dockerfile copies shared/ from root:
COPY shared/ ./shared/
And that the build context is the root directory (.)
```

**WebSocket not connecting:**
```
Check that VITE_SOCKET_URL points to the collaboration-service
Check CORS settings in the collaboration-service
```

**Services not communicating on Render:**
```
Use full Render URLs — not localhost
https://syncforge-auth.onrender.com (not http://auth-service:4001)
```

**MongoDB connection failed:**
```
Check Atlas Network Access — is 0.0.0.0/0 allowed?
Check that MONGO_URI format includes the database name
```

**Cold start too slow:**
```
Add wakeup.js to ping services on app load
Consider upgrading to Render paid plan ($7/month) — no sleep
```