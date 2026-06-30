import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from './auth.types';

/** Injects the authenticated user payload, or a single field of it. */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    return field ? req.user?.[field] : req.user;
  },
);

/** Convenience: injects just the active organization id. */
export const OrgId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
  return req.user?.orgId;
});
