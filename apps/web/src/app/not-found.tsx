import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LogoMark } from '@/components/Logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <LogoMark className="h-24 w-24" />
      <p className="mt-6 text-6xl font-bold tracking-tight">404</p>
      <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <ArrowLeft className="h-4 w-4" /> Back home
      </Link>
    </div>
  );
}
