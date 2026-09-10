import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  resolvePublicTenantId,
  TenantContext,
} from '../../common/auth/tenant-context';

/**
 * Runs the request handler inside TenantContext ALS.
 * Prefer JWT tenantId when authenticated; otherwise x-tenant-id / DEFAULT_TENANT_ID.
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

    return from(
      TenantContext.runAsync(tenantId, () => lastValueFrom(next.handle())),
    );
  }
}
