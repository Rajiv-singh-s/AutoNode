'use client';

import { useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { UserPlus, Trash2, Mail, MoreHorizontal } from 'lucide-react';
import { Avatar, Badge, Button, Spinner } from '@/components/ui';
import { cn, initials } from '@/lib/utils';
import {
  useTeamMembers,
  useTeamInvitations,
  useInviteMember,
  useRevokeInvitation,
  useUpdateMemberRole,
  useRemoveMember,
  type OrgRole,
} from '@/features/settings/use-settings';

const ROLES: OrgRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'SUPPORT'];

const ROLE_COLORS: Record<OrgRole, string> = {
  OWNER: 'border-violet-500/40 text-violet-500',
  ADMIN: 'border-indigo-500/40 text-indigo-500',
  MANAGER: 'border-sky-500/40 text-sky-500',
  SALES: 'border-emerald-500/40 text-emerald-500',
  SUPPORT: 'border-amber-500/40 text-amber-500',
};

function InvitePanel({ onClose }: { onClose: () => void }) {
  const invite = useInviteMember();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('SALES');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async () => {
    setResult(null);
    if (!email.includes('@')) return setResult({ ok: false, text: 'Enter a valid email address.' });
    try {
      await invite.mutateAsync({ email, role });
      setResult({ ok: true, text: `Invitation sent to ${email}.` });
      setEmail('');
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : 'Failed to send invitation.' });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" /> Invite a team member
      </h3>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="colleague@company.com"
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as OrgRole)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {ROLES.filter((r) => r !== 'OWNER').map((r) => (
            <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <Button size="sm" onClick={send} loading={invite.isPending}>Send invite</Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
      {result && (
        <p className={`text-xs ${result.ok ? 'text-emerald-500' : 'text-red-500'}`}>{result.text}</p>
      )}
    </div>
  );
}

export default function TeamSettingsPage() {
  const { data: members, isLoading: loadingMembers } = useTeamMembers();
  const { data: invitations, isLoading: loadingInvites } = useTeamInvitations();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const revokeInvite = useRevokeInvitation();
  const [showInvite, setShowInvite] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage members, roles, and invitations.</p>
        </div>
        {!showInvite && (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="h-4 w-4" /> Invite member
          </Button>
        )}
      </div>

      {showInvite && <InvitePanel onClose={() => setShowInvite(false)} />}

      {/* Members */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Members ({members?.length ?? 0})</h2>
        {loadingMembers ? (
          <div className="flex h-24 items-center justify-center"><Spinner /></div>
        ) : (
          <div className="space-y-2">
            {(members ?? []).map((m) => (
              <div key={m.membershipId} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <Avatar name={m.user.name} src={m.user.avatarUrl} className="h-9 w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.user.name ?? m.user.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {editingRole === m.membershipId ? (
                    <select
                      defaultValue={m.role}
                      autoFocus
                      onBlur={(e) => {
                        if (e.target.value !== m.role) {
                          updateRole.mutate({ membershipId: m.membershipId, role: e.target.value as OrgRole });
                        }
                        setEditingRole(null);
                      }}
                      className="h-7 rounded-md border border-input bg-background px-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r[0] + r.slice(1).toLowerCase()}</option>)}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingRole(m.membershipId)}
                      title="Click to change role"
                    >
                      <Badge className={cn('text-xs cursor-pointer hover:opacity-80', ROLE_COLORS[m.role])}>
                        {m.role[0] + m.role.slice(1).toLowerCase()}
                      </Badge>
                    </button>
                  )}
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {m.user.lastLoginAt
                      ? `Active ${formatDistanceToNowStrict(new Date(m.user.lastLoginAt), { addSuffix: true })}`
                      : `Joined ${formatDistanceToNowStrict(new Date(m.joinedAt), { addSuffix: true })}`}
                  </span>
                  {m.role !== 'OWNER' && (
                    <button
                      onClick={() => { if (confirm(`Remove ${m.user.name ?? m.user.email} from the team?`)) removeMember.mutate(m.membershipId); }}
                      className="text-muted-foreground hover:text-red-500 p-1 rounded"
                      title="Remove member"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending invitations */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Pending invitations</h2>
        {loadingInvites ? (
          <div className="flex h-16 items-center justify-center"><Spinner /></div>
        ) : !invitations || invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited by {inv.invitedBy.name ?? inv.invitedBy.email} ·
                    Expires {formatDistanceToNowStrict(new Date(inv.expiresAt), { addSuffix: true })}
                  </p>
                </div>
                <Badge className={cn('text-xs', ROLE_COLORS[inv.role])}>
                  {inv.role[0] + inv.role.slice(1).toLowerCase()}
                </Badge>
                <button
                  onClick={() => revokeInvite.mutate(inv.id)}
                  className="text-muted-foreground hover:text-red-500 p-1 rounded"
                  title="Revoke invitation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
