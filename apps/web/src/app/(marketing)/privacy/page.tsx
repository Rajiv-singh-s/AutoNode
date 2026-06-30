import { ContentPage, H2 } from '@/features/marketing/ContentPage';

export const metadata = { title: 'Privacy Policy — AutoNode' };

export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy Policy" subtitle="Last updated: June 30, 2026">
      <p>
        This Privacy Policy explains how AutoNode, Inc. (&quot;AutoNode&quot;, &quot;we&quot;)
        collects, uses, and protects information when you use our platform.
      </p>

      <H2>Information we collect</H2>
      <p>
        We collect account information (name, email, organization), and — when you connect a Meta
        account — the conversation content and contact metadata delivered to us through official
        Meta APIs. We process this data solely to provide the service.
      </p>

      <H2>How we use data</H2>
      <p>
        Conversation data is used to power your inbox, AI scoring, automations and analytics. We do
        not sell your data, and we do not use your customers&apos; messages to train third-party
        models beyond the AI provider you configure for your own workspace.
      </p>

      <H2>Data storage & security</H2>
      <p>
        Meta access tokens are encrypted at rest using AES-256-GCM. Access is restricted by
        role-based permissions, and administrative actions are recorded in an audit log. Data is
        stored on infrastructure with encryption in transit (TLS).
      </p>

      <H2>Data retention & deletion</H2>
      <p>
        You may export or delete your organization&apos;s data at any time from Settings. On account
        closure, we delete or anonymize personal data within 30 days, except where retention is
        legally required.
      </p>

      <H2>Your rights</H2>
      <p>
        Depending on your jurisdiction (including GDPR and CCPA), you may have rights to access,
        correct, port, or delete your personal data. Contact{' '}
        <a className="text-primary hover:underline" href="mailto:privacy@autonode.app">
          privacy@autonode.app
        </a>{' '}
        to exercise them.
      </p>

      <H2>Contact</H2>
      <p>Questions about this policy? Email privacy@autonode.app.</p>
    </ContentPage>
  );
}
