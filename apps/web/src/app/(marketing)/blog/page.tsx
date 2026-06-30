import Link from 'next/link';
import { ContentPage } from '@/features/marketing/ContentPage';

export const metadata = { title: 'Blog — AutoNode' };

const posts = [
  {
    slug: 'why-dms-are-the-new-leadform',
    title: 'Why DMs are the new lead form',
    excerpt: 'Buyers stopped filling out forms. Here’s how to treat every comment and DM as a pipeline opportunity.',
    date: 'Jun 24, 2026',
    read: '5 min',
  },
  {
    slug: 'lead-scoring-with-llms',
    title: 'Lead scoring with LLMs: what actually works',
    excerpt: 'A practical breakdown of scoring buying intent from messy social conversations — and how to keep it reliable.',
    date: 'Jun 12, 2026',
    read: '8 min',
  },
  {
    slug: 'response-time-and-revenue',
    title: 'The hidden link between response time and revenue',
    excerpt: 'Replying in minutes instead of hours can multiply close rates. We dug into the numbers.',
    date: 'May 30, 2026',
    read: '6 min',
  },
];

export default function BlogPage() {
  return (
    <ContentPage title="Blog" subtitle="Playbooks on AI, social selling, and customer acquisition.">
      <div className="not-prose mt-2 space-y-4">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href="/blog"
            className="block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{p.date}</span>
              <span>·</span>
              <span>{p.read} read</span>
            </div>
            <h2 className="mt-1.5 text-lg font-semibold text-foreground">{p.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </ContentPage>
  );
}
