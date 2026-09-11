import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '../../common/exceptions';

export type RegistrationTenantDto = {
  id: string;
  code: string;
  displayName: string;
};

/**
 * Fetches ACTIVE ALUMNI-entitled tenants from IAM using a server-side API key.
 * The key never ships to the browser — alumni portal calls CMS only.
 */
@Injectable()
export class IamRegistrationTenantsService {
  private readonly logger = new Logger(IamRegistrationTenantsService.name);

  constructor(private readonly config: ConfigService) {}

  async listForRegistration(
    applicationCode = 'ALUMNI',
  ): Promise<RegistrationTenantDto[]> {
    const iamBase = this.iamBaseUrl();
    const apiKey = this.config.get<string>('IAM_REGISTRATION_API_KEY')?.trim();
    if (!apiKey) {
      throw new BusinessException(
        'IAM_REGISTRATION_API_KEY is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
        'IAM_API_KEY_MISSING',
      );
    }

    const url = new URL(`${iamBase}/public/tenants-for-registration`);
    url.searchParams.set('applicationCode', applicationCode);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'x-api-key': apiKey,
        },
      });
    } catch (error) {
      this.logger.error(
        `IAM tenants fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BusinessException(
        'Unable to load institutions from identity service',
        HttpStatus.BAD_GATEWAY,
        'IAM_UNAVAILABLE',
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `IAM tenants-for-registration ${response.status}: ${body.slice(0, 300)}`,
      );
      throw new BusinessException(
        'Unable to load institutions',
        HttpStatus.BAD_GATEWAY,
        'IAM_TENANTS_FAILED',
      );
    }

    const payload = (await response.json()) as unknown;
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown })?.data)
        ? ((payload as { data: unknown[] }).data)
        : [];

    return rows
      .map((row) => this.mapRow(row))
      .filter((row): row is RegistrationTenantDto => Boolean(row));
  }

  private mapRow(row: unknown): RegistrationTenantDto | null {
    if (!row || typeof row !== 'object') return null;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id : null;
    const code =
      typeof r.code === 'string'
        ? r.code
        : typeof r.tenantCode === 'string'
          ? r.tenantCode
          : null;
    const displayName =
      typeof r.displayName === 'string'
        ? r.displayName
        : typeof r.display_name === 'string'
          ? r.display_name
          : null;
    if (!id || !code || !displayName) return null;
    return { id, code, displayName };
  }

  private iamBaseUrl(): string {
    const raw =
      this.config.get<string>('IAM_BASE_URL')?.trim() ||
      'http://localhost:3010/api/v1';
    return raw.replace(/\/$/, '');
  }
}
