import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AlumniRoleCode } from '../auth/alumni-permissions';

export interface AuthUser {
  /** IAM identity id (`identities.id` / JWT `sub`). */
  userId: string;
  email: string;
  /** OAuth tenant claim — required for protected CMS APIs. */
  tenantId: string;
  clientId?: string;
  scope?: string;
  sessionId?: string;
  roles: AlumniRoleCode[];
  permissions: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
