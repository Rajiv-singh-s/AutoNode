'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type AutomationTrigger =
  | 'COMMENT_KEYWORD'
  | 'DM_KEYWORD'
  | 'STORY_REPLY'
  | 'NEW_CONVERSATION';

export type AutomationAction =
  | { type: 'send_dm'; text: string }
  | { type: 'delay'; seconds: number }
  | { type: 'add_label'; label: string }
  | { type: 'set_stage'; stage: string };

export interface AutomationConditions {
  keywords: string[];
  matchType: 'any' | 'all';
}

export interface Automation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  enabled: boolean;
  channelId: string | null;
  conditions: AutomationConditions;
  actions: AutomationAction[];
  runCount: number;
  createdAt: string;
  channel: { id: string; type: string; name: string | null } | null;
  _count?: { runs: number };
}

export interface AutomationRun {
  id: string;
  status: string;
  log: { action: string; ok: boolean; detail?: string }[] | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface AutomationInput {
  name: string;
  trigger: AutomationTrigger;
  enabled?: boolean;
  channelId?: string | null;
  conditions: AutomationConditions;
  actions: AutomationAction[];
}

export function useAutomations() {
  return useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get<Automation[]>('/automations'),
  });
}

export function useAutomationRuns(id: string | null) {
  return useQuery({
    queryKey: ['automation-runs', id],
    enabled: Boolean(id),
    queryFn: () => api.get<AutomationRun[]>(`/automations/${id}/runs`),
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AutomationInput) => api.post<Automation>('/automations', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AutomationInput> }) =>
      api.patch<Automation>(`/automations/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.patch<Automation>(`/automations/${id}/enabled`, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ success: boolean }>(`/automations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
  });
}
