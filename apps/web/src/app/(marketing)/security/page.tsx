import { ContentPage, H2 } from '@/features/marketing/ContentPage';

export const metadata = { title: 'Security — AutoNode' };

export default function SecurityPage() {
  return (
    <ContentPage
      title="Security"
      subtitle="Security isn't a feature we bolt on — it's how AutoNode is built."
    >
      <H2>Official APIs only</H2>
      <p>
        AutoNode integrates exclusively through Meta&apos;s official Graph APIs. We never scrape or
        use unofficial endpoints, protecting your accounts from suspension.
      </p>

      <H2>Encryption</H2>
      <p>
        Meta access tokens are encrypted at rest with AES-256-GCM and decrypted only at the moment a
        request is dispatched. All traffic is encrypted in transit with TLS.
      </p>

      <H2>Webhook authenticity</H2>
      <p>
        Every inbound webhook is verified against your app secret using an HMAC{' '}
        <code>X-Hub-Signature-256</code> check before any processing occurs. Events are deduplicated
        to prevent replay.
      </p>

      <H2>Access control</H2>
      <p>
        Role-based access control (Owner, Admin, Manager, Sales, Support) governs every action.
        Administrative changes are recorded in an immutable audit log scoped to your organization.
      </p>

      <H2>Tenant isolation</H2>
      <p>
        Every record is scoped to an organization id and enforced on each query, so data is strictly
        isolated between tenants.
      </p>

      <H2>Reporting a vulnerability</H2>
      <p>
        Found something? Email{' '}
        <a className="text-primary hover:underline" href="mailto:security@autonode.app">
          security@autonode.app
        </a>
        . We respond to verified reports quickly and credit responsible disclosure.
      </p>
    </ContentPage>
  );
}
