import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AlumniPermission,
  AlumniRole,
  permissionsForAlumniRoles,
  type AlumniRoleCode,
} from '../../common/auth/alumni-permissions';
import { BusinessException } from '../../common/exceptions';
import { PasswordCryptoService } from './password-crypto.service';

export type PortalLoginResult = {
  accessToken: string;
  userId: string;
  role: AlumniRoleCode;
  tenantId: string;
  email: string;
};

type IamLoginResponse = {
  accessToken?: string;
  access_token?: string;
  user?: { id?: string; userId?: string; email?: string };
};

@Injectable()
export class IamLoginBridgeService {
  private readonly logger = new Logger(IamLoginBridgeService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly passwordCrypto: PasswordCryptoService,
  ) {}

  async loginWithPassword(input: {
    email: string;
    passwordCipherOrPlain: string;
    portal: 'alumni' | 'admin';
    tenantId?: string;
  }): Promise<PortalLoginResult> {
    const iamBase = this.iamBaseUrl();
    const plainPassword = this.toPlainPassword(input.passwordCipherOrPlain);

    const session = await this.iamPasswordLogin(
      iamBase,
      input.email,
      plainPassword,
    );
    const identityId = session.userId;
    const email = session.email || input.email.toLowerCase();

    const oauth = await this.exchangeOAuthAccessToken({
      iamBase,
      sessionAccessToken: session.accessToken,
      identityId,
      preferredTenantId: input.tenantId,
    });

    const roles = this.parseAlumniRolesFromAccessToken(oauth.accessToken);
    if (roles.length === 0) {
      throw new BusinessException(
        'No Alumni application access for this tenant',
        HttpStatus.FORBIDDEN,
        'ALUMNI_ACCESS_REQUIRED',
      );
    }

    const permissions = permissionsForAlumniRoles(roles);
    if (input.portal === 'admin') {
      if (!permissions.includes(AlumniPermission.ADMIN_ACCESS)) {
        throw new BusinessException(
          'Not authorized for the admin portal',
          HttpStatus.FORBIDDEN,
          'FORBIDDEN',
        );
      }
    } else if (
      !permissions.includes(AlumniPermission.PORTAL_ACCESS) &&
      !permissions.includes(AlumniPermission.ADMIN_ACCESS)
    ) {
      throw new BusinessException(
        'Not authorized for the alumni portal',
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
      );
    }

    const role: AlumniRoleCode = roles.includes(AlumniRole.ADMIN)
      ? AlumniRole.ADMIN
      : AlumniRole.MEMBER;

    this.logger.log(
      `IAM_PORTAL_LOGIN portal=${input.portal} userId=${identityId} tenant=${oauth.tenantId} role=${role}`,
    );

    return {
      accessToken: oauth.accessToken,
      userId: identityId,
      role,
      tenantId: oauth.tenantId,
      email,
    };
  }

  private toPlainPassword(value: string): string {
    // Portals send RSA-OAEP ciphertext; tolerate plaintext for tooling.
    if (!value.includes(' ') && value.length > 80) {
      try {
        return this.passwordCrypto.decryptPassword(value);
      } catch {
        // fall through — may already be plaintext
      }
    }
    try {
      return this.passwordCrypto.decryptPassword(value);
    } catch {
      return value;
    }
  }

