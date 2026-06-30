# AutoNode — Architecture

## High-level flow

```
                      ┌─────────────────────────────────────────────┐
   Meta (IG/FB/WA) ──▶│ POST /api/v1/webhooks/meta                  │
                      │  1. verify X-Hub-Signature-256 (HMAC)       │
                      │  2. persist WebhookEvent (idempotent)       │
                      │  3. enqueue → BullMQ "webhook" queue        │
                      └───────────────┬─────────────────────────────┘
                                      │
                      ┌───────────────▼─────────────────────────────┐
                      │ WebhooksProcessor (worker)                  │
                      │  parse → resolve Channel → upsert Contact   │
                      │  → upsert Conversation → append Message     │
                      │  → emit realtime → enqueue AI analysis      │
                      └──────────┬───────────────────┬──────────────┘
                                 │                   │
              ┌──────────────────▼──┐     ┌──────────▼───────────────┐
              │ RealtimeGateway      │     │ AiProcessor (worker)     │
              │ Socket.IO → org room │     │  AiService.analyze       │
              └──────────┬───────────┘     │  → persist signals       │
                         │                 │  → emit ai:analysis-ready│
                         │                 └──────────────────────────┘
              ┌──────────▼───────────┐
              │ Next.js web (inbox)  │  React Query invalidation on WS events
              └──────────────────────┘
```

## Outbound

`POST /api/v1/conversations/:id/messages` → `InboxService.sendMessage` persists a PENDING
message, calls `MetaGraphService.sendText` (decrypting the channel token just-in-time),
marks SENT/FAILED, and emits the update over WebSocket.

## Tenancy & security

- Every domain row carries `organizationId`. The JWT embeds the active `orgId`; controllers
  read it via the `@OrgId()` decorator and all queries are scoped to it.
- Three global guards: `ThrottlerGuard` (rate limit) → `JwtAuthGuard` (auth, `@Public()` to
  opt out) → `RolesGuard` (`@Roles(...)` RBAC).
- Meta access tokens are encrypted at rest with AES-256-GCM (`CryptoService`). Passwords use
  scrypt. Webhook authenticity is verified by HMAC before any processing.

## AI abstraction

`packages/ai` exposes `AiService` built on an `AiProvider` interface. `OpenAIProvider` uses
JSON mode; `AnthropicProvider` steers + prefills JSON. Swapping `AI_PROVIDER` is the only
change needed. Outputs are validated with Zod; invalid/erroring responses fall back to a
deterministic heuristic so the platform degrades gracefully.

## Reliability

BullMQ jobs use bounded exponential-backoff retries (`DEFAULT_JOB_OPTS`); exhausted jobs
remain in the failed set (dead-letter). Webhook ingestion is idempotent on a dedupe key, and
message creation is idempotent on the external message id, so Meta retries never duplicate.
```
