import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  AlumniRole,
  permissionsForAlumniRoles,
  type AlumniRoleCode,
} from '../../common/auth/alumni-permissions';

export type AlumniAccessResult = {
  roles: AlumniRoleCode[];
  permissions: string[];
};

@Injectable()
export class AlumniAccessService implements OnModuleDestroy {
  private readonly logger = new Logger(AlumniAccessService.name);
  private readonly schema: string;
  private baseDataSource: DataSource | null = null;
  private initPromise: Promise<DataSource> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly cmsDataSource: DataSource,
  ) {
    this.schema =
      this.config.get<string>('BASE_DATABASE_SCHEMA')?.trim() ||
      'taleem-ai-base';
  }

  async resolveAccess(
    identityId: string,
    tenantId: string,
  ): Promise<AlumniAccessResult> {
    const ds = await this.getQueryDataSource();
    const schema = this.quoteIdent(this.schema);

    const rows: Array<{ role_code: string }> = await ds.query(
      `
      SELECT r.role_code AS role_code
      FROM ${schema}.application_access_assignments a
      INNER JOIN ${schema}.roles r ON r.id = a.role_id
      INNER JOIN ${schema}.applications app ON app.id = a.application_id
      WHERE a.identity_id = $1
        AND a.tenant_id = $2
        AND a.status = 'ACTIVE'
        AND app.application_code = 'ALUMNI'
        AND r.role_code IN ('ALUMNI_MEMBER', 'ALUMNI_ADMIN')
      `,
      [identityId, tenantId],
    );

    const roles = [
      ...new Set(
        rows
          .map((row) => row.role_code)
          .filter(
            (code): code is AlumniRoleCode =>
              code === AlumniRole.MEMBER || code === AlumniRole.ADMIN,
          ),
      ),
    ];

    if (roles.length === 0) {
      this.logger.debug(
        `No ALUMNI assignment for identity=${identityId} tenant=${tenantId}`,
      );
    }

    return {
      roles,
      permissions: permissionsForAlumniRoles(roles),
    };
  }

  async onModuleDestroy() {
    if (this.baseDataSource?.isInitialized) {
      await this.baseDataSource.destroy();
    }
  }

  private async getQueryDataSource(): Promise<DataSource> {
    const host = this.config.get<string>('BASE_DATABASE_HOST')?.trim();
    if (!host) {
      return this.cmsDataSource;
    }

    if (this.baseDataSource?.isInitialized) {
      return this.baseDataSource;
    }

    if (!this.initPromise) {
      this.initPromise = (async () => {
        const sslEnabled =
          this.config.get<string>('BASE_DATABASE_SSL') === 'true' ||
          this.config.get<string>('DB_SSL') === 'true';
        const ds = new DataSource({
          type: 'postgres',
          host,
          port: Number(
            this.config.get<string>('BASE_DATABASE_PORT') ??
              this.config.get<string>('DB_PORT') ??
              '5432',
          ),
          username:
            this.config.get<string>('BASE_DATABASE_USER') ??
            this.config.get<string>('DB_USER') ??
            'postgres',
          password:
            this.config.get<string>('BASE_DATABASE_PASSWORD') ??
            this.config.get<string>('DB_PASSWORD') ??
            '',
          database:
            this.config.get<string>('BASE_DATABASE_NAME') ??
            this.config.get<string>('DB_NAME') ??
            'postgres',
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          synchronize: false,
          logging: false,
        });
        await ds.initialize();
        this.baseDataSource = ds;
        return ds;
      })();
    }

    return this.initPromise;
  }

  private quoteIdent(ident: string): string {
    return `"${ident.replace(/"/g, '""')}"`;
  }
}
