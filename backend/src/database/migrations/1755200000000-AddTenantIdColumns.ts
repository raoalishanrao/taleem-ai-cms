import { MigrationInterface, QueryRunner } from 'typeorm';

/** Well-known default for legacy single-tenant rows (also DEFAULT_TENANT_ID in .env). */
const DEFAULT_TENANT_ID = '00000000-0000-4000-8000-000000000001';

const ROOT_TABLES = [
  'alumni',
  'alumni_registration_request',
  'announcements',
  'events',
] as const;

const CHILD_TABLES = [
  'alumni_academic_information',
  'alumni_professional_information',
  'alumni_verification',
  'alumni_contact_requests',
  'alumni_notifications',
  'event_rsvps',
] as const;

const ALL_TABLES = [...ROOT_TABLES, ...CHILD_TABLES] as const;

export class AddTenantIdColumns1755200000000 implements MigrationInterface {
  name = 'AddTenantIdColumns1755200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ALL_TABLES) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ADD COLUMN IF NOT EXISTS "tenant_id" uuid NULL
      `);
    }

    for (const table of ROOT_TABLES) {
      await queryRunner.query(`
        UPDATE "${table}"
        SET "tenant_id" = '${DEFAULT_TENANT_ID}'::uuid
        WHERE "tenant_id" IS NULL
      `);
    }

    await queryRunner.query(`
      UPDATE "alumni_academic_information" aai
      SET "tenant_id" = a."tenant_id"
      FROM "alumni" a
      WHERE aai."alumni_id" = a."id" AND aai."tenant_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "alumni_professional_information" api
      SET "tenant_id" = a."tenant_id"
      FROM "alumni" a
      WHERE api."alumni_id" = a."id" AND api."tenant_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "alumni_verification" av
      SET "tenant_id" = a."tenant_id"
      FROM "alumni" a
      WHERE av."alumni_id" = a."id" AND av."tenant_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "alumni_notifications" an
      SET "tenant_id" = a."tenant_id"
      FROM "alumni" a
      WHERE an."alumni_id" = a."id" AND an."tenant_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "alumni_contact_requests" acr
      SET "tenant_id" = a."tenant_id"
      FROM "alumni" a
      WHERE acr."requester_alumni_id" = a."id" AND acr."tenant_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "event_rsvps" er
      SET "tenant_id" = e."tenant_id"
      FROM "events" e
      WHERE er."event_id" = e."id" AND er."tenant_id" IS NULL
    `);

    for (const table of CHILD_TABLES) {
      await queryRunner.query(`
        UPDATE "${table}"
        SET "tenant_id" = '${DEFAULT_TENANT_ID}'::uuid
        WHERE "tenant_id" IS NULL
      `);
    }

    for (const table of ALL_TABLES) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ALTER COLUMN "tenant_id" SET NOT NULL
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_${table}_tenant_id"
        ON "${table}" ("tenant_id")
      `);
    }

    // Tenant-scoped uniqueness (drop global, add composite)
    await queryRunner.query(`
      ALTER TABLE "alumni" DROP CONSTRAINT IF EXISTS "UQ_alumni_cnic"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_alumni_cnic"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_alumni_tenant_cnic"
      ON "alumni" ("tenant_id", "cnic_national_id")
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_alumni_public_alumni_code"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_alumni_tenant_public_alumni_code"
      ON "alumni" ("tenant_id", "public_alumni_code")
    `);

    await queryRunner.query(`
      ALTER TABLE "alumni_registration_request"
      DROP CONSTRAINT IF EXISTS "UQ_alumni_registration_request_cnic"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_alumni_registration_request_cnic"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_alumni_registration_request_tenant_cnic"
      ON "alumni_registration_request" ("tenant_id", "cnic_national_id")
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_alumni_registration_request_reference_number"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_alumni_registration_request_tenant_reference"
      ON "alumni_registration_request" ("tenant_id", "reference_number")
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_alumni_registration_request_tenant_reference"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_alumni_registration_request_reference_number"
      ON "alumni_registration_request" ("reference_number")
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_alumni_registration_request_tenant_cnic"
    `);
    await queryRunner.query(`
      ALTER TABLE "alumni_registration_request"
      ADD CONSTRAINT "UQ_alumni_registration_request_cnic" UNIQUE ("cnic_national_id")
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_alumni_tenant_public_alumni_code"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_alumni_public_alumni_code"
      ON "alumni" ("public_alumni_code")
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_alumni_tenant_cnic"`);
    await queryRunner.query(`
      ALTER TABLE "alumni"
      ADD CONSTRAINT "UQ_alumni_cnic" UNIQUE ("cnic_national_id")
    `);

    for (const table of ALL_TABLES) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${table}_tenant_id"`);
      await queryRunner.query(`
        ALTER TABLE "${table}" DROP COLUMN IF EXISTS "tenant_id"
      `);
    }
  }
}
