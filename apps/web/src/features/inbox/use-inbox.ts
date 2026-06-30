'use client';

import { useEffect } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { WS_EVENTS } from '@autonode/shared';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type {
  ConversationDetail,
  ConversationListItem,
  InternalNote,
  Message,
  Paginated,
} from './types';

export interface OrgMember {
  membershipId: string;
  role: string;
  user: { id: string; name: string | null; email: string; avatarUrl: string | null };
}

export interface InboxFilters {
  status?: string;
  channelType?: string;
  search?: string;
}

function buildQuery(filters: InboxFilters, cursor?: string): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.channelType) params.set('channelType', filters.channelType);
  if (filters.search) params.set('search', filters.search);
  if (cursor) params.set('cursor', cursor);
  params.set('limit', '25');
  return params.toString();
}

export function useConversations(filters: InboxFilters) {
  return useInfiniteQuery({
    queryKey: ['conversations', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Paginated<ConversationListItem>>(`/conversations?${buildQuery(filters, pageParam)}`),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversation', id],
    enabled: Boolean(id),
    queryFn: () => api.get<ConversationDetail>(`/conversations/${id}`),
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      api.post<Message>(`/conversations/${conversationId}/messages`, { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateConversation(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { status?: string; priority?: string; assignedAgentId?: string | null }) =>
      api.patch<ConversationListItem>(`/conversations/${conversationId}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useMarkRead(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>(`/conversations/${conversationId}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });
}

export function useAddNote(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post<InternalNote>(`/conversations/${conversationId}/notes`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });
}

export function useOrgMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: () => api.get<OrgMember[]>('/team/members'),
    staleTime: 5 * 60 * 1000,
  });
}


export function useSuggestReplies(conversationId: string) {
  return useMutation({
    mutationFn: (instruction?: string) =>
      api.post<{ replies: string[] }>(`/ai/conversations/${conversationId}/suggest-replies`, {
        instruction,
      }),
  });
}

/** Subscribes to realtime inbox events and invalidates affected queries. */
export function useInboxRealtime(activeConversationId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket();

    const onMessage = (payload: { conversationId: string }) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      if (payload.conversationId === activeConversationId) {
        qc.invalidateQueries({ queryKey: ['conversation', activeConversationId] });
      }
    };
    const onConversation = () => qc.invalidateQueries({ queryKey: ['conversations'] });
    const onAi = (payload: { conversationId: string }) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      if (payload.conversationId === activeConversationId) {
        qc.invalidateQueries({ queryKey: ['conversation', activeConversationId] });
      }
    };

    socket.on(WS_EVENTS.MESSAGE_CREATED, onMessage);
    socket.on(WS_EVENTS.CONVERSATION_UPDATED, onConversation);
    socket.on(WS_EVENTS.AI_ANALYSIS_READY, onAi);

    return () => {
      socket.off(WS_EVENTS.MESSAGE_CREATED, onMessage);
      socket.off(WS_EVENTS.CONVERSATION_UPDATED, onConversation);
      socket.off(WS_EVENTS.AI_ANALYSIS_READY, onAi);
    };
  }, [qc, activeConversationId]);
}
