'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConversationList } from '@/features/inbox/ConversationList';
import { ConversationThread } from '@/features/inbox/ConversationThread';
import { AiPanel } from '@/features/inbox/AiPanel';
import {
  useAddNote,
  useConversation,
  useConversations,
  useInboxRealtime,
  useMarkRead,
  useOrgMembers,
  useSendMessage,
  useUpdateConversation,
  type InboxFilters,
} from '@/features/inbox/use-inbox';

export default function InboxPage() {
  const [filters, setFilters] = useState<InboxFilters>({ status: 'OPEN' });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useInboxRealtime(activeId);

  const listQuery = useConversations(filters);
  const items = useMemo(
    () => listQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [listQuery.data],
  );

  const detail = useConversation(activeId);
  const sendMessage = useSendMessage(activeId ?? '');
  const markRead = useMarkRead(activeId ?? '');
  const updateConversation = useUpdateConversation(activeId ?? '');
  const addNote = useAddNote(activeId ?? '');
  const { data: orgMembers = [] } = useOrgMembers();

  // Auto-select the first conversation.
  useEffect(() => {
    if (!activeId && items.length > 0) setActiveId(items[0].id);
  }, [items, activeId]);

  // Mark as read when conversation is opened.
  useEffect(() => {
    if (activeId && detail.data && detail.data.unreadCount > 0) {
      markRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, detail.data?.unreadCount]);

  const handleSend = (text: string) => {
    if (!activeId) return;
    sendMessage.mutate(text, { onSuccess: () => setDraft('') });
  };

  return (
    <div className="grid h-full grid-cols-[320px_1fr_340px] overflow-hidden">
      <ConversationList
        items={items}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setDraft('');
        }}
        filters={filters}
        onFiltersChange={setFilters}
        isLoading={listQuery.isLoading}
        hasNextPage={Boolean(listQuery.hasNextPage)}
        onLoadMore={() => listQuery.fetchNextPage()}
        isFetchingNextPage={listQuery.isFetchingNextPage}
      />

      <ConversationThread
        conversation={detail.data}
        isLoading={detail.isLoading && Boolean(activeId)}
        onSend={handleSend}
        sending={sendMessage.isPending}
        draft={draft}
        onDraftChange={setDraft}
        onUpdate={(patch) => updateConversation.mutate(patch)}
        onAddNote={(body) => addNote.mutate(body)}
        orgMembers={orgMembers}
      />

      {detail.data ? (
        <AiPanel conversation={detail.data} onUseReply={(text) => setDraft(text)} />
      ) : (
        <div className="border-l border-border bg-card" />
      )}
    </div>
  );
}

