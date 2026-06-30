'use client';

import { useState } from 'react';
import { Mail, MessageSquare, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Opens the visitor's mail client with a prefilled message — a real action
    // that works without a backend mail service configured.
    const subject = encodeURIComponent(`AutoNode enquiry from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
    window.location.href = `mailto:hello@autonode.app?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Talk to us</h1>
        <p className="mt-3 text-muted-foreground">
          Questions about AutoNode, pricing, or a custom Scale plan? We usually reply within one
          business day.
        </p>
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">hello@autonode.app</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Sales</p>
              <p className="text-sm text-muted-foreground">Book a demo for the Scale plan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {sent ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <h2 className="mt-3 text-lg font-semibold">Thanks, {form.name || 'there'}!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your email draft is ready to send. We&apos;ll be in touch shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Field label="Work email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Message</span>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <Button type="submit" className="w-full">
              Send message
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
