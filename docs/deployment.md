# Coduet: Deployment Guide (Docker on a VPS / EC2)

This is the recommended way to run Coduet in production: one Linux server, Docker Compose, nginx in front. MongoDB, Redis and the TURN server run in the same stack. For a managed-hosting alternative see [deployment-render.md](deployment-render.md).

## What you need

- A Linux server (Ubuntu 22.04+ is a good default) with at least 2 vCPU and 4 GB RAM, and a **public IP**.
- A **domain name** pointing at the server. HTTPS is required in production: browsers only allow camera and microphone access on secure origins, and your JWT must not travel over plain HTTP.
- Docker with Compose v2 on the server.
- Accounts for the optional integrations: Cloudinary (avatars), Brevo (email), and API keys for Mistral, Gemini and Groq.

## 1. Open the right ports

In your firewall or security group:

| Port | Protocol | Purpose | Open to |
|---|---|---|---|
| 22 | TCP | SSH | Your IP only |
| 80, 443 | TCP | Web | Anyone |
| 3478 | UDP and TCP | TURN | Anyone |
| 49160-49200 | UDP | TURN media relay | Anyone |

Do **not** open 27017 (MongoDB), 6379 (Redis), 3001 or 4003. The compose file already binds them to `127.0.0.1`, and nothing outside needs them.

## 2. Prepare the environment file

Create `.env.production` on your machine (keep it out of git, and add `--exclude '.env.production'` to the rsync command in `scripts/deploy.sh` so it is only copied once, as `.env`). Start from `.env.example`:

```env
# Secrets: generate each one separately
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=
INTERNAL_API_KEY=
INTERNAL_EVENTS_KEY=
TURN_SECRET=

# Databases (hex only, so they are safe inside URLs)
REDIS_PASSWORD=
MONGO_USER=appuser
MONGO_PASSWORD=
MONGO_URI=mongodb://appuser:<MONGO_PASSWORD>@mongodb:27017/realtime-collab?authSource=admin

# Public URLs: use your real domain
CLIENT_URL=https://coduet.example.com
APP_URL=https://coduet.example.com

# AI
MISTRAL_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=

# Video calls: the server's PUBLIC IP, not a LAN address
TURN_REALM=coduet.example.com
PUBLIC_IP=203.0.113.10
TURN_URLS=turn:203.0.113.10:3478?transport=udp,turn:203.0.113.10:3478?transport=tcp
STUN_URLS=stun:stun.l.google.com:19302

# Avatars and email
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Coduet <verified-sender@example.com>"
MAIL_ENABLED=true
```

Notes:
- The service-level `.env` files inside `services/*` are **not** used by Docker. Only the root file is.
- `MAIL_FROM` must be a sender (or domain) you verified in Brevo. For a custom domain also set up SPF and DKIM, otherwise mail lands in spam.
- Never use the example values from the repo in production, and never commit real keys.

## 3. Deploy

The script syncs the code to `/home/ubuntu/realtime-collab` on the server (excluding `.env`, `node_modules`, `dist` and `.git`), copies `.env.production` over as `.env`, then rebuilds and restarts the stack.

```bash
export EC2_HOST=203.0.113.10          # the server's IP (the SSH user comes from EC2_USER)
export EC2_KEY=~/.ssh/my-key.pem
./scripts/deploy.sh
```

Then, on the server:

```bash
docker compose ps                 # every service should become "healthy"
curl http://localhost/nginx-health
docker compose logs -f room-service
```

After a deploy that recreates containers, restart nginx so it picks up the new container addresses:

```bash
docker compose restart nginx
```

## 4. HTTPS

nginx in this repo listens on port 80 only. Put TLS in front of it with one of these:

- **Cloudflare** (or another proxy/CDN) in front of the server. Easiest, and gives you DDoS protection too.
- **Caddy** or **certbot** on the host, terminating TLS on 443 and proxying to nginx on port 80.

If TLS terminates in front of nginx, make sure it forwards WebSocket upgrades, and set `CLIENT_URL` and `APP_URL` to the `https://` address. Check that the camera works over the HTTPS URL before announcing the deployment.

> TURN here runs without TLS (`--no-tls`), which is fine for WebRTC because media is already encrypted end to end. If your users sit behind very strict firewalls, consider adding TURN over TLS on port 443 later.

## 5. Backups and updates

**MongoDB backup** (run on the server, keep the file somewhere off the server):

```bash
docker compose exec -T mongodb sh -c 'mongodump --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db realtime-collab --archive --gzip' > backup-$(date +%F).archive.gz
```

Restore with `mongorestore --archive --gzip` using the same credentials. Redis persists to disk (`appendonly yes`); it only holds sessions, caches and live documents, so losing it logs users out but loses no accounts or rooms.

**Updating:** run `./scripts/deploy.sh` again. To roll back, check out the previous commit locally and deploy again.

**Resetting a development server:** `docker compose down -v` deletes the database and Redis volumes. Never do this on a server that holds real data.

## 6. Security checklist

- [ ] `.env` files are not in git (`git ls-files | grep "\.env"` should show only `.env.example`).
- [ ] Every secret is a fresh random value; Redis and MongoDB have passwords.
- [ ] Only the ports in the table above are open.
- [ ] HTTPS works; `CLIENT_URL` and `APP_URL` use `https://`.
- [ ] SSH uses a key and is limited to your IP.
- [ ] The default demo user in `infrastructure/mongodb/init.js` is removed.
- [ ] Docker and the OS receive security updates.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| A service is `unhealthy` and its dependents never start | Read its log: `docker compose logs <service> --tail 50`. For room-service or auth-service it is usually a MongoDB or Redis connection problem |
| `Authentication failed` from MongoDB | The `mongo-data` volume was created before auth was enabled (the `MONGO_INITDB_*` variables only apply to a fresh volume), or the password in `MONGO_URI` differs from `MONGO_PASSWORD`. On a dev machine run `docker compose down -v` and start again |
| `NOAUTH` / `WRONGPASS` from Redis | `REDIS_PASSWORD` is missing or contains characters that break the URL. Use hex |
| `502` right after a deploy | nginx cached old container addresses: `docker compose restart nginx` |
| Avatar upload fails with `413` | nginx upload limit. `client_max_body_size 3m;` must be set in the `/api/auth/` location |
| Avatar upload fails with `400` | File is not JPG/PNG/WEBP or is over 2 MB; also check the Cloudinary variables |
| Emails don't arrive | `MAIL_FROM` is not a verified Brevo sender, wrong `SMTP_USER`/`SMTP_PASS` (use the SMTP key, not your account password), or `MAIL_ENABLED=false`. Check `docker compose logs auth-service` |
| Video connects locally but not for others | `PUBLIC_IP` is not the server's public IP, or the TURN ports in section 1 are blocked |
| Camera/microphone blocked | The site is not served over HTTPS |
| AI calls fail | Missing or invalid provider keys; check `docker compose logs ai-service` |
| `429 Too Many Requests` | Rate limit reached. See the limits in [api.md](api.md) |
| Code runs return an error about languages | Only JavaScript, TypeScript and Python are installed and enabled |