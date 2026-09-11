import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantContext } from '../../common/auth/tenant-context';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Unauthorized');
    }
    const authUser = user as AuthUser;
    if (authUser.tenantId) {
      // Bind early so repository calls during the request always see tenant.
      TenantContext.enter(authUser.tenantId);
    }
    return user;
  }
}
