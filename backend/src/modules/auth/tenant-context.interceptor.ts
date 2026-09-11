import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  resolvePublicTenantId,
  TenantContext,
} from '../../common/auth/tenant-context';

/**
 * Binds TenantContext for the request via AsyncLocalStorage.enterWith
 * so TypeORM repository calls still see tenantId after Nest/rxjs async hops.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      user?: AuthUser;
      headers: Record<string, string | string[] | undefined>;
    }>();

    const tenantId =
      req.user?.tenantId ??
      resolvePublicTenantId(req.headers['x-tenant-id']);

    TenantContext.enter(tenantId);
    return next.handle();
  }
}
