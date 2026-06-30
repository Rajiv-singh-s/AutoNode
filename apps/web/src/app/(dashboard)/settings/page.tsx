'use client';

import { useState, useEffect } from 'react';
import { Button, Spinner } from '@/components/ui';
import { useProfile, useUpdateProfile, useUpdatePassword } from '@/features/settings/use-settings';

export default function ProfileSettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const updatePassword = useUpdatePassword();

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setAvatarUrl(profile.avatarUrl ?? '');
    }
  }, [profile]);

  const saveProfile = async () => {
    setProfileMsg(null);
    try {
      await updateProfile.mutateAsync({ name: name.trim() || undefined, avatarUrl: avatarUrl.trim() || undefined });
      setProfileMsg({ ok: true, text: 'Profile updated.' });
    } catch (e) {
      setProfileMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to update profile.' });
    }
  };

  const changePassword = async () => {
    setPwMsg(null);
    if (newPassword !== confirmPassword) return setPwMsg({ ok: false, text: 'Passwords do not match.' });
    if (newPassword.length < 8) return setPwMsg({ ok: false, text: 'Password must be at least 8 characters.' });
    try {
      await updatePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPwMsg({ ok: true, text: 'Password changed. All sessions have been revoked.' });
    } catch (e) {
      setPwMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to change password.' });
    }
  };

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Spinner /></div>;

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your personal account settings.</p>
      </div>

      {/* Profile info */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Personal information</h2>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span>
          <input
            value={profile?.email ?? ''}
            disabled
            className="h-10 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Display name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Avatar URL</span>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        {profileMsg && (
          <p className={`text-sm ${profileMsg.ok ? 'text-emerald-500' : 'text-red-500'}`}>{profileMsg.text}</p>
        )}
        <Button onClick={saveProfile} loading={updateProfile.isPending}>Save profile</Button>
      </section>

      {/* Change password */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Change password</h2>

        {(['Current password', 'New password', 'Confirm new password'] as const).map((label, idx) => {
          const vals = [currentPassword, newPassword, confirmPassword];
          const setters = [setCurrentPassword, setNewPassword, setConfirmPassword];
          return (
            <label key={label} className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
              <input
                type="password"
                value={vals[idx]}
                onChange={(e) => setters[idx](e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          );
        })}

        {pwMsg && (
          <p className={`text-sm ${pwMsg.ok ? 'text-emerald-500' : 'text-red-500'}`}>{pwMsg.text}</p>
        )}
        <Button onClick={changePassword} loading={updatePassword.isPending} variant="outline">
          Change password
        </Button>
      </section>
    </div>
  );
}
