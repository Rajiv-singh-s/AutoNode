import { cn } from '@/lib/utils';

/**
 * AutoNode brand logo. The source is a full lockup (mark + "AutoNode" wordmark
 * + tagline) on a white background, so we render it un-cropped (object-contain)
 * on a white rounded panel. The wordmark is part of the artwork — do NOT place
 * a separate "AutoNode" text label next to it.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="AutoNode" className="h-full w-full object-contain" />
    </div>
  );
}
