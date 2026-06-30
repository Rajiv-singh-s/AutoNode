import { ContentPage } from '@/features/marketing/ContentPage';

export const metadata = { title: 'Careers — AutoNode' };

const roles = [
  { title: 'Senior Full-Stack Engineer', team: 'Engineering', location: 'Remote', type: 'Full-time' },
  { title: 'AI/ML Engineer', team: 'AI', location: 'Remote', type: 'Full-time' },
  { title: 'Product Designer', team: 'Design', location: 'Remote', type: 'Full-time' },
  { title: 'Customer Success Manager', team: 'Success', location: 'Remote', type: 'Full-time' },
];

export default function CareersPage() {
  return (
    <ContentPage
      title="Careers"
      subtitle="Help us build the AI sales operating system. We're remote-first and senior-heavy."
    >
      <div className="not-prose mt-2 space-y-3">
        {roles.map((r) => (
          <div
            key={r.title}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-foreground">{r.title}</p>
              <p className="text-sm text-muted-foreground">
                {r.team} · {r.location} · {r.type}
              </p>
            </div>
            <a
              href="mailto:careers@autonode.app"
              className="self-start rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:self-auto"
            >
              Apply
            </a>
          </div>
        ))}
      </div>
      <p className="mt-6">
        Don&apos;t see your role? Email{' '}
        <a className="text-primary hover:underline" href="mailto:careers@autonode.app">
          careers@autonode.app
        </a>{' '}
        — we&apos;re always glad to meet exceptional people.
      </p>
    </ContentPage>
  );
}
