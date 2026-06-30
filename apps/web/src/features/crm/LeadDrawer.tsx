'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, MessageCircle } from 'lucide-react';
import { useContact, useUpdateContact } from './use-crm';
import { Avatar, Badge, Button, Spinner } from '@/components/ui';
import { cn, formatCurrency, intentColor, scoreColor } from '@/lib/utils';

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

export function LeadDrawer({
  contactId,
  onClose,
}: {
  contactId: string | null;
  onClose: () => void;
}) {
  const { data: contact, isLoading } = useContact(contactId);
  const update = useUpdateContact();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (contact) setValue(contact.leadValue != null ? String(contact.leadValue) : '');
  }, [contact]);

  return (
    <AnimatePresence>
      {contactId && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="scroll-thin fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-border bg-card shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-sm font-semibold">Lead details</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoading || !contact ? (
              <div className="flex h-40 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="space-y-6 p-4">
                {/* Identity */}
                <div className="flex items-center gap-3">
                  <Avatar name={contact.name} src={contact.avatarUrl} className="h-12 w-12 text-sm" />
                  <div>
                    <p className="font-semibold">{contact.name ?? 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">@{contact.username}</p>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-sm">
                    <span className={cn('h-2 w-2 rounded-full', scoreColor(contact.leadScore))} />
                    {contact.leadScore}
                  </span>
                </div>

                {/* Editable stage */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Stage
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {STAGES.map((s) => (
                      <button
                        key={s}
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: contact.id, patch: { leadStage: s } })}
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50',
                          contact.leadStage === s
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-accent',
                        )}
                      >
                        {s[0] + s.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lead value */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Lead value
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="0"
                      className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      loading={update.isPending}
                      onClick={() =>
                        update.mutate({ id: contact.id, patch: { leadValue: Number(value) || 0 } })
                      }
                    >
                      Save
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current: {contact.leadValue != null ? formatCurrency(contact.leadValue) : '—'}
                  </p>
                </div>

                {/* Tags */}
                {contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map((t) => (
                      <Badge key={t} className="bg-muted">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Conversations */}
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Conversations
                  </h3>
                  <div className="space-y-2">
                    {contact.conversations.length === 0 && (
                      <p className="text-sm text-muted-foreground">No conversations yet.</p>
                    )}
                    {contact.conversations.map((c) => (
                      <div key={c.id} className="rounded-lg border border-border p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {c.status}
                          </span>
                          <span className={cn('text-xs font-medium', intentColor(c.buyingIntent))}>
                            {c.buyingIntent !== 'NONE' ? `${c.buyingIntent} intent` : ''}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm">{c.lastMessagePreview ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity timeline */}
                <div>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Activity
                  </h3>
                  <div className="space-y-2">
                    {contact.activities.length === 0 && (
                      <p className="text-sm text-muted-foreground">No activity yet.</p>
                    )}
                    {contact.activities.map((a) => (
                      <div key={a.id} className="rounded-lg border border-border p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{a.title}</p>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(a.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {a.body && <p className="mt-1 text-xs text-muted-foreground">{a.body}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
