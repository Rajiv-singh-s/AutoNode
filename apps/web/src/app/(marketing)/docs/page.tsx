import { ContentPage, H2 } from '@/features/marketing/ContentPage';

export const metadata = { title: 'Documentation — AutoNode' };

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 text-[13px] text-foreground">
      <code>{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <ContentPage
      title="Documentation"
      subtitle="Get AutoNode running and connected to Meta in a few minutes."
    >
      <H2>1. Run the stack</H2>
      <p>AutoNode is a pnpm + Turborepo monorepo. Start Postgres and Redis, then the apps:</p>
      <Code>{`pnpm install
pnpm stack:up        # Postgres + Redis + schema + seed
pnpm dev             # web (3000) + api (4000)`}</Code>

      <H2>2. Sign in</H2>
      <p>
        The seed creates a demo organization. Visit <code>http://localhost:3000</code> and log in
        with <code>owner@autonode.dev</code> / <code>Password123!</code>.
      </p>

      <H2>3. Connect Meta</H2>
      <p>
        In your Meta App, set the webhook callback URL and verify token. AutoNode verifies every
        payload with your app secret (<code>X-Hub-Signature-256</code>) before processing.
      </p>
      <Code>{`Callback URL:  https://<your-host>/api/v1/webhooks/meta
Verify token:  $META_VERIFY_TOKEN
Fields:        messages, messaging_postbacks, comments`}</Code>
      <p>
        For local testing, tunnel port 4000 with a tool like ngrok and use the public URL as your
        callback.
      </p>

      <H2>4. Configure AI</H2>
      <p>
        Set a provider and key in <code>apps/api/.env</code>. Without a key, AutoNode runs in a
        deterministic heuristic mode so nothing breaks.
      </p>
      <Code>{`AI_PROVIDER=anthropic   # or: openai
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8`}</Code>

      <H2>API reference</H2>
      <p>
        The full REST API is documented with Swagger / OpenAPI at{' '}
        <code>/api/v1/docs</code> when the API is running. Endpoints are versioned, authenticated
        with a Bearer JWT, rate-limited, and scoped to your organization.
      </p>

      <H2>Architecture</H2>
      <p>
        Webhooks are verified, persisted idempotently, and queued (BullMQ) for processing. A worker
        parses each event, upserts the contact and conversation, emits a realtime update over
        WebSockets, and enqueues AI analysis. See <code>docs/ARCHITECTURE.md</code> in the repo for
        the full data flow.
      </p>
    </ContentPage>
  );
}
