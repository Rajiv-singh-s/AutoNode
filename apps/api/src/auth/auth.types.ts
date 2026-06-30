import type { OrgRole } from '@autonode/database';

/** Decoded JWT access-token payload. */
export interface JwtPayload {
  sub: string; // userId
  email: string;
  orgId: string; // active organization
  role: OrgRole;
}

/** Shape attached to `request.user` after the guard runs. */
export type AuthenticatedUser = JwtPayload;
