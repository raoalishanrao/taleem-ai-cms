import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '../../common/exceptions';

export type RegistrationTenantDto = {
  id: string;
  code: string;
  displayName: string;
};

export type AlumniMemberOnboardResult = {
  status: 'INVITED' | 'ACCESS_GRANTED' | string;
  tenantId: string;
  email: string;
  userId?: string;
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
    const apiKey = this.requireApiKey();

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
        ? (payload as { data: unknown[] }).data
        : [];

    return rows
      .map((row) => this.mapRow(row))
      .filter((row): row is RegistrationTenantDto => Boolean(row));
  }

  /**
   * On approve: invite the alumni onto the base platform (tenant member + email link)
   * and queue ALUMNI_MEMBER application access for after accept.
   */
  async onboardAlumniMember(
    tenantId: string,
    payload: { email: string; fullName?: string; isDefault?: boolean },
  ): Promise<AlumniMemberOnboardResult> {
    const iamBase = this.iamBaseUrl();
    const apiKey = this.requireApiKey();
    const url = `${iamBase}/public/tenants/${tenantId}/alumni-member-onboard`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          email: payload.email,
          fullName: payload.fullName,
          isDefault: payload.isDefault !== false,
        }),
      });
    } catch (error) {
      this.logger.error(
        `IAM alumni-member-onboard failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BusinessException(
        'Unable to invite member on the identity platform',
        HttpStatus.BAD_GATEWAY,
        'IAM_UNAVAILABLE',
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(
        `IAM alumni-member-onboard ${response.status}: ${body.slice(0, 400)}`,
      );
      throw new BusinessException(
        this.onboardErrorMessage(response.status, body),
        HttpStatus.BAD_GATEWAY,
        'IAM_ONBOARD_FAILED',
      );
    }

    const data = (await response.json()) as AlumniMemberOnboardResult;
    this.logger.log(
      `IAM_ALUMNI_ONBOARD status=${data.status} tenantId=${tenantId} email=${payload.email}`,
    );
    return data;
  }

  private onboardErrorMessage(status: number, body: string): string {
    try {
      const parsed = JSON.parse(body) as { message?: string | string[] };
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message;
      }
      if (Array.isArray(parsed.message) && parsed.message[0]) {
        return String(parsed.message[0]);
      }
    } catch {
      /* ignore */
    }
    if (status === 409) {
      return 'A pending invitation or active membership already exists for this email on the identity platform';
    }
    if (status === 400) {
      return 'Tenant is not entitled to Alumni or onboard request was invalid';
    }
    return 'Unable to onboard alumni member on the identity platform';
  }

  private requireApiKey(): string {
    const apiKey = this.config.get<string>('IAM_REGISTRATION_API_KEY')?.trim();
    if (!apiKey) {
      throw new BusinessException(
        'IAM_REGISTRATION_API_KEY is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
        'IAM_API_KEY_MISSING',
      );
    }
    return apiKey;
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
