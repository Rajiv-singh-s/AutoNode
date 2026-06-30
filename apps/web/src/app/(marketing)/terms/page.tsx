import { ContentPage, H2 } from '@/features/marketing/ContentPage';

export const metadata = { title: 'Terms of Service — AutoNode' };

export default function TermsPage() {
  return (
    <ContentPage title="Terms of Service" subtitle="Last updated: June 30, 2026">
      <p>
        These Terms govern your access to and use of AutoNode. By creating an account or using the
        service, you agree to these Terms.
      </p>

      <H2>Accounts</H2>
      <p>
        You are responsible for safeguarding your account credentials and for all activity under
        your organization. You must be authorized to connect any Meta assets you link to AutoNode.
      </p>

      <H2>Acceptable use</H2>
      <p>
        You agree to use AutoNode in compliance with Meta&apos;s Platform Terms and all applicable
        laws, including messaging, consent, and anti-spam regulations. You may not use the service
        to send unsolicited bulk messages or to harass recipients.
      </p>

      <H2>Subscriptions & billing</H2>
      <p>
        Paid plans are billed in advance on a recurring basis through our payment processor. You may
        cancel anytime; access continues until the end of the current billing period. Fees are
        non-refundable except where required by law.
      </p>

      <H2>Service availability</H2>
      <p>
        We strive for high availability and offer a 99.9% uptime SLA on the Scale plan. The service
        is provided &quot;as is&quot; without warranties except as expressly stated.
      </p>

      <H2>Limitation of liability</H2>
      <p>
        To the maximum extent permitted by law, AutoNode is not liable for indirect, incidental, or
        consequential damages, and our aggregate liability is limited to the fees you paid in the
        preceding twelve months.
      </p>

      <H2>Changes</H2>
      <p>
        We may update these Terms; we&apos;ll notify you of material changes. Continued use after
        changes take effect constitutes acceptance.
      </p>
    </ContentPage>
  );
}
