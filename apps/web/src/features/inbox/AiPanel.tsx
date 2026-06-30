'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Wand2,
  TrendingUp,
  Languages,
  ShieldAlert,
  BrainCircuit,
} from 'lucide-react';
import { cn, intentColor, scoreColor } from '@/lib/utils';
import { Badge, Button } from '@/components/ui';
import { api } from '@/lib/api';
import type { ConversationDetail } from './types';
import { useSuggestReplies } from './use-inbox';

function Stat({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border p-2.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn('truncate text-sm font-semibold', valueClass)}>{value}</p>
      </div>
    </div>
  );
}

export function AiPanel({
  conversation,
  onUseReply,
}: {
  conversation: ConversationDetail;
  onUseReply: (text: string) => void;
}) {
  const [replies, setReplies] = useState<string[]>(conversation.aiSuggestedReplies ?? []);
  const suggest = useSuggestReplies(conversation.id);
  const [reanalyzing, setReanalyzing] = useState(false);

  // Keep panel suggestions in sync with server-persisted replies.
  useEffect(() => {
    setReplies(conversation.aiSuggestedReplies ?? []);
  }, [conversation.id, conversation.aiSuggestedReplies]);

  const generate = async () => {
    const res = await suggest.mutateAsync(undefined);
    setReplies(res.replies);
  };

  const reanalyze = async () => {
    setReanalyzing(true);
    try {
      await api.post(`/ai/conversations/${conversation.id}/reanalyze`);
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <div className="scroll-thin flex h-full w-full flex-col gap-4 overflow-y-auto border-l border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Assistant</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={reanalyze} loading={reanalyzing}>
          {!reanalyzing && <RefreshCw className="h-3.5 w-3.5" />} Re-analyze
        </Button>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-primary/25 bg-primary/5 p-3.5">
        <div className="mb-1.5 flex items-center gap-1.5">
          <BrainCircuit className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">AI Summary</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          {conversation.aiSummary ?? 'No analysis yet — a new inbound message will trigger scoring.'}
        </p>
      </div>

      {/* Signals */}
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={TrendingUp}
          label="Lead score"
          value={`${conversation.contact.leadScore}/100`}
        />
        <Stat
          icon={Wand2}
          label="Priority"
          value={`${conversation.priorityScore}/100`}
        />
        <Stat
          icon={Sparkles}
          label="Buying intent"
          value={conversation.buyingIntent}
          valueClass={intentColor(conversation.buyingIntent)}
        />
        <Stat
          icon={Languages}
          label="Language"
          value={(conversation.language ?? '—').toUpperCase()}
        />
      </div>

      <div className="flex items-center gap-2">
        {conversation.sentiment && (
          <Badge className="capitalize">{conversation.sentiment.toLowerCase()}</Badge>
        )}
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className={cn('h-2 w-2 rounded-full', scoreColor(conversation.contact.leadScore))} />
          {conversation.contact.leadStage}
        </span>
        {conversation.isSpam && (
          <Badge className="border-red-500/40 text-red-500">
            <ShieldAlert className="mr-1 h-3 w-3" /> Spam
          </Badge>
        )}
      </div>

      {/* Suggested replies */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Suggested replies
          </p>
          <Button size="sm" variant="subtle" onClick={generate} loading={suggest.isPending}>
            {!suggest.isPending && <Wand2 className="h-3.5 w-3.5" />} Generate
          </Button>
        </div>
        {replies.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Click generate to draft on-brand replies you can send in one tap.
          </p>
        ) : (
          replies.map((r, i) => (
            <button
              key={i}
              onClick={() => onUseReply(r)}
              className="w-full rounded-md border border-border bg-background p-2.5 text-left text-sm transition-colors hover:border-primary hover:bg-accent"
            >
              {r}
            </button>
          ))
        )}
      </div>

      {/* Contact tags */}
      {conversation.contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {conversation.contact.tags.map((t) => (
            <Badge key={t} className="bg-muted">
              {t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
