# Coduet: Alternative Deployment (Render + Vercel + managed databases)

This path uses free or low-cost managed platforms instead of your own server. It is quicker to start with, but it has real limits that are listed below, so read them first. For production, [deployment.md](deployment.md) (Docker on a VPS) is the better fit.

| Part | Platform |
|---|---|
| Frontend | Vercel |
| Backend services | Render (one web service per service) |
| Database | MongoDB Atlas |
| Redis | Upstash (or any managed Redis with a `rediss://` URL) |

## Limits to know first

- **Cold starts:** Render's free tier sleeps services after 15 minutes of inactivity, and the first request can take 30 to 50 seconds. A paid plan removes this.
- **Redis request budget:** every request touches Redis (rate limit, session check), and real-time sync publishes through it. Upstash's free tier has a daily request cap that a busy app can exhaust quickly.
- **No sandbox hardening for code execution:** the Docker setup runs the executor on an isolated, internet-less network with a read-only filesystem and dropped capabilities. Render can't reproduce that network isolation. Don't expose the executor publicly on shared hosting; either skip it (and hide the Run button) or run it on a server you control.
- **Services are public:** on Render every service gets a public URL. room-service, ai-service and the executor still require the internal API key, but auth-service does not, so its routes (signup, login, guest) can be reached without passing through the gateway's rate limits. Treat it accordingly.
- **No TURN server:** video calls will work on most home networks through STUN but can fail behind strict firewalls. You would need to host coturn separately.

## Prerequisites

- GitHub account with the code pushed (`.env`, `.env.production`, `node_modules/`, `dist/` and `*.log` in `.gitignore`).
- Accounts: MongoDB Atlas, Upstash, Render, Vercel.
- API keys for Mistral, Gemini and Groq. Optional: Cloudinary and Brevo.

## Step 1: MongoDB Atlas

1. Create a project and a free **M0** cluster in a region close to your users.
2. **Database Access:** add a user with a strong password.
3. **Network Access:** Render's outbound IPs change, so Atlas often needs `0.0.0.0/0`. This exposes the database to the internet and relies only on your password, so use a long random one and keep Atlas auditing on. A paid Render plan with static outbound IPs lets you restrict this.
4. Copy the connection string and **add the database name**:

```
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/realtime-collab?retryWrites=true&w=majority
```

## Step 2: Upstash Redis

Create a Redis database in a nearby region and copy the TLS URL:

```
rediss://default:<password>@<host>.upstash.io:6379
```

## Step 3: Deploy the backend on Render

Create each service with **New + > Web Service**, connect the repo, leave **Root Directory** empty and set the **Dockerfile Path**. Use instance type Free for testing.

Shared secrets (generate them once and reuse the same values where listed):

```
JWT_SECRET            auth-service
INTERNAL_API_KEY      room, ai, executor, collaboration, gateway (same value everywhere)
INTERNAL_EVENTS_KEY   room, collaboration (same value in both)
```

Deploy in this order and note each service's URL:

### auth-service
`Dockerfile Path: services/auth-service/Dockerfile`, name e.g. `coduet-auth`.

```
PORT=4001
NODE_ENV=production
MONGO_URI=<Atlas URL>
REDIS_URL=<Upstash URL>
JWT_SECRET=<secret>
APP_URL=<your Vercel URL>
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Coduet <verified-sender@example.com>"
MAIL_ENABLED=true
```

### room-service
`services/room-service/Dockerfile`, name e.g. `coduet-room`.

```
PORT=4002
NODE_ENV=production
MONGO_URI=<Atlas URL>
REDIS_URL=<Upstash URL>
INTERNAL_API_KEY=<secret>
INTERNAL_EVENTS_KEY=<secret>
```

### ai-service
`services/ai-service/Dockerfile`, name e.g. `coduet-ai`.

```
PORT=4004
NODE_ENV=production
REDIS_URL=<Upstash URL>
ROOM_SERVICE_URL=https://coduet-room.onrender.com
INTERNAL_API_KEY=<secret>
MISTRAL_API_KEY=
MISTRAL_MODEL=mistral-small-latest
GEMINI_API_KEY=
GEMINI_MODEL=
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
```

