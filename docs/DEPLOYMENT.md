# AutoNode — Production Deployment (VPS + Docker + Caddy)

This deploys the whole stack — Next.js web, NestJS API + BullMQ workers,
PostgreSQL, Redis — behind **Caddy** with **automatic HTTPS**, on one domain.
That permanent HTTPS URL is what Meta App Review requires.

## Prerequisites
- A Linux server (1 vCPU / 2 GB RAM minimum; 2 vCPU / 4 GB recommended) with
  **Docker** + the **docker compose** plugin installed.
- A **domain** with an **A record** pointing at the server's public IP.
- Ports **80** and **443** open in the firewall.

## 1. Get the code on the server
```bash
git clone <your-repo> autonode && cd autonode
# (or copy the project directory up via scp/rsync)
```

## 2. Configure environment
```bash
cp .env.production.example .env
nano .env     # set DOMAIN, ACME_EMAIL, POSTGRES_PASSWORD, JWT_SECRET,
              # ENCRYPTION_KEY, META_*/INSTAGRAM_* and AI keys
# Generate secrets:
openssl rand -base64 48     # -> JWT_SECRET
openssl rand -base64 32     # -> ENCRYPTION_KEY
```

## 3. Point DNS
Create an **A record**: `DOMAIN` → server public IP. Verify it resolves
(`dig +short app.yourdomain.com`) before the next step, so Caddy can issue TLS.

## 4. Build & start
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Caddy automatically obtains a Let's Encrypt certificate for `DOMAIN` on first
request. Check status:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f caddy   # watch TLS issuance
```

## 5. Initialize the database (one time)
```bash
docker compose -f docker-compose.prod.yml exec api \
  pnpm --filter @autonode/database exec prisma db push
# Optional demo data:
docker compose -f docker-compose.prod.yml exec api \
  pnpm --filter @autonode/database exec tsx prisma/seed.ts
```

## 6. Verify
```bash
curl https://app.yourdomain.com/api/v1/health      # {"status":"ok",...}
```
Open `https://app.yourdomain.com` — marketing site loads; log in for the app.

## 7. Update Meta to the permanent URL
In the Meta App (Instagram → API setup with Instagram login):
- **OAuth redirect URI:** `https://app.yourdomain.com/api/v1/integrations/meta/oauth/callback`
- **Webhook callback URL:** `https://app.yourdomain.com/api/v1/webhooks/meta`
  (verify token = your `META_VERIFY_TOKEN`)

No more cloudflare tunnel needed — this URL is permanent.

## 8. Go Live (required for real DM/comment webhooks)
Development mode only delivers test/auxiliary events. To receive real
`messages` + `comments` content, complete **App Review** for
`instagram_business_basic`, `instagram_business_manage_messages`,
`instagram_business_manage_comments` and switch the app to **Live**. You'll need
the public Privacy Policy (`https://app.yourdomain.com/privacy`) and Terms
(`/terms`) pages — already built into the site.

## Operations
```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f api web
# Update after code changes
git pull && docker compose -f docker-compose.prod.yml up -d --build
# Backup the database
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U autonode autonode > backup_$(date +%F).sql
```

## Notes
- Postgres/Redis are **not** published to the host — only reachable on the
  internal Docker network.
- `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` are baked into the web image at
  build time from `DOMAIN`; if you change the domain, rebuild (`--build`).
- For managed Postgres/Redis (e.g. RDS/Upstash) instead of containers, point
  `DATABASE_URL` / `REDIS_URL` at them and remove those services.
