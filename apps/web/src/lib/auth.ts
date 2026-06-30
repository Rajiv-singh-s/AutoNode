'use client';

// Lightweight client-side token store. Tokens live in localStorage; the
// access token is attached to API + socket requests. (A production hardening
// step is to move refresh tokens to httpOnly cookies — see SECURITY.md.)

const ACCESS_KEY = 'autonode.accessToken';
const REFRESH_KEY = 'autonode.refreshToken';
const ORG_KEY = 'autonode.org';

export interface StoredOrg {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export const authStore = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  getOrg(): StoredOrg | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(ORG_KEY);
    return raw ? (JSON.parse(raw) as StoredOrg) : null;
  },
  set(tokens: { accessToken: string; refreshToken: string; organization: StoredOrg }): void {
    window.localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    window.localStorage.setItem(ORG_KEY, JSON.stringify(tokens.organization));
  },
  clear(): void {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    window.localStorage.removeItem(ORG_KEY);
  },
  isAuthenticated(): boolean {
    return Boolean(this.getAccessToken());
  },
};
