# AutoNode Progress Report

Last updated: 2026-06-30 (night pass 2)

## Completed (implemented and verified)

### Critical fixes
- Fixed inbox typing issue (`isSpam`) in web conversation types.
- Fixed automations action/condition validation behavior and added coverage.
- Fixed automation trigger execution coverage for webhook-driven flows.

### Automations / Inbox / AI
- Automations service validation hardened and tested.
- Webhook processor trigger dispatch tested (`DM_KEYWORD`, `COMMENT_KEYWORD`, `NEW_CONVERSATION`).
- Inbox improvements completed:
  - Mark-as-read on conversation open
  - Status quick actions (resolve/reopen/spam/not-spam)
  - Agent assignment from thread
  - Internal notes tab + composer
- AI panel improvements completed:
  - More prominent AI summary block
  - Suggested replies persistence per conversation (PostgreSQL via `Conversation.aiSuggestedReplies`)

### Meta integration
- Implemented Meta OAuth flow:
  - `GET /integrations/meta/oauth/initiate`
  - `GET /integrations/meta/oauth/callback`
- Channel upsert + page webhook subscription from OAuth callback.
- Channels UI now supports “Connect with Meta” OAuth flow with success/error handling.
- Fixed runtime root-cause behind `Cannot GET /api/v1/integrations/meta/oauth/initiate`:
  - API was not booting cleanly due HealthController queue DI mismatch.
  - Health checks refactored to direct Bull queue probes via Redis connection.
  - Verified route registration in startup logs and endpoint resolution.
- Fixed channel reconnect behavior for soft-deleted channels (revive on reconnect instead of unique-key failure).

### New/extended platform modules
- Channels API + UI
- Team management API + UI
- Settings API + UI
- Notifications backend + UI (bell, unread count, mark read/all)
- Billing backend (Stripe) + UI (checkout/portal/status)
- Billing history persistence + UI listing (webhook-derived events)
- Plan usage/limits surfaced from live DB counts (team/channels/automations/contacts/conversations)
- CRM activity timeline persistence added:
  - New `Activity` model (PostgreSQL/Prisma)
  - Contact detail now returns recent activity records
  - New endpoint: `GET /contacts/:id/activities`
  - Lead drawer UI now renders contact activity timeline

### Production/readiness work
- Added org-scoped throttling guard (`OrgThrottlerGuard`).
- Improved health endpoint with DB/Redis/queue status and uptime.
- Added structured JSON logger service for API runtime logs.
- Added Dockerfiles for API and Web and wired app services in `docker-compose.yml`.
- Updated environment sample and README sections accordingly.
- Prisma billing event persistence model added and synced (`BillingEvent`).
- Prisma activity model added and synced (`Activity`, `ActivityType`).
- Activity write paths implemented for:
  - inbound webhook messages
  - outbound agent replies (success/failure)
  - internal notes
  - automation actions (`send_dm`, `add_label`, `set_stage`)
  - manual CRM lead updates (stage/score/value/tags)
- Usage-limit server-side enforcement implemented for core write paths:
  - channel connections (`ChannelsService.connect`)
  - Meta OAuth channel upserts on connect (`MetaOAuthService`)
  - automation creation (`AutomationsService.create`)
  - team seat assignment on invite acceptance (`TeamService.acceptInvitation`)
  - centralized via `BillingService.enforceLimit(...)`
  - Meta OAuth capacity hardening:
    - pre-computes unique channel targets before upsert
    - enforces channel capacity once with total required slots
    - processes upserts sequentially to avoid `Promise.all` race bypass
    - revives soft-deleted channels on OAuth reconnect (`deletedAt: null`)

### Test/build validation status
- API typecheck: passing
- API build (`nest build`): passing
- API tests (`vitest`): passing
- Web typecheck: passing
- Web build (`next build`): passing
- Compose config validation: passing

---

## Remaining Work

> Remaining items below are broader product-scope items still to be expanded/hardened.

1. Deep WhatsApp Business production hardening (advanced flows, templates, edge-case handling).
2. Meta Ads attribution depth (campaign/adset/ad creative mapping and revenue attribution quality).
3. Further CRM/Pipeline/Contacts/Lead-management enhancement breadth (beyond current baseline).
4. Analytics expansion and richer reporting surfaces.
5. API documentation polish/completeness review across all new endpoints.
6. End-to-end/integration test expansion across full user flows (web + api + queues + webhooks).
7. Final production hardening pass (observability, scaling, deployment environment tuning).
8. Token lifecycle hardening for channel credentials (proactive expiry detection/refresh workflows).
9. Extend usage-limit hard enforcement to remaining lower-volume mutation paths if required by final policy.
10. CRM depth extension for company entity and pipeline activity enrichment beyond current contact activity timeline.