  private async iamPasswordLogin(
    iamBase: string,
    email: string,
    password: string,
  ): Promise<{ accessToken: string; userId: string; email: string }> {
    const res = await fetch(`${iamBase}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = (await res.json().catch(() => ({}))) as IamLoginResponse & {
      message?: string;
      statusCode?: number;
      code?: string;
    };
    if (!res.ok) {
      throw new BusinessException(
        body.message || 'Invalid credentials',
        res.status === 401
          ? HttpStatus.UNAUTHORIZED
          : HttpStatus.BAD_GATEWAY,
        body.code || 'IAM_LOGIN_FAILED',
      );
    }

    const accessToken = body.accessToken ?? body.access_token;
    const userId = body.user?.id ?? body.user?.userId;
    if (!accessToken || !userId) {
      throw new BusinessException(
        'IAM login response missing token or user id',
        HttpStatus.BAD_GATEWAY,
        'IAM_LOGIN_INVALID',
      );
    }
    return {
      accessToken,
      userId,
      email: body.user?.email ?? email.toLowerCase(),
    };
  }

  private async exchangeOAuthAccessToken(input: {
    iamBase: string;
    sessionAccessToken: string;
    identityId: string;
    preferredTenantId?: string;
  }): Promise<{ accessToken: string; tenantId: string }> {
    const clientId =
      this.config.get<string>('OAUTH_CLIENT_ID')?.trim() || 'alumni-web';
    const clientSecret =
      this.config.get<string>('OAUTH_CLIENT_SECRET')?.trim() ||
      'AlumniClientSecret2026!';
    const redirectUri =
      this.config.get<string>('OAUTH_REDIRECT_URI')?.trim() ||
      'http://localhost:3001/callback';
    const scope =
      this.config.get<string>('OAUTH_SCOPE')?.trim() ||
      'openid profile tenant.read';

    const { verifier, challenge } = this.createPkce();

    const preview = await this.iamJson<{
      tenants?: Array<{ tenantId?: string; id?: string }>;
      data?: { tenants?: Array<{ tenantId?: string; id?: string }> };
    }>(
      `${input.iamBase}/oauth/authorize?${new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      }).toString()}`,
      {
        headers: { authorization: `Bearer ${input.sessionAccessToken}` },
      },
    );

    const tenants =
      preview.tenants ?? preview.data?.tenants ?? ([] as Array<{ tenantId?: string; id?: string }>);
    const tenantIds = tenants
      .map((t) => t.tenantId ?? t.id)
      .filter((id): id is string => Boolean(id));

    const defaultTenant =
      this.config.get<string>('DEFAULT_TENANT_ID')?.trim() ||
      '00000000-0000-4000-8000-000000000001';
    const tenantId =
      input.preferredTenantId?.trim() ||
      (tenantIds.includes(defaultTenant) ? defaultTenant : undefined) ||
      tenantIds[0];

    if (!tenantId) {
      throw new BusinessException(
        'No entitled tenant available for Alumni OAuth consent',
        HttpStatus.FORBIDDEN,
        'TENANT_REQUIRED',
      );
    }

    const consent = await this.iamJson<{
      code?: string;
      redirectUri?: string;
    }>(`${input.iamBase}/oauth/authorize/consent`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.sessionAccessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        tenant_id: tenantId,
        approved: true,
        scope,
      }),
    });

    const code =
      consent.code ||
      (consent.redirectUri
        ? new URL(consent.redirectUri).searchParams.get('code')
        : null);
    if (!code) {
      throw new BusinessException(
        'OAuth consent did not return an authorization code',
        HttpStatus.BAD_GATEWAY,
        'OAUTH_CONSENT_FAILED',
      );
    }

    const token = await this.iamJson<{
      access_token?: string;
      accessToken?: string;
    }>(`${input.iamBase}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: verifier,
      }),
    });

    const accessToken = token.access_token ?? token.accessToken;
    if (!accessToken) {
      throw new BusinessException(
        'OAuth token response missing access_token',
        HttpStatus.BAD_GATEWAY,
        'OAUTH_TOKEN_FAILED',
      );
    }

    return { accessToken, tenantId };
  }

  /** Decode OAuth JWT payload (already issued by trusted IAM) for roles claim. */
  private parseAlumniRolesFromAccessToken(accessToken: string): AlumniRoleCode[] {
    try {
      const [, payloadPart] = accessToken.split('.');
      if (!payloadPart) return [];
      const json = Buffer.from(payloadPart, 'base64url').toString('utf8');
      const payload = JSON.parse(json) as { roles?: string[] | string };
      const values = Array.isArray(payload.roles)
        ? payload.roles
        : typeof payload.roles === 'string'
          ? payload.roles.split(/[,\s]+/)
          : [];
      return [
        ...new Set(
          values
            .map((value) => value?.trim())
            .filter(
              (code): code is AlumniRoleCode =>
                code === AlumniRole.MEMBER || code === AlumniRole.ADMIN,
            ),
        ),
      ];
    } catch {
      return [];
    }
  }

  private createPkce() {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
  }

  private iamBaseUrl(): string {
    const base =
      this.config.get<string>('IAM_BASE_URL')?.trim() ||
      this.config.get<string>('BASE_API_URL')?.trim() ||
      'http://localhost:3010/api/v1';
    return base.replace(/\/$/, '');
  }

  private async iamJson<T>(
    url: string,
    init?: RequestInit,
  ): Promise<T> {
    const res = await fetch(url, init);
    const body = (await res.json().catch(() => ({}))) as T & {
      message?: string;
      code?: string;
    };
    if (!res.ok) {
      this.logger.warn(
        `IAM_CALL_FAILED ${init?.method ?? 'GET'} ${url} status=${res.status} message=${body.message ?? ''}`,
      );
      throw new BusinessException(
        body.message || `IAM request failed (${res.status})`,
        res.status >= 400 && res.status < 500
          ? res.status
          : HttpStatus.BAD_GATEWAY,
        body.code || 'IAM_REQUEST_FAILED',
      );
    }
    return body;
  }
}
