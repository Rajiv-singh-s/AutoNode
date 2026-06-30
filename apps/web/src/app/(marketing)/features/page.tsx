'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Inbox,
  Brain,
  Workflow,
  BarChart3,
  Target,
  ShieldCheck,
  Instagram,
  MessageCircle,
  Phone,
  ArrowRight,
} from 'lucide-react';

const sections = [
  {
    icon: Inbox,
    kicker: 'Unified Inbox',
    title: 'Every conversation, one place',
    desc: 'Instagram DMs, Messenger threads and WhatsApp chats stream into a single realtime inbox. Assign teammates, add internal notes, apply labels, pin, resolve and archive — with live updates over WebSockets so your team never steps on each other.',
    points: ['Realtime via WebSockets', 'Assignments & internal notes', 'Search, filters & labels', 'Read / unread / resolved states'],
  },
  {
    icon: Brain,
    kicker: 'AI Engine',
    title: 'Intelligence on every message',
    desc: 'The moment a message lands, AutoNode summarizes the thread, scores the lead 0–100, detects buying intent and sentiment, flags spam, and identifies the language. Switch between OpenAI and Anthropic with a single config change.',
    points: ['Lead scoring & priority', 'Buying-intent & sentiment', 'Spam & language detection', 'One-tap suggested replies'],
  },
  {
    icon: Workflow,
    kicker: 'Automations',
    title: 'Workflows that never sleep',
    desc: 'Turn comments into DMs, trigger replies on keywords, and branch on conditions with delays. Build the first-touch experience once and let it run 24/7 while your team focuses on the hottest leads.',
    points: ['Comment-to-DM', 'Keyword triggers', 'Conditional logic & delays', 'Full run history & logs'],
  },
  {
    icon: BarChart3,
    kicker: 'Analytics',
    title: 'Know what actually works',
    desc: 'Track conversations, conversion rate, response time, employee performance and AI accuracy with interactive charts. Export to CSV or generate PDF reports for stakeholders.',
    points: ['Conversion & response-time', 'Team & AI performance', 'Interactive charts', 'CSV / PDF export'],
  },
  {
    icon: Target,
    kicker: 'Meta Ads Attribution',
    title: 'From ad click to closed deal',
    desc: 'Connect Meta Ads to attribute every lead and conversation back to its campaign, ad set and ad — then measure ROAS, CPL and CPA so you can double down on what drives revenue.',
    points: ['Campaign → lead mapping', 'ROAS, CPL & CPA', 'Revenue attribution', 'Spend-to-close reporting'],
  },
  {
    icon: ShieldCheck,
    kicker: 'Security',
    title: 'Enterprise-grade by default',
    desc: 'Role-based access control, AES-256 encrypted Meta tokens, webhook signature verification, and audit logs. AutoNode uses official Meta APIs exclusively — never scraping.',
    points: ['RBAC & permissions', 'Encrypted token storage', 'Webhook signature checks', 'Audit logs'],
  },
];

const fade = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5 },
};

export default function FeaturesPage() {
  return (
    <div>
      <section className="mx-auto max-w-3xl px-6 pb-10 pt-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight">A complete sales operating system</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Built for teams acquiring customers through Instagram, Messenger and WhatsApp — powered by
          official Meta APIs.
        </p>
        <div className="mt-6 flex items-center justify-center gap-5 text-muted-foreground">
          <Instagram className="h-5 w-5" />
          <MessageCircle className="h-5 w-5" />
          <Phone className="h-5 w-5" />
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-6 pb-20">
        {sections.map((s, i) => (
          <motion.div
            key={s.title}
            {...fade}
            transition={{ duration: 0.5, delay: (i % 2) * 0.05 }}
            className="grid items-center gap-6 rounded-2xl border border-border bg-card p-7 md:grid-cols-[1.2fr_1fr]"
          >
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <s.icon className="h-4 w-4" />
                {s.kicker}
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">{s.title}</h2>
              <p className="mt-2 text-muted-foreground">{s.desc}</p>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {s.points.map((p) => (
                <li key={p} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  {p}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      <section className="mx-auto max-w-3xl px-6 pb-20 text-center">
        <Link href="/login" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
          Start your free trial <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
