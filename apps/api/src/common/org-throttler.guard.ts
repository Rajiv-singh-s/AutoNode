import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { JwtPayload } from '../auth/auth.types';

@Injectable()
export class OrgThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as JwtPayload | undefined;
    // Prefer organization scoping so one tenant cannot affect another.
    if (user?.orgId) return `org:${user.orgId}`;

    // For public/unauthenticated routes, fall back to IP-based throttling.
    const ip = (req.ips as string[] | undefined)?.[0] ?? (req.ip as string | undefined);
    return ip ?? 'anonymous';
  }
}

