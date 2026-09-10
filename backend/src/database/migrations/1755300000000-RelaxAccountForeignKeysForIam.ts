import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IAM identities (base-module) are the user source of truth.
 * CMS columns that previously FK'd to local accounts now store opaque IAM identity UUIDs.
 */
export class RelaxAccountForeignKeysForIam1755300000000
  implements MigrationInterface
{
  name = 'RelaxAccountForeignKeysForIam1755300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alumni" DROP CONSTRAINT IF EXISTS "FK_alumni_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alumni_registration_request" DROP CONSTRAINT IF EXISTS "FK_alumni_registration_request_reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "FK_events_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" DROP CONSTRAINT IF EXISTS "FK_announcements_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alumni_contact_requests" DROP CONSTRAINT IF EXISTS "FK_alumni_contact_requests_admin_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "alumni"
      ADD CONSTRAINT "FK_alumni_user_id"
      FOREIGN KEY ("user_id") REFERENCES "accounts"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "alumni_registration_request"
      ADD CONSTRAINT "FK_alumni_registration_request_reviewed_by"
      FOREIGN KEY ("reviewed_by") REFERENCES "accounts"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "events"
      ADD CONSTRAINT "FK_events_created_by"
      FOREIGN KEY ("created_by") REFERENCES "accounts"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "announcements"
      ADD CONSTRAINT "FK_announcements_created_by"
      FOREIGN KEY ("created_by") REFERENCES "accounts"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "alumni_contact_requests"
      ADD CONSTRAINT "FK_alumni_contact_requests_admin_id"
      FOREIGN KEY ("admin_id") REFERENCES "accounts"("id") ON DELETE SET NULL
    `);
  }
}
