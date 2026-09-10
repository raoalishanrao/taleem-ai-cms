import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catalog + shared media are not tenant-scoped.
 * An earlier draft of AddTenantIdColumns added these; drop leftovers.
 */
const DROP_TENANT_ID_TABLES = [
  'portal_media',
  'campuses',
  'degrees',
  'programs',
  'degree_programs',
] as const;

export class DropTenantIdFromCatalogAndMedia1755400000000
  implements MigrationInterface
{
  name = 'DropTenantIdFromCatalogAndMedia1755400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of DROP_TENANT_ID_TABLES) {
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_${table}_tenant_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "tenant_id"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Intentionally not re-adding NOT NULL tenant_id on catalog/media.
  }
}
