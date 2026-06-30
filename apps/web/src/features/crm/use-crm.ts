'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Paginated } from '@/features/inbox/types';

export interface Contact {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  leadStage: string;
  leadScore: number;
  leadValue: number | null;
  source: string | null;
  tags: string[];
  createdAt: string;
  channel: { id: string; type: string } | null;
}

export interface PipelineColumn {
  stage: string;
  value: number;
  contacts: Contact[];
}

export interface ContactDetail extends Contact {
  channel: { id: string; type: string; name: string | null } | null;
  activities: {
    id: string;
    type: string;
    title: string;
    body: string | null;
    createdAt: string;
  }[];
  conversations: {
    id: string;
    status: string;
    priority: string;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    buyingIntent: string;
  }[];
}

export interface ContactFilters {
  stage?: string;
  search?: string;
  minScore?: number;
}

export function useContacts(filters: ContactFilters) {
  return useInfiniteQuery({
    queryKey: ['contacts', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams();
      if (filters.stage) p.set('stage', filters.stage);
      if (filters.search) p.set('search', filters.search);
      if (filters.minScore != null) p.set('minScore', String(filters.minScore));
      if (pageParam) p.set('cursor', pageParam);
      p.set('limit', '30');
      return api.get<Paginated<Contact>>(`/contacts?${p.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useContact(id: string | null) {
  return useQuery({
    queryKey: ['contact', id],
    enabled: Boolean(id),
    queryFn: () => api.get<ContactDetail>(`/contacts/${id}`),
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: ['contacts', 'pipeline'],
    queryFn: () => api.get<{ columns: PipelineColumn[] }>('/contacts/pipeline'),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Contact> }) =>
      api.patch<Contact>(`/contacts/${id}`, patch),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['contact', vars.id] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
