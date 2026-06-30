'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Trash2, MessageSquare, Clock, Tag, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  useCreateAutomation,
  useUpdateAutomation,
  type Automation,
  type AutomationAction,
  type AutomationTrigger,
} from './use-automations';

const TRIGGERS: { value: AutomationTrigger; label: string; hint: string }[] = [
  { value: 'DM_KEYWORD', label: 'DM keyword', hint: 'When a DM contains a keyword' },
  { value: 'COMMENT_KEYWORD', label: 'Comment keyword', hint: 'When a comment contains a keyword' },
  { value: 'STORY_REPLY', label: 'Story reply', hint: 'When someone replies to a story' },
  { value: 'NEW_CONVERSATION', label: 'New conversation', hint: 'When a new conversation starts' },
];

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

const ACTION_META = {
  send_dm: { label: 'Send DM', icon: MessageSquare },
  delay: { label: 'Delay', icon: Clock },
  add_label: { label: 'Add label', icon: Tag },
  set_stage: { label: 'Set stage', icon: GitBranch },
} as const;

function defaultAction(type: AutomationAction['type']): AutomationAction {
  switch (type) {
    case 'send_dm': return { type, text: '' };
    case 'delay': return { type, seconds: 5 };
    case 'add_label': return { type, label: '' };
    case 'set_stage': return { type, stage: 'CONTACTED' };
  }
}

export function AutomationEditor({
  existing,
  onClose,
}: {
  existing: Automation | null;
  onClose: () => void;
}) {
  const create = useCreateAutomation();
  const update = useUpdateAutomation();
  const saving = create.isPending || update.isPending;

  const [name, setName] = useState(existing?.name ?? '');
  const [trigger, setTrigger] = useState<AutomationTrigger>(existing?.trigger ?? 'DM_KEYWORD');
  const [keywords, setKeywords] = useState(existing?.conditions.keywords.join(', ') ?? '');
  const [matchType, setMatchType] = useState<'any' | 'all'>(existing?.conditions.matchType ?? 'any');
  const [actions, setActions] = useState<AutomationAction[]>(
    existing?.actions ?? [{ type: 'send_dm', text: '' }],
  );
  const [error, setError] = useState<string | null>(null);

  const updateAction = (i: number, patch: Partial<AutomationAction>) =>
    setActions((prev) => prev.map((a, idx) => (idx === i ? ({ ...a, ...patch } as AutomationAction) : a)));

  const save = async () => {
    setError(null);
    if (!name.trim()) return setError('Name is required');
    if (actions.length === 0) return setError('Add at least one action');
    const input = {
      name: name.trim(),
      trigger,
      conditions: {
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        matchType,
      },
      actions,
    };
    try {
      if (existing) await update.mutateAsync({ id: existing.id, input });
      else await create.mutateAsync(input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-40 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="scroll-thin fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto border-l border-border bg-card shadow-2xl"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-sm font-semibold">{existing ? 'Edit automation' : 'New automation'}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-4">
          {/* Name */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Price enquiry auto-reply"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          {/* Trigger */}
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Trigger</span>
            <div className="grid grid-cols-2 gap-2">
              {TRIGGERS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTrigger(t.value)}
                  className={cn(
                    'rounded-lg border p-2.5 text-left text-sm transition-colors',
                    trigger === t.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
                  )}
                >
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          {(trigger === 'DM_KEYWORD' || trigger === 'COMMENT_KEYWORD') && (
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Keywords (comma-separated)
              </span>
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="price, cost, how much"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-2 flex gap-2">
                {(['any', 'all'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMatchType(m)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium',
                      matchType === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent',
                    )}
                  >
                    Match {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</span>
            <div className="space-y-2">
              {actions.map((action, i) => {
                const Meta = ACTION_META[action.type];
                return (
                  <div key={i} className="rounded-lg border border-border bg-background p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Meta.icon className="h-3.5 w-3.5" />
                        {Meta.label}
                      </span>
                      <button
                        onClick={() => setActions((p) => p.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-red-500"
                        aria-label="Remove action"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {action.type === 'send_dm' && (
                      <textarea
                        value={action.text}
                        onChange={(e) => updateAction(i, { text: e.target.value })}
                        rows={2}
                        placeholder="Message to send…"
                        className="w-full resize-none rounded-md border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                    {action.type === 'delay' && (
                      <input
                        type="number"
                        value={action.seconds}
                        onChange={(e) => updateAction(i, { seconds: Number(e.target.value) })}
                        className="h-9 w-28 rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                    {action.type === 'add_label' && (
                      <input
                        value={action.label}
                        onChange={(e) => updateAction(i, { label: e.target.value })}
                        placeholder="Label name"
                        className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                    {action.type === 'set_stage' && (
                      <select
                        value={action.stage}
                        onChange={(e) => updateAction(i, { stage: e.target.value })}
                        className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {(Object.keys(ACTION_META) as AutomationAction['type'][]).map((type) => {
                const Meta = ACTION_META[type];
                return (
                  <button
                    key={type}
                    onClick={() => setActions((p) => [...p, defaultAction(type)])}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" /> {Meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={save} loading={saving} className="flex-1">
              {existing ? 'Save changes' : 'Create automation'}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
