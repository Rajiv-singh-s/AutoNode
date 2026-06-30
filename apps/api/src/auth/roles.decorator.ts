import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { OrgRole } from '@autonode/database';
import type { AuthenticatedUser } from './auth.types';

export const ROLES_KEY = 'roles';

/** Restrict a route to one or more organization roles. */
export const Roles = (...roles: OrgRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<OrgRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    if (!req.user || !required.includes(req.user.role)) {
      throw new ForbiddenException('Insufficient role for this action');
    }
    return true;
  }
}
