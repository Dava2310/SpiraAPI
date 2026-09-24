import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Splits `expires_at` into the two kinds of date food actually carries.
 *
 * A best-before date is about quality: food past it may still be donated. A use-by
 * date is about safety: food past it may not be, by anyone. One timestamp could not
 * tell them apart, so nothing could withdraw unsafe stock without also withdrawing
 * perfectly good stock.
 *
 * The type is written once and shared by both tables, because TypeORM emits
 * `CREATE TYPE` per column and would otherwise fail with SQLSTATE 42710 — the same
 * fault documented on the initial migration.
 *
 * Existing rows are backfilled `BEST_BEFORE`: they were created when the column did
 * not exist, under semantics that let them stay claimable, so this preserves what
 * they already meant rather than retroactively hiding them.
 */
export class AddExpiryKind1790249427000 implements MigrationInterface {
  name = 'AddExpiryKind1790249427000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."expiry_kind" AS ENUM('BEST_BEFORE', 'USE_BY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item" ADD "expiry_kind" "public"."expiry_kind"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_line" ADD "expiry_kind" "public"."expiry_kind"`,
    );

    await queryRunner.query(
      `UPDATE "inventory_item" SET "expiry_kind" = 'BEST_BEFORE' WHERE "expires_at" IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "donation_line" SET "expiry_kind" = 'BEST_BEFORE' WHERE "expires_at" IS NOT NULL`,
    );

    // A kind without a date says nothing, and a date without a kind cannot be
    // judged safe or unsafe. Enforced here rather than only in the DTO, so a row
    // written by a migration or by hand cannot be ambiguous either.
    await queryRunner.query(
      `ALTER TABLE "inventory_item" ADD CONSTRAINT "chk_inventory_expiry_kind" CHECK (("expires_at" IS NULL) = ("expiry_kind" IS NULL))`,
    );

    // Lets the shelf exclude passed use-by lots without scanning every row.
    await queryRunner.query(
      `CREATE INDEX "idx_inventory_expiry_kind" ON "inventory_item" ("expiry_kind", "expires_at") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_inventory_expiry_kind"`);
    await queryRunner.query(
      `ALTER TABLE "inventory_item" DROP CONSTRAINT "chk_inventory_expiry_kind"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_line" DROP COLUMN "expiry_kind"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item" DROP COLUMN "expiry_kind"`,
    );
    await queryRunner.query(`DROP TYPE "public"."expiry_kind"`);
  }
}
