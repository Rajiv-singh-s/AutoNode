import { ContentPage, H2 } from '@/features/marketing/ContentPage';

export const metadata = {
  title: 'Data Deletion — AutoNode',
  description: 'How to delete your data and your customers’ data from AutoNode.',
};

export default function DataDeletionPage() {
  return (
    <ContentPage
      title="Data Deletion Instructions"
      subtitle="How to permanently delete your account and all associated data from AutoNode."
    >
      <p>
        AutoNode gives you full control over your data. You can delete your data at any time, either
        directly inside the app or by sending us a request. This page also explains how the
        Instagram/Meta data we receive on your behalf is removed.
      </p>

      <H2>What data AutoNode stores</H2>
      <p>When you use AutoNode we may store:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Your account details (name, email) and organization/team information.</li>
        <li>Connected channel data and <strong className="text-foreground">encrypted</strong> Meta/Instagram access tokens.</li>
        <li>
          Conversations, comments, contacts/leads, messages, automations and analytics generated
          from your connected Instagram, Messenger and WhatsApp accounts.
        </li>
      </ul>

      <H2>Option 1 — Delete in the app (fastest)</H2>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Log in to AutoNode and go to <strong className="text-foreground">Settings → Channels</strong>.</li>
        <li>
          <strong className="text-foreground">Disconnect</strong> each connected Instagram/Meta
          account. This revokes and deletes the stored access token immediately.
        </li>
        <li>
          Go to <strong className="text-foreground">Settings → Danger Zone</strong> and choose{' '}
          <strong className="text-foreground">Delete organization / account</strong>.
        </li>
        <li>
          Confirm. This permanently removes your account and all conversations, contacts, messages,
          automations and analytics associated with it.
        </li>
      </ol>

      <H2>Option 2 — Request deletion by email</H2>
      <p>
        If you can&apos;t access your account, email{' '}
        <a className="text-primary hover:underline" href="mailto:privacy@autonode.app?subject=Data%20Deletion%20Request">
          privacy@autonode.app
        </a>{' '}
        from the email address on your account with the subject{' '}
        <strong className="text-foreground">&quot;Data Deletion Request&quot;</strong> and include:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Your account email and organization name.</li>
        <li>The Instagram username(s) / channels you connected.</li>
      </ul>
      <p>
        We verify ownership, then delete your data and confirm by email. No account login is required
        for an email request.
      </p>

      <H2>Removing Instagram / Meta access</H2>
      <p>
        You can also revoke AutoNode&apos;s access from Instagram itself:{' '}
        <strong className="text-foreground">
          Instagram → Settings → Apps and websites → Active
        </strong>{' '}
        → remove <strong className="text-foreground">AutoNode-IG</strong>. Once access is revoked,
        AutoNode stops receiving your data, and the tokens and content we hold are deleted as part of
        the steps above.
      </p>

      <H2>Timeline &amp; scope</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Access tokens are deleted <strong className="text-foreground">immediately</strong> on
          disconnect.
        </li>
        <li>
          Your account and all associated conversation, contact, message, automation and analytics
          data are permanently deleted within <strong className="text-foreground">30 days</strong> of
          your request (usually much sooner).
        </li>
        <li>
          We retain only the minimum records required by law (e.g. certain billing/tax records),
          which are never used for any other purpose.
        </li>
      </ul>

      <H2>Questions</H2>
      <p>
        Contact{' '}
        <a className="text-primary hover:underline" href="mailto:privacy@autonode.app">
          privacy@autonode.app
        </a>{' '}
        for anything related to your data. See also our{' '}
        <a className="text-primary hover:underline" href="/privacy">
          Privacy Policy
        </a>
        .
      </p>
    </ContentPage>
  );
}
