import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AlumniPermissionCode } from '../auth/alumni-permissions';
import { AuthUser } from '../decorators/current-user.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { BusinessException } from '../exceptions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AlumniPermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
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

    const missing = required.filter(
      (code) => !user.permissions?.includes(code),
    );
    if (missing.length > 0) {
      throw new BusinessException(
        'Missing required permission',
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
      );
    }

    return true;
  }
}
