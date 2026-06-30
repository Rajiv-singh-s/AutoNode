import { ContentPage, H2 } from '@/features/marketing/ContentPage';

export const metadata = { title: 'About — AutoNode' };

export default function AboutPage() {
  return (
    <ContentPage
      title="We turn DMs into revenue"
      subtitle="AutoNode is the AI Sales Operating System for businesses that win customers through social conversations."
    >
      <p>
        Modern buyers don&apos;t fill out forms — they slide into your DMs. They comment on a reel,
        reply to a story, or message your WhatsApp at midnight. For most businesses, those moments
        are lost in a flood of notifications across three different apps.
      </p>
      <p>
        AutoNode brings every Instagram, Messenger and WhatsApp conversation into one inbox and puts
        an AI layer on top: scoring leads, detecting buying intent, filtering spam, and surfacing the
        conversations most likely to close — so your team always works the right deal next.
      </p>

      <H2>Our principles</H2>
      <p>
        <strong className="text-foreground">Official APIs only.</strong> We integrate exclusively
        through Meta&apos;s official platforms. No scraping, no gray-area automation, no risking your
        accounts.
      </p>
      <p>
        <strong className="text-foreground">AI that assists, not replaces.</strong> Our models score
        and suggest; your team decides. Every automation is transparent and auditable.
      </p>
      <p>
        <strong className="text-foreground">Security as a feature.</strong> Encrypted tokens,
        role-based access, and audit logs are table stakes, not add-ons.
      </p>

      <H2>The team</H2>
      <p>
        We&apos;re a small, senior team of engineers and operators who&apos;ve built and scaled
        customer-facing platforms. We&apos;re based everywhere and obsessed with response time.
      </p>
    </ContentPage>
  );
}
