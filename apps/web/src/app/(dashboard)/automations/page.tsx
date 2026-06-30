'use client';

import { useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Plus, Workflow, Zap, Pencil, Trash2, History } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  useAutomations,
  useAutomationRuns,
  useDeleteAutomation,
  useToggleAutomation,
  type Automation,
} from '@/features/automations/use-automations';
import { AutomationEditor } from '@/features/automations/AutomationEditor';

const TRIGGER_LABEL: Record<string, string> = {
  DM_KEYWORD: 'DM keyword',
  COMMENT_KEYWORD: 'Comment keyword',
  STORY_REPLY: 'Story reply',
  NEW_CONVERSATION: 'New conversation',
};

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative h-5 w-9 rounded-full transition-colors disabled:opacity-50',
        on ? 'bg-primary' : 'bg-muted',
      )}
      aria-pressed={on}
    >
      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', on ? 'left-[18px]' : 'left-0.5')} />
    </button>
  );
}

function RunHistory({ id }: { id: string }) {
  const { data, isLoading } = useAutomationRuns(id);
  if (isLoading) return <div className="p-3"><Spinner className="h-4 w-4" /></div>;
  if (!data || data.length === 0)
    return <p className="p-3 text-xs text-muted-foreground">No runs yet. This automation fires on matching inbound messages.</p>;
  return (
    <div className="space-y-1.5 p-3">
      {data.map((r) => (
        <div key={r.id} className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2">
            <span className={cn('h-1.5 w-1.5 rounded-full', r.status === 'PROCESSED' ? 'bg-emerald-500' : r.status === 'FAILED' ? 'bg-red-500' : 'bg-amber-500')} />
            {(r.log ?? []).map((l) => l.action).join(' → ') || r.status}
          </span>
          <span className="text-muted-foreground">{formatDistanceToNowStrict(new Date(r.startedAt), { addSuffix: true })}</span>
        </div>
      ))}
    </div>
  );
}

export default function AutomationsPage() {
  const { data: automations, isLoading } = useAutomations();
  const toggle = useToggleAutomation();
  const del = useDeleteAutomation();
  const [editing, setEditing] = useState<Automation | null>(null);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Automations</h1>
            <p className="text-sm text-muted-foreground">Auto-reply, route and tag conversations 24/7.</p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New automation
          </Button>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Spinner /></div>
        ) : !automations || automations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Workflow className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No automations yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Create a keyword → DM automation to instantly reply to common questions like pricing or availability.
            </p>
            <Button className="mt-4" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Create your first automation
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {automations.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3 p-4">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', a.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {TRIGGER_LABEL[a.trigger]}
                      {a.conditions.keywords.length > 0 && ` · ${a.conditions.keywords.join(', ')}`}
                      {` · ${a.actions.length} action${a.actions.length === 1 ? '' : 's'}`}
                      {` · ${a.runCount} runs`}
                    </p>
                  </div>
                  <Toggle on={a.enabled} disabled={toggle.isPending} onClick={() => toggle.mutate({ id: a.id, enabled: !a.enabled })} />
                  <button onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="text-muted-foreground hover:text-foreground" aria-label="History">
                    <History className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditing(a)} className="text-muted-foreground hover:text-foreground" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${a.name}"?`)) del.mutate(a.id); }}
                    className="text-muted-foreground hover:text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {expanded === a.id && (
                  <div className="border-t border-border">
                    <RunHistory id={a.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <AutomationEditor existing={editing} onClose={() => { setCreating(false); setEditing(null); }} />
      )}
    </div>
  );
}
