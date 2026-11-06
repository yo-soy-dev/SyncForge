# Coduet: Development Guide

## Requirements

- Docker with Compose v2
- Node.js 20+ (only for running the client or a service outside Docker)
- Git

## Run the whole stack

```bash
cp .env.example .env     # then fill in the values (see the reference below)
docker compose up -d --build
docker compose ps        # wait until every service is "healthy"
```

Open **http://localhost**. nginx serves the client and proxies `/api` and `/socket.io`, so no extra URLs are needed.

Useful commands:

```bash
docker compose logs -f room-service        # follow one service
docker compose up -d --build auth-service  # rebuild and restart one service
docker compose down                        # stop, keep data
docker compose down -v                     # stop and DELETE database/Redis data
./scripts/seed.sh                          # demo accounts and rooms
```

`docker compose config -q` validates the compose file and your `.env`; it prints nothing when everything is fine.

## Environment variables

Docker Compose reads **only the root `.env`**. The `.env` files inside `services/*` are used only if you run a service directly on your machine.

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use hex values for passwords, since they end up inside connection URLs.

| Variable | Used by | Required | Notes |
|---|---|---|---|
| `JWT_SECRET` | auth | yes | Signs login tokens. Changing it logs everyone out |
| `INTERNAL_API_KEY` | gateway, room, ai, executor, collaboration | yes | Shared secret for service-to-service calls |
| `INTERNAL_EVENTS_KEY` | room, collaboration | recommended | Lets the collaboration service record call events; if empty, call events aren't recorded |
| `REDIS_PASSWORD` | redis and all services | yes | Compose refuses to start without it |
| `MONGO_USER`, `MONGO_PASSWORD` | mongodb | yes | Root user created on first start of a fresh volume |
| `MONGO_URI` | auth, room | yes | `mongodb://USER:PASS@mongodb:27017/realtime-collab?authSource=admin` (Atlas works too; include the database name) |
| `CLIENT_URL` | gateway, collaboration | yes | Allowed browser origin(s), comma-separated. Use `http://localhost,http://localhost:5173` for local work |
| `APP_URL` | auth | yes | Base URL used in password-reset links |
| `MISTRAL_API_KEY` | ai | yes | Compose requires it |
| `MISTRAL_MODEL` | ai | no | Default `mistral-small-latest` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | ai | optional | Check the model name exists for your key |
| `GROQ_API_KEY`, `GROQ_MODEL` | ai | optional | Default model `openai/gpt-oss-120b` |
| `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT` | ai | optional | Tracing, off by default |
| `TURN_REALM`, `TURN_SECRET`, `PUBLIC_IP` | coturn | yes | Compose requires them. `PUBLIC_IP` must be the machine's public IP in production (a LAN IP works for local tests) |
| `TURN_URLS`, `STUN_URLS` | collaboration | optional | ICE servers handed to clients |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | auth | for avatars | Without them avatar upload fails |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | auth | for email | Brevo SMTP: host `smtp-relay.brevo.com`, port `587`, user = Brevo login, pass = SMTP key. `MAIL_FROM` must be a verified sender |
| `MAIL_ENABLED` | auth | no | `false` skips sending (useful for tests and the seed script) |
| `ENABLED_LANGUAGES` | executor | no | Default `javascript,python,typescript` |
| `VITE_RUNNABLE_LANGUAGES` | client (build time) | no | Default `javascript,typescript,python`. Keep it in sync with `ENABLED_LANGUAGES` if you enable more languages |

## Frontend development with hot reload

Run the backend in Docker and the client with Vite.

1. Publish the collaboration service locally by adding a `docker-compose.override.yml` next to `docker-compose.yml` (Compose loads it automatically; keep it out of production):

```yaml
services:
  collaboration-service:
    ports:
      - "127.0.0.1:4003:4003"
```

2. In `client/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:4003
```

3. Start the client:

```bash
cd client
npm install
npm run dev        # http://localhost:5173
```

`CLIENT_URL` in the root `.env` must include `http://localhost:5173`, otherwise the browser blocks the requests (CORS).

For the Docker build of the client, `VITE_API_URL` and `VITE_SOCKET_URL` are passed as empty build arguments in `docker-compose.yml`, which means "same origin" (nginx).

## Running a single service outside Docker

This is handy for debugging one service with a debugger. The code imports shared modules with relative paths (`../shared/...`) that resolve correctly inside the Docker image but not on your machine, so link the folder first:

```bash
# macOS / Linux / WSL
ln -s ../../shared services/auth-service/shared

# Windows PowerShell (needs Developer Mode or an elevated shell)
New-Item -ItemType SymbolicLink -Path services\auth-service\shared -Target ..\..\shared
```

Then start only the databases and point the service at them:

```bash
docker compose up -d mongodb redis      # published on 127.0.0.1 only
cd services/auth-service
npm install
npm run dev
```

In that service's `.env` use `localhost` instead of Docker hostnames, for example:

```env
MONGO_URI=mongodb://USER:PASS@localhost:27017/realtime-collab?authSource=admin
REDIS_URL=redis://:REDIS_PASSWORD@localhost:6379
```

Stop the Docker copy of that service first so the ports don't clash. The code-execution service is reachable only from inside Docker (its network is internal), so run it in Docker, and test Run and AI features against the full stack.

## Testing

- Shared package: `cd shared && node --test`
- Services: run the `test` script from each service's `package.json` where tests exist.
- AI quality: the evaluation harness lives in `services/ai-service/evals/`.

A good manual smoke test after changes:

1. Sign up (or use the guest demo), create a room, and run a snippet.
2. Open the room in a second browser profile and type in both; the edits should merge and show cursors.
3. Create an interview room, join as candidate with the candidate link, and check the lock and timer.
4. Upload a profile photo and confirm it shows in the navbar and in the room's user list.
5. Use "Forgot password" and complete a reset with a real mailbox (this needs `MAIL_ENABLED=true` and valid SMTP settings).

## Conventions

- ES modules everywhere (`import`/`export`).
- Throw the error classes from `shared/errors/ApiError.js` (`ValidationError`, `ForbiddenError`, `NotFoundError`, ...) so the shared error handler returns the right status. A plain `Error` becomes a `500`.
- Keep validation and permission rules in small pure functions (see `room-service/src/utils/`), so they are easy to unit test.
- Services take the caller's identity only from the gateway's headers, never from the request body.
- Redis keys and TTLs belong in `shared/constants` so every service uses the same names.
- When you add or change an endpoint, update [api.md](api.md); when you add a service, a Redis key or a collection, update [architecture.md](architecture.md).

## Common problems

| Symptom | Fix |
|---|---|
| `required variable ... is missing a value` | Add the variable to the root `.env` (see the table above) |
| A service is `unhealthy` | `docker compose logs <service> --tail 50` and read the first error |
| MongoDB `Authentication failed` after enabling auth | The old volume has no user: `docker compose down -v`, then start again (deletes local data) |
| Browser CORS errors | `CLIENT_URL` doesn't include the origin you are using |
| Avatar upload returns `413` | nginx needs `client_max_body_size 3m;` in the `/api/auth/` location |
| Changes to a service don't show up | Rebuild it: `docker compose up -d --build <service>` |