'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle, Instagram, MessageCircle, Phone, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  useChannels,
  useConnectChannel,
  useDisconnectChannel,
  useMetaOAuthUrl,
  useUpdateChannel,
  type Channel,
  type ConnectChannelInput,
} from '@/features/settings/use-settings';

const CHANNEL_ICONS = {
  INSTAGRAM: Instagram,
  MESSENGER: MessageCircle,
  WHATSAPP: Phone,
} as const;

const CHANNEL_LABELS = {
  INSTAGRAM: 'Instagram',
  MESSENGER: 'Messenger',
  WHATSAPP: 'WhatsApp',
} as const;

const STATUS_META = {
  CONNECTED: { icon: CheckCircle, cls: 'text-emerald-500', label: 'Connected' },
  DISCONNECTED: { icon: XCircle, cls: 'text-muted-foreground', label: 'Disconnected' },
  ERROR: { icon: AlertCircle, cls: 'text-red-500', label: 'Error' },
  EXPIRED: { icon: AlertCircle, cls: 'text-amber-500', label: 'Token expired' },
} as const;

function ConnectChannelDrawer({ onClose }: { onClose: () => void }) {
  const connect = useConnectChannel();
  const [form, setForm] = useState<ConnectChannelInput>({
    type: 'INSTAGRAM',
    externalId: '',
    name: '',
    username: '',
    accessToken: '',
    pageId: '',
  });
  const [error, setError] = useState<string | null>(null);

  const patch = (k: keyof ConnectChannelInput, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError(null);
    if (!form.externalId.trim()) return setError('External ID is required');
    if (!form.accessToken.trim()) return setError('Access token is required');
    try {
      await connect.mutateAsync({
        ...form,
        name: form.name?.trim() || undefined,
        username: form.username?.trim() || undefined,
        pageId: form.pageId?.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect channel');
    }
  };

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="scroll-thin fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-border bg-card shadow-2xl"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-sm font-semibold">Connect a channel</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <div className="space-y-4 p-4">
          <p className="text-xs text-muted-foreground">
            Provide your Meta channel details and access token. Tokens are encrypted at rest using AES-256-GCM and never logged.
          </p>

          {/* Channel type */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Channel type</span>
            <div className="grid grid-cols-3 gap-2">
              {(['INSTAGRAM', 'MESSENGER', 'WHATSAPP'] as const).map((t) => {
                const Icon = CHANNEL_ICONS[t];
                return (
                  <button
                    key={t}
                    onClick={() => patch('type', t)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors',
                      form.type === t ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-accent',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {CHANNEL_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {[
            { key: 'externalId', label: form.type === 'WHATSAPP' ? 'Phone number ID' : 'External ID (IG/Page user ID)', required: true },
            { key: 'name', label: 'Display name', required: false },
            { key: 'username', label: 'Username / handle', required: false },
            { key: 'accessToken', label: 'Meta access token', required: true },
            { key: 'pageId', label: 'Facebook Page ID (for IG / Messenger)', required: false },
          ].map(({ key, label, required }) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                {label} {required && <span className="text-red-500">*</span>}
              </span>
              <input
                value={(form as unknown as Record<string, string>)[key] ?? ''}
                onChange={(e) => patch(key as keyof ConnectChannelInput, e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          ))}

          {form.type === 'WHATSAPP' && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">WABA ID</span>
              <input
                value={form.wabaId ?? ''}
                onChange={(e) => patch('wabaId', e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={save} loading={connect.isPending} className="flex-1">Connect channel</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function ChannelCard({ channel }: { channel: Channel }) {
  const disconnect = useDisconnectChannel();
  const update = useUpdateChannel();
  const [rotateToken, setRotateToken] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);

  const Icon = CHANNEL_ICONS[channel.type];
  const status = STATUS_META[channel.status];
  const StatusIcon = status.icon;

  const doDisconnect = () => {
    if (!confirm(`Disconnect ${channel.name ?? channel.type}? This will stop processing messages from this channel.`)) return;
    disconnect.mutate(channel.id);
  };

  const doRotateToken = async () => {
    setTokenError(null);
    if (!newToken.trim()) return setTokenError('Enter the new access token');
    try {
      await update.mutateAsync({ id: channel.id, patch: { accessToken: newToken.trim() } });
      setRotateToken(false);
      setNewToken('');
    } catch (e) {
      setTokenError(e instanceof Error ? e.message : 'Failed to rotate token');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{channel.name ?? CHANNEL_LABELS[channel.type]}</p>
            <span className="flex items-center gap-1 text-xs">
              <StatusIcon className={cn('h-3.5 w-3.5', status.cls)} />
              <span className={status.cls}>{status.label}</span>
            </span>
          </div>
          {channel.username && (
            <p className="text-sm text-muted-foreground">@{channel.username}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            ID: {channel.externalId} · {channel._count.conversations} conversations · {channel._count.contacts} contacts
          </p>
          {channel.lastError && (
            <p className="mt-1 text-xs text-red-500 truncate">{channel.lastError}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => setRotateToken((v) => !v)}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-accent"
            title="Rotate access token"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={doDisconnect}
            disabled={disconnect.isPending}
            className="text-muted-foreground hover:text-red-500 p-1.5 rounded-md hover:bg-accent disabled:opacity-50"
            title="Disconnect channel"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {rotateToken && (
        <div className="mt-3 border-t border-border pt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">New access token</p>
          <div className="flex gap-2">
            <input
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              placeholder="Paste new token…"
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" onClick={doRotateToken} loading={update.isPending}>Rotate</Button>
            <Button size="sm" variant="outline" onClick={() => { setRotateToken(false); setNewToken(''); }}>Cancel</Button>
          </div>
          {tokenError && <p className="text-xs text-red-500">{tokenError}</p>}
        </div>
      )}
    </div>
  );
}

export default function ChannelsSettingsPage() {
  const { data: channels, isLoading } = useChannels();
  const [showConnect, setShowConnect] = useState(false);
  const oauthUrl = useMetaOAuthUrl();
  const searchParams = useSearchParams();
  const [oauthBanner, setOauthBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Handle OAuth callback result in query params
  useEffect(() => {
    if (searchParams.get('success')) {
      setOauthBanner({ type: 'success', msg: 'Channel connected successfully via Meta OAuth!' });
    } else if (searchParams.get('error')) {
      const errCode = searchParams.get('error');
      const msgs: Record<string, string> = {
        invalid_state: 'OAuth session expired or invalid. Please try again.',
        no_pages: 'No Facebook Pages found. For Messenger/WhatsApp, connect a Page to your Meta account. (Instagram no longer needs a Page.)',
        no_instagram_account: 'No Instagram professional account found. Switch your Instagram account to Business or Creator, then try again.',
        oauth_failed: 'Connection failed. Please try again.',
        denied: 'You declined the permissions request.',
      };
      setOauthBanner({ type: 'error', msg: msgs[errCode ?? ''] ?? 'Connection failed. Please try again.' });
    }
  }, [searchParams]);

  const connectWithMeta = async (type: Channel['type']) => {
    try {
      const res = await oauthUrl.mutateAsync(type);
      window.location.href = res.url;
    } catch (e) {
      setOauthBanner({
        type: 'error',
        msg: e instanceof Error ? e.message : 'Failed to start Meta OAuth. Check API configuration.',
      });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Channels</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect Meta business accounts. All tokens are encrypted with AES-256-GCM.
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowConnect(true)}>
          <Plus className="h-4 w-4" /> Manual connect
        </Button>
      </div>

      {/* OAuth banner */}
      {oauthBanner && (
        <div className={cn(
          'flex items-start gap-3 rounded-lg border p-3 text-sm',
          oauthBanner.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700'
            : 'border-red-500/30 bg-red-500/5 text-red-700',
        )}>
          {oauthBanner.type === 'success'
            ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          }
          <p>{oauthBanner.msg}</p>
          <button onClick={() => setOauthBanner(null)} className="ml-auto text-current opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* Connect with Meta (OAuth) */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Connect with Meta</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Authorize AutoNode through Meta's official OAuth. Instagram opens the Instagram Login experience (no Facebook Page required); Messenger and WhatsApp use Facebook Login. You'll be brought back here automatically.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {([
            { type: 'INSTAGRAM' as const, icon: Instagram, label: 'Instagram', desc: 'Instagram Business DMs' },
            { type: 'MESSENGER' as const, icon: MessageCircle, label: 'Messenger', desc: 'Facebook Page messages' },
            { type: 'WHATSAPP' as const, icon: Phone, label: 'WhatsApp', desc: 'WhatsApp Business' },
          ]).map(({ type, icon: Icon, label, desc }) => (
            <button
              key={type}
              onClick={() => connectWithMeta(type)}
              disabled={oauthUrl.isPending}
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
            >
              <Icon className="h-6 w-6 text-primary" />
              <div>
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-primary">
                Connect <ExternalLink className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Channel list */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Spinner /></div>
      ) : !channels || channels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">No channels connected yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the OAuth buttons above to connect your first channel.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((c) => <ChannelCard key={c.id} channel={c} />)}
        </div>
      )}

      <AnimatePresence>
        {showConnect && <ConnectChannelDrawer onClose={() => setShowConnect(false)} />}
      </AnimatePresence>
    </div>
  );
}
