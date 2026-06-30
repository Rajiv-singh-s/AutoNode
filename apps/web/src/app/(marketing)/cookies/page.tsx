import { ContentPage, H2 } from '@/features/marketing/ContentPage';

export const metadata = { title: 'Cookie Policy — AutoNode' };

export default function CookiesPage() {
  return (
    <ContentPage title="Cookie Policy" subtitle="Last updated: June 30, 2026">
      <p>
        This policy explains how AutoNode uses cookies and similar technologies when you visit our
        website and use the application.
      </p>

      <H2>Essential cookies</H2>
      <p>
        We use strictly necessary cookies and local storage to keep you signed in (session and
        authentication tokens) and to remember preferences such as light/dark theme. The app cannot
        function without these.
      </p>

      <H2>Analytics</H2>
      <p>
        We may use privacy-respecting, aggregated analytics to understand how the marketing site is
        used. These do not identify you individually.
      </p>

      <H2>Managing cookies</H2>
      <p>
        You can clear cookies and local storage from your browser settings at any time. Doing so
        will sign you out of the application.
      </p>
    </ContentPage>
  );
}
