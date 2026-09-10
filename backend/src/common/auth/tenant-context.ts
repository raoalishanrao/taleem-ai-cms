import { AsyncLocalStorage } from 'node:async_hooks';

export type TenantStore = {
  tenantId: string;
};

const als = new AsyncLocalStorage<TenantStore>();

export const TenantContext = {
  run<T>(tenantId: string, fn: () => T): T {
    return als.run({ tenantId }, fn);
  },

  runAsync<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return als.run({ tenantId }, fn);
  },

  getTenantId(): string | undefined {
    return als.getStore()?.tenantId;
  },

  requireTenantId(): string {
    const tenantId = als.getStore()?.tenantId;
    if (!tenantId) {
      throw new Error('TenantContext is not set for this request');
    }
    return tenantId;
  },
};

/** Well-known default for legacy / public flows without a JWT. */
export function resolveDefaultTenantId(): string {
  return (
    process.env.DEFAULT_TENANT_ID?.trim() ||
    '00000000-0000-4000-8000-000000000001'
  );
}

export function resolvePublicTenantId(
  headerValue?: string | string[] | null,
): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const trimmed = raw?.trim();
  if (trimmed) return trimmed;
  return resolveDefaultTenantId();
}
