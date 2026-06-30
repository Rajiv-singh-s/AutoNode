'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface OverviewMetrics {
  openConversations: number;
  unreadMessages: number;
  hotLeads: number;
  todayLeads: number;
  totalContacts: number;
  wonDeals: number;
  conversionRate: number;
  revenue: number;
  avgFirstResponseMins: number | null;
  byChannel: { type: string; count: number }[];
  leadsByStage: { stage: string; count: number }[];
  sentiment: { sentiment: string; count: number }[];
}

export interface TimeseriesPoint {
  day: string;
  conversations: number;
  leads: number;
}

export function useOverview() {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get<OverviewMetrics>('/analytics/overview'),
  });
}

export function useTimeseries(days = 14) {
  return useQuery({
    queryKey: ['analytics', 'timeseries', days],
    queryFn: () => api.get<TimeseriesPoint[]>(`/analytics/timeseries?days=${days}`),
  });
}
