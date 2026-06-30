'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Inbox,
  Brain,
  Workflow,
  BarChart3,
  ShieldCheck,
  Zap,
  Instagram,
  MessageCircle,
  Phone,
  ArrowRight,
  Check,
} from 'lucide-react';

const features = [
  { icon: Inbox, title: 'Unified inbox', desc: 'Instagram, Messenger and WhatsApp in one realtime inbox with assignments, labels and notes.' },
  { icon: Brain, title: 'AI lead scoring', desc: 'Every conversation is scored for buying intent, sentiment and priority the moment it lands.' },
  { icon: Workflow, title: 'Automations', desc: 'Comment-to-DM, keyword triggers and conditional workflows that run while you sleep.' },
  { icon: BarChart3, title: 'Analytics & attribution', desc: 'Conversion, response time, revenue and Meta Ads attribution from lead to close.' },
  { icon: Zap, title: 'Suggested replies', desc: 'On-brand AI drafts you can send in one tap — or let automations handle the first touch.' },
  { icon: ShieldCheck, title: 'Enterprise security', desc: 'RBAC, encrypted tokens, audit logs and official Meta APIs only. No scraping, ever.' },
];

const steps = [
  { n: '01', title: 'Connect Meta', desc: 'Securely link Instagram, a Facebook Page and your WhatsApp number via official OAuth.' },
  { n: '02', title: 'AI takes over', desc: 'Conversations stream in, get scored, summarized and prioritized automatically.' },
  { n: '03', title: 'Close faster', desc: 'Your team works the hottest leads first with suggested replies and full context.' },
];

const stats = [
  { value: '3.2x', label: 'faster response time' },
  { value: '47%', label: 'more qualified leads' },
  { value: '<2s', label: 'AI scoring latency' },
  { value: '99.9%', label: 'uptime SLA' },
];

const fade = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5 },
};

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.18),transparent)]" />
        <div className="mx-auto max-w-4xl px-6 pb-20 pt-24 text-center">
          <motion.div {...fade}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              The AI Sales Operating System
            </span>
          </motion.div>
          <motion.h1 {...fade} transition={{ duration: 0.5, delay: 0.05 }} className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Turn social conversations into{' '}
            <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
              paying customers
            </span>
          </motion.h1>
          <motion.p {...fade} transition={{ duration: 0.5, delay: 0.1 }} className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
            AutoNode connects your Meta accounts and uses AI to score leads, detect buying intent,
            filter spam, and prioritize the conversations that close — across Instagram, Messenger
            and WhatsApp.
          </motion.p>
          <motion.div {...fade} transition={{ duration: 0.5, delay: 0.15 }} className="mt-8 flex items-center justify-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/features" className="rounded-md border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-accent">
              See features
            </Link>
          </motion.div>
          <motion.div {...fade} transition={{ duration: 0.5, delay: 0.2 }} className="mt-6 flex items-center justify-center gap-5 text-muted-foreground">
            <Instagram className="h-5 w-5" />
            <MessageCircle className="h-5 w-5" />
            <Phone className="h-5 w-5" />
            <span className="text-xs">Official Meta APIs</span>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold tracking-tight">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <motion.div {...fade} className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Everything your sales team needs</h2>
          <p className="mt-3 text-muted-foreground">
            Not just another auto-DM tool — a complete operating system for customer acquisition.
          </p>
        </motion.div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...fade}
              transition={{ duration: 0.5, delay: i * 0.04 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.h2 {...fade} className="text-center text-3xl font-bold tracking-tight">
            Live in minutes
          </motion.h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div key={s.n} {...fade} transition={{ duration: 0.5, delay: i * 0.06 }}>
                <span className="text-sm font-semibold text-primary">{s.n}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <motion.div {...fade} className="rounded-2xl border border-border bg-gradient-to-b from-primary/10 to-transparent p-10">
          <h2 className="text-3xl font-bold tracking-tight">Stop losing leads in your DMs</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Join teams using AutoNode to respond faster, qualify smarter, and close more — all from
            one AI-powered inbox.
          </p>
          <ul className="mx-auto mt-6 flex max-w-md flex-col items-start gap-2 text-sm sm:flex-row sm:justify-center sm:gap-6">
            {['14-day free trial', 'No credit card', 'Cancel anytime'].map((t) => (
              <li key={t} className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-emerald-500" /> {t}
              </li>
            ))}
          </ul>
          <Link href="/login" className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