### code-execution-service (see the limits above)
`services/code-execution-service/Dockerfile`, name e.g. `coduet-executor`.

```
PORT=4005
NODE_ENV=production
INTERNAL_API_KEY=<secret>
```

### collaboration-service
`services/collaboration-service/Dockerfile`, name e.g. `coduet-collab`. Set `CLIENT_URL` to a placeholder first; you will update it after the Vercel deploy.

```
PORT=4003
NODE_ENV=production
REDIS_URL=<Upstash URL>
ROOM_SERVICE_URL=https://coduet-room.onrender.com
AUTH_SERVICE_URL=https://coduet-auth.onrender.com
CLIENT_URL=https://coduet.vercel.app
SERVER_ID=collab-server-1
INTERNAL_API_KEY=<secret>
INTERNAL_EVENTS_KEY=<secret>
STUN_URLS=stun:stun.l.google.com:19302
```

### api-gateway (deploy last)
`services/api-gateway/Dockerfile`, name e.g. `coduet-gateway`.

```
PORT=3000
NODE_ENV=production
REDIS_URL=<Upstash URL>
AUTH_SERVICE_URL=https://coduet-auth.onrender.com
ROOM_SERVICE_URL=https://coduet-room.onrender.com
COLLAB_SERVICE_URL=https://coduet-collab.onrender.com
AI_SERVICE_URL=https://coduet-ai.onrender.com
EXECUTE_SERVICE_URL=https://coduet-executor.onrender.com
INTERNAL_API_KEY=<secret>
CLIENT_URL=https://coduet.vercel.app
```

## Step 4: Deploy the frontend on Vercel

1. **New Project**, import the repo.
2. Settings: Framework **Vite**, Root Directory `client`, Build Command `npm run build`, Output Directory `dist`.
3. Environment variables (these are baked in at build time):

```
VITE_API_URL=https://coduet-gateway.onrender.com
VITE_SOCKET_URL=https://coduet-collab.onrender.com
```

4. Add `client/vercel.json` so client-side routes (`/join/:code`, `/room/:id`) don't return 404 on refresh:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

5. Deploy, then copy the Vercel URL.

## Step 5: Final wiring

Set `CLIENT_URL` (collaboration-service and api-gateway) and `APP_URL` (auth-service) to the real Vercel URL, then redeploy those three services. `CLIENT_URL` accepts a comma-separated list if you also use a custom domain or preview URLs.

## Step 6: Verify

```bash
curl https://coduet-gateway.onrender.com/health
curl https://coduet-collab.onrender.com/health

curl -X POST https://coduet-gateway.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"test123"}'
```

Open the Vercel URL, sign up, create a room, and join it from a second browser to confirm real-time sync.

## Keeping services awake (free tier)

The frontend can ping the services when the app loads so the first real request is faster. Put this in `client/src/utils/wakeup.js` and call `wakeUpServices()` from `main.jsx`:

```javascript
const SERVICES = [
  `${import.meta.env.VITE_API_URL}/health`,
  `${import.meta.env.VITE_SOCKET_URL}/health`,
]

export const wakeUpServices = () =>
  Promise.allSettled(SERVICES.map((url) => fetch(url).catch(() => null)))
```

This only helps once a visitor has already opened the app; a paid plan is the real fix.

## Troubleshooting

| Problem | What to check |
|---|---|
| Build fails with `shared/` not found | The Dockerfile copies `shared/` from the repo root, so the build context must be the repo root: leave Root Directory empty on Render |
| WebSocket won't connect | `VITE_SOCKET_URL` must point at the collaboration service, and its `CLIENT_URL` must match your Vercel origin exactly |
| Services can't reach each other | Use the full `https://...onrender.com` URLs, not Docker hostnames like `http://auth-service:4001` |
| MongoDB connection failed | Atlas Network Access, and the database name in `MONGO_URI` |
| Everything returns `401` after a redeploy | `JWT_SECRET` changed; users must log in again |
| AI or Run returns `503` | The internal API key differs between services, or Redis is unreachable (execute and AI fail closed) |
| Very slow first request | Render free-tier cold start |