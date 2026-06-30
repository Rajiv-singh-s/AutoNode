# AutoNode

**AI-powered Customer Acquisition Platform** — an AI Sales Operating System that ingests
Instagram, Messenger and WhatsApp conversations through official Meta APIs, then scores
leads, detects buying intent, filters spam, summarizes threads, and suggests replies in a
unified, realtime inbox.

> Status: **active build.** The current implementation delivers the foundation plus the
> **Inbox + Meta + AI** vertical slice (see [Implemented](#implemented)). Other surfaces
> (CRM, ads attribution, billing, landing site) are scaffolded in the schema and roadmap.

---

## Monorepo layout

```
apps/
  api/        NestJS API — auth, Meta webhooks, inbox, AI queue, realtime gateway
  web/        Next.js (App Router) — unified inbox UI, login
packages/
  database/   Prisma schema, client singleton, seed
  shared/     Cross-cutting types, Zod DTOs, WS event names
  ai/         Provider-agnostic AI layer (OpenAI + Anthropic) + analysis service
```

Tooling: **pnpm workspaces** + **Turborepo**. Strict TypeScript everywhere.

---

## Implemented

| Area | What works |
| --- | --- |
| **Auth** | Email register/login, JWT access + rotating refresh tokens, scrypt hashing, RBAC guard, multi-org membership |
| **Meta** | Webhook verification handshake, `X-Hub-Signature-256` HMAC verification, payload parsing for IG DMs/comments/story-replies, Messenger, WhatsApp Cloud; outbound send via Graph API; AES-256-GCM token encryption at rest |
| **Inbox** | Cursor-paginated conversation list, filters/search, thread view, send message, status/priority/assignment, internal notes, realtime updates via Socket.IO |
| **AI** | Pluggable provider (set `AI_PROVIDER`), conversation analysis (summary, sentiment, buying intent, lead score, priority, spam, language, labels), suggested replies, heuristic fallback when no key/model error |
| **Dashboard** | Headline metrics (hot leads, unread, conversion, revenue, avg first-response computed from real messages) + Recharts trend/stage/channel visualizations and AI insights, wired to `/analytics/*` |
| **CRM** | Leads table (filter/search by stage & score), editable lead detail drawer, and a pipeline kanban grouped by stage with per-column value, wired to `/contacts/*` |
| **Landing site** | Public marketing pages — home, features, pricing, about, contact, docs, blog, security, careers, and legal (privacy/terms/cookies) — with shared nav/footer, dark/light, animations, and a 404 |
| **Infra** | BullMQ queues (webhook, AI) with retries + dead-letter, Redis, Postgres, Docker Compose, Swagger at `/api/v1/docs`, health check, rate limiting |

---

## Quick start

```bash
# 1. Install
pnpm install

# 2. Bring up infra + schema + demo data in one command
pnpm stack:up                   # docker compose up -d → prisma generate → db push → seed

# 3. Run web + api together (turbo builds internal packages first)
pnpm dev
#   …or everything at once, infra included:
pnpm start:all                  # docker compose up -d && pnpm dev
```

Open http://localhost:3000 — the **marketing site** loads at `/`. Log in (top-right) with the
seeded credentials to reach the app:

- **owner@autonode.dev** / **Password123!**  (also: `sam@autonode.dev`)

You land on the **dashboard** (metrics + charts), with **Inbox**, **Leads** and **Pipeline** in the
sidebar — all wired to live data from the seeded org (15 leads across IG/Messenger/WhatsApp). New
inbound Meta webhooks appear live in the inbox and are auto-scored by AI.

### AI keys (optional)

Without `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, the AI layer uses a deterministic heuristic
so the app stays fully functional. Add a key in `apps/api/.env` and set `AI_PROVIDER` to
`openai` or `anthropic` for real model analysis.

### Meta webhooks

Point your Meta App's webhook callback to `https://<host>/api/v1/webhooks/meta`, using
`META_VERIFY_TOKEN` for verification and `META_APP_SECRET` for signature validation. For
local testing, tunnel with ngrok/cloudflared. Only official Graph APIs are used — no scraping.

---

## Testing

```bash
pnpm --filter @autonode/api test    # Meta parser + automations + webhook trigger tests
pnpm --filter @autonode/ai test     # AI analysis parsing + heuristic fallback
```

## Production Docker profile

`docker-compose.yml` now includes app services with multi-stage images:

- `api` (NestJS) at `:4000`
- `web` (Next.js production server) at `:3000`
- plus `postgres` + `redis`

Start full stack:

```bash
docker compose up --build -d
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run all apps in watch mode (turbo) |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | Strict type-check across the workspace |
| `pnpm db:studio` | Prisma Studio |

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the request/data flow.
