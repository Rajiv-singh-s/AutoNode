'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ──────────────────────── Channel types ──────────────────────────

export interface Channel {
  id: string;
  type: 'INSTAGRAM' | 'MESSENGER' | 'WHATSAPP';
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'EXPIRED';
  externalId: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  pageId: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { conversations: number; contacts: number };
}

export interface ConnectChannelInput {
  type: Channel['type'];
  externalId: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  accessToken: string;
  pageId?: string;
  wabaId?: string;
  phoneNumberId?: string;
}

export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<Channel[]>('/channels'),
  });
}

export function useConnectChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConnectChannelInput) => api.post<Channel>('/channels', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channels'] }),
  });
}

export function useDisconnectChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ success: boolean }>(`/channels/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channels'] }),
  });
}

export function useUpdateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; accessToken?: string } }) =>
      api.patch<Channel>(`/channels/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channels'] }),
  });
}

/** Returns the Meta OAuth URL for the given channel type. Opens in same window. */
export function useMetaOAuthUrl() {
  return useMutation({
    mutationFn: (channelType: Channel['type']) =>
      api.get<{ url: string }>(`/integrations/meta/oauth/initiate?channelType=${channelType}`),
  });
}

// ──────────────────────── Team types ─────────────────────────────

export type OrgRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES' | 'SUPPORT';

export interface Member {
  membershipId: string;
  role: OrgRole;
  joinedAt: string;
  user: { id: string; email: string; name: string | null; avatarUrl: string | null; lastLoginAt: string | null };
}

export interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: { id: string; name: string | null; email: string };
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team', 'members'],
    queryFn: () => api.get<Member[]>('/team/members'),
  });
}

export function useTeamInvitations() {
  return useQuery({
    queryKey: ['team', 'invitations'],
    queryFn: () => api.get<Invitation[]>('/team/invitations'),
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: OrgRole }) =>
      api.post<{ id: string; token: string }>('/team/invitations', { email, role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', 'invitations'] }),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ success: boolean }>(`/team/invitations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', 'invitations'] }),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: OrgRole }) =>
      api.patch(`/team/members/${membershipId}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', 'members'] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) =>
      api.del<{ success: boolean }>(`/team/members/${membershipId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team', 'members'] }),
  });
}

// ──────────────────────── Organization settings ───────────────────

export interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: string;
  trialEndsAt: string | null;
  createdAt: string;
  _count: { memberships: number; channels: number; contacts: number };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export function useOrgSettings() {
  return useQuery({
    queryKey: ['settings', 'organization'],
    queryFn: () => api.get<OrgSettings>('/settings/organization'),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ['settings', 'profile'],
    queryFn: () => api.get<UserProfile>('/settings/profile'),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string; avatarUrl?: string }) =>
      api.patch<UserProfile>('/settings/profile', patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'profile'] }),
  });
}

export function useUpdateOrgSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string; logoUrl?: string }) =>
      api.patch<OrgSettings>('/settings/organization', patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'organization'] }),
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      api.post<{ success: boolean }>('/settings/profile/password', { currentPassword, newPassword }),
  });
}

// ──────────────────────── Notifications ──────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
    refetchInterval: 30_000, // poll every 30s
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<{ success: boolean }>(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch<{ success: boolean }>('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
