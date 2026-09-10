import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../decorators/current-user.decorator';
import { BusinessException } from '../exceptions';
import { HttpStatus } from '@nestjs/common';
import type { AlumniRoleCode } from '../auth/alumni-permissions';

/**
 * @deprecated Prefer PermissionsGuard + @RequirePermissions.
 * Kept for any residual @Roles metadata using AlumniRole codes.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new BusinessException(
        'Unauthorized',
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
      );
    }

    const allowed = requiredRoles.some((role) =>
      user.roles.includes(role as AlumniRoleCode),
    );
    if (!allowed) {
      throw new BusinessException(
        'Required role missing',
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
      );
    }

    return true;
  }
}
