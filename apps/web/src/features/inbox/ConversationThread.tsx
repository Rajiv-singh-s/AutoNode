'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
  StickyNote,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, Button, Spinner } from '@/components/ui';
import type { ConversationDetail } from './types';
import type { OrgMember } from './use-inbox';

type Tab = 'messages' | 'notes';

export function ConversationThread({
  conversation,
  isLoading,
  onSend,
  sending,
  draft,
  onDraftChange,
  onUpdate,
  onAddNote,
  orgMembers,
}: {
  conversation: ConversationDetail | undefined;
  isLoading: boolean;
  onSend: (text: string) => void;
  sending: boolean;
  draft: string;
  onDraftChange: (text: string) => void;
  onUpdate: (patch: { status?: string; priority?: string; assignedAgentId?: string | null }) => void;
  onAddNote: (body: string) => void;
  orgMembers: OrgMember[];
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>('messages');
  const [noteDraft, setNoteDraft] = useState('');
  const [agentOpen, setAgentOpen] = useState(false);

  useEffect(() => {
    if (tab === 'messages') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.messages.length, tab]);

  // Reset tab when conversation changes
  useEffect(() => {
    setTab('messages');
    setNoteDraft('');
  }, [conversation?.id]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Sparkles className="h-8 w-8" />
        <p className="text-sm">Select a conversation to get started</p>
      </div>
    );
  }

  const submit = () => {
    const text = draft.trim();
    if (!text || sending) return;
    onSend(text);
  };

  const submitNote = () => {
    const body = noteDraft.trim();
    if (!body) return;
    onAddNote(body);
    setNoteDraft('');
  };

  const isResolved = conversation.status === 'RESOLVED';
  const isSpam = conversation.status === 'SPAM';
  const assignedAgent = orgMembers.find((m) => m.user.id === conversation.assignedAgent?.id);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <Avatar name={conversation.contact.name} src={conversation.contact.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">
              {conversation.contact.name ?? conversation.contact.username ?? 'Unknown'}
            </h3>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {conversation.channel.type}
            </span>
            {conversation.isSpam && (
              <span className="flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-500">
                <ShieldAlert className="h-3 w-3" /> Spam
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {conversation.contact.leadStage} · score {conversation.contact.leadScore}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Agent assignment */}
          <div className="relative">
            <button
              onClick={() => setAgentOpen((v) => !v)}
              className="flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="max-w-[80px] truncate">
                {assignedAgent ? (assignedAgent.user.name ?? assignedAgent.user.email) : 'Assign'}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
            {agentOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-md border border-border bg-card shadow-lg">
                <button
                  onClick={() => {
                    onUpdate({ assignedAgentId: null });
                    setAgentOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent"
                >
                  Unassign
                </button>
                {orgMembers.map((m) => (
                  <button
                    key={m.user.id}
                    onClick={() => {
                      onUpdate({ assignedAgentId: m.user.id });
                      setAgentOpen(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-xs hover:bg-accent',
                      conversation.assignedAgent?.id === m.user.id && 'font-semibold text-primary',
                    )}
                  >
                    {m.user.name ?? m.user.email}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status actions */}
          {!isResolved && !isSpam && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ status: 'RESOLVED' })}
              className="h-7 gap-1 text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Resolve
            </Button>
          )}
          {isResolved && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ status: 'OPEN' })}
              className="h-7 gap-1 text-xs"
            >
              Reopen
            </Button>
          )}
          {!isSpam && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ status: 'SPAM' })}
              className="h-7 gap-1 text-xs text-red-500 hover:text-red-600"
            >
              <ShieldAlert className="h-3.5 w-3.5" /> Spam
            </Button>
          )}
          {isSpam && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUpdate({ status: 'OPEN' })}
              className="h-7 text-xs"
            >
              Not spam
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('messages')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors',
            tab === 'messages'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Messages
        </button>
        <button
          onClick={() => setTab('notes')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors',
            tab === 'notes'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <StickyNote className="h-3.5 w-3.5" /> Notes
          {conversation.internalNotes.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 text-[10px]">
              {conversation.internalNotes.length}
            </span>
          )}
        </button>
      </div>

      {/* Messages tab */}
      {tab === 'messages' && (
        <>
          <div className="scroll-thin flex-1 space-y-3 overflow-y-auto bg-background px-5 py-4">
            {conversation.messages.map((m) => {
              const outbound = m.direction === 'OUTBOUND';
              return (
                <div key={m.id} className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
                  <div className="max-w-[72%]">
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2 text-sm',
                        outbound
                          ? 'rounded-br-sm bg-primary text-primary-foreground'
                          : 'rounded-bl-sm bg-muted text-foreground',
                      )}
                    >
                      {m.text ?? <span className="italic opacity-70">[{m.type.toLowerCase()}]</span>}
                    </div>
                    <div
                      className={cn(
                        'mt-1 flex items-center gap-1 text-[10px] text-muted-foreground',
                        outbound ? 'justify-end' : 'justify-start',
                      )}
                    >
                      {m.aiGenerated && <Sparkles className="h-3 w-3 text-primary" />}
                      <span>{format(new Date(m.sentAt), 'HH:mm')}</span>
                      {outbound && m.deliveryStatus === 'FAILED' && (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      )}
                      {outbound && m.deliveryStatus === 'SENT' && <CheckCheck className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                placeholder="Type a reply…  (Enter to send, Shift+Enter for newline)"
                className="scroll-thin max-h-32 min-h-[40px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="icon" onClick={submit} loading={sending} aria-label="Send">
                {!sending && <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Notes tab */}
      {tab === 'notes' && (
        <>
          <div className="scroll-thin flex-1 space-y-3 overflow-y-auto bg-background px-5 py-4">
            {conversation.internalNotes.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No internal notes yet.</p>
            ) : (
              [...conversation.internalNotes].reverse().map((note) => (
                <div key={note.id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="text-sm leading-relaxed text-foreground">{note.body}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <StickyNote className="h-3 w-3 text-amber-500" />
                    <span>{note.author.name ?? 'Agent'}</span>
                    <span>·</span>
                    <span>{format(new Date(note.createdAt), 'MMM d, HH:mm')}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Note composer */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitNote();
                  }
                }}
                rows={1}
                placeholder="Write an internal note… (visible to team only)"
                className="scroll-thin max-h-32 min-h-[40px] flex-1 resize-none rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={submitNote}
                disabled={!noteDraft.trim()}
                aria-label="Add note"
                className="border border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
              >
                <StickyNote className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

