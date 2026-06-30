import type { ReactNode } from 'react';

/** Shared shell for simple marketing/legal/content pages. */
export function ContentPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>}
      <div className="prose-content mt-8 space-y-5 text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

/** Section heading inside ContentPage. */
export function H2({ children }: { children: ReactNode }) {
  return <h2 className="!mt-8 text-lg font-semibold text-foreground">{children}</h2>;
}
