import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The initial schema: 16 tables, 16 enum types, 47 indexes, 11 checks, 36 FKs.
 *
 * Hand-edited after generation, and it matters. TypeORM emits `CREATE TYPE` once
 * per *column* rather than once per type, so the five enums shared across
 * columns — unit_of_measure (3), product_category (2), profile_status (2),
 * donation_reason (2) — produced duplicate statements that fail with SQLSTATE
 * 42710. The duplicates were removed, keeping the **first** occurrence in `up`
 * and the **last** in `down`, so a shared type is created before its first
 * table and dropped only after its last one.
 *
 * Regenerating this file reintroduces both faults. See docs/deployment.md.
 */
export class InitialSchema1790075757278 implements MigrationInterface {
  name = 'InitialSchema1790075757278';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."invalid_token_reason" AS ENUM('LOGOUT', 'PASSWORD_CHANGE', 'ADMIN_REVOKE', 'SECURITY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invalid_token" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "jti" uuid NOT NULL, "user_id" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "reason" "public"."invalid_token_reason" NOT NULL, CONSTRAINT "PK_eed57a279925c2d417c26a2a290" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_invalid_token_expires" ON "invalid_token"  ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_invalid_token_user" ON "invalid_token"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_invalid_token_jti" ON "invalid_token"  ("jti") `,
    );
    await queryRunner.query(
      `CREATE TABLE "impact_factor" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "label" character varying(60) NOT NULL, "meals_per_kg" numeric(6,3) NOT NULL, "co2_kg_per_kg" numeric(6,3) NOT NULL, "effective_from" date NOT NULL, "effective_to" date, CONSTRAINT "PK_44df7ce4a39612760894beec705" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_impact_factor_effective" ON "impact_factor"  ("effective_from") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "donation_receipt" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "donation_id" uuid NOT NULL, "receipt_number" character varying(30) NOT NULL, "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL, "retailer_legal_name" character varying(200) NOT NULL, "retailer_tax_id" character varying(40), "location_label" character varying(150) NOT NULL, "location_code" character varying(40), "location_address" text NOT NULL, "authorized_by_name" character varying(150) NOT NULL, "recipient_legal_name" character varying(200) NOT NULL, "recipient_tax_id" character varying(40), "driver_name" character varying(150), "vehicle_plate" character varying(20), "received_by_label" character varying(150), "handover_pin" character varying(8), "line_count" smallint NOT NULL, "total_weight_kg" numeric(12,3) NOT NULL, "total_quantity" numeric(12,3) NOT NULL DEFAULT '0', "total_retail_value" numeric(12,2), "currency" character(3) NOT NULL DEFAULT 'EUR', "estimated_meals" numeric(12,2), "co2_avoided_kg" numeric(12,3), "impact_factor_id" uuid, "legal_reference" character varying(200), "verification_code" character varying(60), CONSTRAINT "REL_95765058f3c5351246cd4b15c3" UNIQUE ("donation_id"), CONSTRAINT "PK_eb48360cd6821c038abec48fbdd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_receipt_number" ON "donation_receipt"  ("receipt_number") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."partnership_status" AS ENUM('PENDING', 'ACTIVE', 'PAUSED', 'ENDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "retailer_recipient_partnership" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "retailer_id" uuid NOT NULL, "recipient_id" uuid NOT NULL, "status" "public"."partnership_status" NOT NULL DEFAULT 'PENDING', "is_preferred" boolean NOT NULL DEFAULT false, "started_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_397da26c4af8fe8d478287b0d41" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_partnership_recipient" ON "retailer_recipient_partnership"  ("recipient_id", "status") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_partnership_retailer" ON "retailer_recipient_partnership"  ("retailer_id", "status") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_partnership_pair" ON "retailer_recipient_partnership"  ("retailer_id", "recipient_id") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."retailer_business_type" AS ENUM('SUPERMARKET', 'HYPERMARKET', 'RESTAURANT', 'HOTEL', 'BAKERY', 'CATERING', 'DISTRIBUTOR', 'MANUFACTURER', 'FARM', 'CORPORATE_CAFETERIA', 'CONVENIENCE_STORE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."profile_status" AS ENUM('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "retailer" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "legal_name" character varying(200) NOT NULL, "trade_name" character varying(200), "tax_id" character varying(40) NOT NULL, "business_type" "public"."retailer_business_type" NOT NULL, "description" text, "website" character varying(255), "logo_url" character varying(255), "status" "public"."profile_status" NOT NULL DEFAULT 'PENDING_VERIFICATION', "verified_at" TIMESTAMP WITH TIME ZONE, "verified_by" uuid, "food_safety_license_number" character varying(80), "food_safety_license_expires_at" date, "terms_accepted_at" TIMESTAMP WITH TIME ZONE, "terms_version" character varying(20), CONSTRAINT "PK_47bbf48e11e51cc7366f88a8add" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_retailer_status" ON "retailer"  ("status") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_retailer_tax_id" ON "retailer"  ("tax_id") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_category" AS ENUM('BAKERY', 'DAIRY', 'PRODUCE', 'PANTRY', 'MEAT', 'BEVERAGE', 'BABY_CARE', 'DELI', 'PREPARED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."unit_of_measure" AS ENUM('UNIT', 'PACK', 'CRATE', 'BOX', 'KG')`,
    );
    await queryRunner.query(
      `CREATE TABLE "product" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "retailer_id" uuid NOT NULL, "barcode" character varying(14), "name" character varying(200) NOT NULL, "brand" character varying(120), "default_department" character varying(120), "category" "public"."product_category" NOT NULL, "image_url" character varying(500), "default_unit" "public"."unit_of_measure", "average_unit_weight_kg" numeric(8,3), CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_product_retailer_category" ON "product"  ("retailer_id", "category") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_product_barcode" ON "product"  ("retailer_id", "barcode") WHERE deleted_at IS NULL AND barcode IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."donation_reason" AS ENUM('NEAR_EXPIRY', 'DAMAGED_PACKAGING', 'SURPLUS_STOCK', 'AESTHETIC_IMPERFECTION')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_item_status" AS ENUM('IN_INVENTORY', 'RESERVED', 'DONATED', 'WITHDRAWN', 'EXPIRED')`,
    );
    await queryRunner.query(`CREATE TABLE "inventory_item" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "location_id" uuid NOT NULL, "product_id" uuid NOT NULL, "quantity" numeric(10,3) NOT NULL, "unit" "public"."unit_of_measure" NOT NULL, "weight_kg" numeric(10,3) NOT NULL, "retail_value" numeric(10,2), "unit_price" numeric(10,2), "unit_label" character varying(20), "image_url" character varying(500), "currency" character(3) NOT NULL DEFAULT 'EUR', "expires_at" TIMESTAMP WITH TIME ZONE, "reason" "public"."donation_reason" NOT NULL, "reason_description" text, "status" "public"."inventory_item_status" NOT NULL DEFAULT 'IN_INVENTORY', "is_listed" boolean NOT NULL DEFAULT false, "donation_id" uuid, "listed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "queued_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "chk_inventory_donation" CHECK ((status IN ('RESERVED', 'DONATED') AND donation_id IS NOT NULL)
   OR (status IN ('IN_INVENTORY', 'WITHDRAWN', 'EXPIRED') AND donation_id IS NULL)), CONSTRAINT "chk_inventory_quantity" CHECK (quantity > 0 AND weight_kg >= 0), CONSTRAINT "PK_94f5cbcb5f280f2f30bd4a9fd90" PRIMARY KEY ("id"))`);
    await queryRunner.query(
      `CREATE INDEX "idx_inventory_donation" ON "inventory_item"  ("donation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inventory_product" ON "inventory_item"  ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inventory_listed" ON "inventory_item"  ("is_listed", "status", "expires_at") WHERE deleted_at IS NULL AND is_listed = true AND status = 'IN_INVENTORY'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inventory_expiry" ON "inventory_item"  ("expires_at") WHERE deleted_at IS NULL AND status = 'IN_INVENTORY'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inventory_location_status" ON "inventory_item"  ("location_id", "status") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "location_pickup_slot" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "location_id" uuid NOT NULL, "label" character varying(60) NOT NULL, "weekday" smallint, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "chk_pickup_slot_times" CHECK (end_time > start_time), CONSTRAINT "chk_pickup_slot_weekday" CHECK (weekday IS NULL OR weekday BETWEEN 1 AND 7), CONSTRAINT "PK_f0adffcbf7ddf430120c8bb92e9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pickup_slot_location" ON "location_pickup_slot"  ("location_id") WHERE deleted_at IS NULL AND is_active = true`,
    );
    await queryRunner.query(
      `CREATE TABLE "recipient_vehicle" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "recipient_id" uuid NOT NULL, "plate" character varying(20) NOT NULL, "description" character varying(120), "is_refrigerated" boolean NOT NULL DEFAULT false, "capacity_kg" numeric(10,2), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_5e2ed5d155669fe892837baa917" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_recipient_vehicle_recipient" ON "recipient_vehicle"  ("recipient_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_recipient_vehicle_plate" ON "recipient_vehicle"  ("recipient_id", "plate") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "donation_line" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "donation_id" uuid NOT NULL, "inventory_item_id" uuid, "product_name" character varying(200) NOT NULL, "brand" character varying(120), "barcode" character varying(14), "category" "public"."product_category" NOT NULL, "quantity" numeric(10,3) NOT NULL, "unit" "public"."unit_of_measure" NOT NULL, "weight_kg" numeric(10,3) NOT NULL, "retail_value" numeric(10,2), "reason" "public"."donation_reason" NOT NULL, "reason_description" text, "expires_at" TIMESTAMP WITH TIME ZONE, "unit_price" numeric(10,2), "unit_label" character varying(20), "image_url" character varying(500), CONSTRAINT "PK_238485e3f9cf3f94d612e434eea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_donation_line_item" ON "donation_line"  ("inventory_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_donation_line_donation" ON "donation_line"  ("donation_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."donation_status" AS ENUM('DRAFT', 'OFFERED', 'ACCEPTED', 'DECLINED', 'READY_FOR_PICKUP', 'DRIVER_EN_ROUTE', 'DELIVERED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."donation_origin" AS ENUM('RETAILER_OFFER', 'RECIPIENT_CLAIM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cancellation_reason_code" AS ENUM('CANNOT_MAKE_WINDOW', 'VEHICLE_BREAKDOWN', 'VEHICLE_CAPACITY_REACHED', 'STORAGE_CAPACITY_REACHED', 'STORE_LOGISTICS_DELAY', 'NO_LONGER_NEEDED', 'DRIVER_NO_SHOW', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "donation" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "code" character varying(30) NOT NULL, "retailer_id" uuid NOT NULL, "location_id" uuid NOT NULL, "recipient_id" uuid NOT NULL, "status" "public"."donation_status" NOT NULL DEFAULT 'DRAFT', "origin" "public"."donation_origin" NOT NULL DEFAULT 'RETAILER_OFFER', "recipient_vehicle_id" uuid, "driver_contact_id" uuid, "created_by_user_id" uuid, "offered_at" TIMESTAMP WITH TIME ZONE, "accepted_by_user_id" uuid, "accepted_at" TIMESTAMP WITH TIME ZONE, "declined_at" TIMESTAMP WITH TIME ZONE, "decline_reason" text, "pickup_window_start" TIMESTAMP WITH TIME ZONE, "pickup_window_end" TIMESTAMP WITH TIME ZONE, "pickup_slot_id" uuid, "confirmed_by_user_id" uuid, "completed_at" TIMESTAMP WITH TIME ZONE, "cancelled_at" TIMESTAMP WITH TIME ZONE, "cancellation_reason" text, "cancellation_reason_code" "public"."cancellation_reason_code", "cancelled_by_user_id" uuid, "line_count" smallint NOT NULL DEFAULT '0', "total_quantity" numeric(12,3) NOT NULL DEFAULT '0', "total_weight_kg" numeric(12,3) NOT NULL DEFAULT '0', "total_retail_value" numeric(12,2) NOT NULL DEFAULT '0', "currency" character(3) NOT NULL DEFAULT 'EUR', "estimated_meals" numeric(12,2), "co2_avoided_kg" numeric(12,3), "impact_factor_id" uuid, CONSTRAINT "chk_donation_pickup_window" CHECK (pickup_window_start IS NULL OR pickup_window_end IS NULL OR pickup_window_end > pickup_window_start), CONSTRAINT "chk_donation_decision" CHECK (NOT (accepted_at IS NOT NULL AND declined_at IS NOT NULL)), CONSTRAINT "chk_donation_accepted" CHECK ((accepted_at IS NULL) = (accepted_by_user_id IS NULL)), CONSTRAINT "chk_donation_completed" CHECK ((status = 'DELIVERED') = (completed_at IS NOT NULL)), CONSTRAINT "PK_25fb5a541964bc5cfc18fb13a82" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_donation_recipient_status" ON "donation"  ("recipient_id", "status", "created_at") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_donation_location_status" ON "donation"  ("location_id", "status", "created_at") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_donation_code" ON "donation"  ("code") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."location_type" AS ENUM('STORE', 'WAREHOUSE', 'DISTRIBUTION_CENTER', 'KITCHEN', 'OFFICE', 'PICKUP_POINT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "location" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "retailer_id" uuid, "recipient_id" uuid, "label" character varying(150) NOT NULL, "code" character varying(40), "type" "public"."location_type" NOT NULL, "store_format" character varying(80), "address_line1" character varying(200) NOT NULL, "address_line2" character varying(200), "city" character varying(100) NOT NULL, "neighborhood" character varying(120), "state" character varying(100), "postal_code" character varying(20), "country_code" character(2) NOT NULL, "latitude" numeric(9,6), "longitude" numeric(10,6), "timezone" character varying(50) NOT NULL, "opening_hours" jsonb, "pickup_windows" jsonb, "access_instructions" text, "has_cold_storage" boolean NOT NULL DEFAULT false, "has_freezer" boolean NOT NULL DEFAULT false, "phone" character varying(30), "is_primary" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "chk_location_owner" CHECK (num_nonnulls(retailer_id, recipient_id) = 1), CONSTRAINT "PK_876d7bdba03c72251ec4c2dc827" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_location_code_retailer" ON "location"  ("retailer_id", "code") WHERE deleted_at IS NULL AND retailer_id IS NOT NULL AND code IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_location_geo" ON "location"  ("latitude", "longitude") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_location_primary_recipient" ON "location"  ("recipient_id") WHERE is_primary AND recipient_id IS NOT NULL AND deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_location_primary_retailer" ON "location"  ("retailer_id") WHERE is_primary AND retailer_id IS NOT NULL AND deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_location_recipient" ON "location"  ("recipient_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_location_retailer" ON "location"  ("retailer_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."contact_type" AS ENUM('PRIMARY', 'OPERATIONS', 'LOGISTICS', 'BILLING', 'DRIVER', 'EMERGENCY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "contact" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "retailer_id" uuid, "recipient_id" uuid, "full_name" character varying(150) NOT NULL, "email" citext, "phone" character varying(30), "secondary_phone" character varying(30), "job_title" character varying(100), "type" "public"."contact_type" NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, "notes" text, "user_id" uuid, "location_id" uuid, CONSTRAINT "chk_contact_owner" CHECK (num_nonnulls(retailer_id, recipient_id) = 1), CONSTRAINT "PK_2cbbe00f59ab6b3bb5b8d19f989" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_contact_user" ON "contact"  ("user_id") WHERE deleted_at IS NULL AND user_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_contact_primary_recipient" ON "contact"  ("recipient_id") WHERE is_primary AND recipient_id IS NOT NULL AND deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_contact_primary_retailer" ON "contact"  ("retailer_id") WHERE is_primary AND retailer_id IS NOT NULL AND deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_contact_location" ON "contact"  ("location_id") WHERE deleted_at IS NULL AND location_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_contact_recipient" ON "contact"  ("recipient_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_contact_retailer" ON "contact"  ("retailer_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."recipient_type" AS ENUM('NGO', 'FOOD_BANK', 'SOUP_KITCHEN', 'SHELTER', 'COMMUNITY_FRIDGE', 'CHURCH', 'SCHOOL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."urgency_threshold" AS ENUM('ALL', 'CRITICAL_EXPIRING', 'CRITICAL_ONLY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "recipient" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "type" "public"."recipient_type" NOT NULL, "legal_name" character varying(200), "display_name" character varying(200) NOT NULL, "short_name" character varying(80), "tax_id" character varying(40), "registration_code" character varying(40), "mission" text, "service_area" character varying(120), "website" character varying(255), "logo_url" character varying(255), "status" "public"."profile_status" NOT NULL DEFAULT 'PENDING_VERIFICATION', "verified_at" TIMESTAMP WITH TIME ZONE, "verified_by" uuid, "food_handling_certification_number" character varying(80), "certification_expires_at" date, "terms_accepted_at" TIMESTAMP WITH TIME ZONE, "terms_version" character varying(20), "timezone" character varying(50) NOT NULL DEFAULT 'Europe/Madrid', "alert_radius_km" numeric(4,1) NOT NULL DEFAULT '5', "urgency_threshold" "public"."urgency_threshold" NOT NULL DEFAULT 'ALL', "push_notifications_enabled" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_9f7a695711b2055e3c8d5cfcfa1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_recipient_registration_code" ON "recipient"  ("registration_code") WHERE deleted_at IS NULL AND registration_code IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_recipient_status" ON "recipient"  ("status") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_recipient_tax_id" ON "recipient"  ("tax_id") WHERE deleted_at IS NULL AND tax_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'RETAILER', 'RECIPIENT')`,
    );
    await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "email" citext NOT NULL, "password_hash" character varying(255) NOT NULL, "role" "public"."user_role" NOT NULL, "retailer_id" uuid, "recipient_id" uuid, "is_active" boolean NOT NULL DEFAULT true, "email_verified_at" TIMESTAMP WITH TIME ZONE, "last_login_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "chk_user_role_profile" CHECK ((role = 'RETAILER'  AND retailer_id  IS NOT NULL AND recipient_id IS NULL)
   OR (role = 'RECIPIENT' AND recipient_id IS NOT NULL AND retailer_id  IS NULL)
   OR (role = 'ADMIN'     AND retailer_id  IS NULL     AND recipient_id IS NULL)), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
    await queryRunner.query(
      `CREATE INDEX "idx_user_recipient" ON "user"  ("recipient_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_retailer" ON "user"  ("retailer_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_user_email" ON "user"  ("email") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "pickup_token" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "donation_id" uuid NOT NULL, "code" character varying(60) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "consumed_at" TIMESTAMP WITH TIME ZONE, "consumed_by_user_id" uuid, "pin" character varying(8) NOT NULL, CONSTRAINT "PK_053539aecf2db75945cffb17549" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_pickup_token_pin_open" ON "pickup_token"  ("pin") WHERE consumed_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pickup_token_open" ON "pickup_token"  ("donation_id") WHERE consumed_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_pickup_token_code" ON "pickup_token"  ("code") `,
    );
    await queryRunner.query(
      `ALTER TABLE "invalid_token" ADD CONSTRAINT "FK_cd8757dd7316d71e0869f50e177" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_receipt" ADD CONSTRAINT "FK_95765058f3c5351246cd4b15c39" FOREIGN KEY ("donation_id") REFERENCES "donation"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_receipt" ADD CONSTRAINT "FK_580a936b0ba827c06e300360b6d" FOREIGN KEY ("impact_factor_id") REFERENCES "impact_factor"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "retailer_recipient_partnership" ADD CONSTRAINT "FK_855918eb8f47016b25ef31f7e7f" FOREIGN KEY ("retailer_id") REFERENCES "retailer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "retailer_recipient_partnership" ADD CONSTRAINT "FK_0c4fc8057142d4560e52b8b9906" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "retailer" ADD CONSTRAINT "FK_1c196b38bd1218cb7aee8229a4e" FOREIGN KEY ("verified_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_63207ac6d90925ab8a36be79acb" FOREIGN KEY ("retailer_id") REFERENCES "retailer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item" ADD CONSTRAINT "FK_b942344fe23484bcab6ef40fda4" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item" ADD CONSTRAINT "FK_b70c6bca6b0d4605c55182660a7" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item" ADD CONSTRAINT "FK_85d73dbc35d44ccac365ffa2600" FOREIGN KEY ("donation_id") REFERENCES "donation"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_pickup_slot" ADD CONSTRAINT "FK_cfd9050298efca395d8580ce01c" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipient_vehicle" ADD CONSTRAINT "FK_1adcb9c7a9dd5d1b1116bb65bb0" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_line" ADD CONSTRAINT "FK_34ec4f7ed08ad8e71cde4fb9a65" FOREIGN KEY ("donation_id") REFERENCES "donation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_line" ADD CONSTRAINT "FK_99dc09547a64d6022ada98ecf3d" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_bb2b6ff7b913b0c61abfeda6459" FOREIGN KEY ("retailer_id") REFERENCES "retailer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_05107abb6c90813621f6bbf7772" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_f42edc5870039849f1b9694bd76" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_d958b0ca187c6e73e70697f3de9" FOREIGN KEY ("recipient_vehicle_id") REFERENCES "recipient_vehicle"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_f3b0c4603c2c227abbe110dfe96" FOREIGN KEY ("driver_contact_id") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_d4b365d1557c6d0118797c92852" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_0d89849dcc5dcb5ef5c0e957e3f" FOREIGN KEY ("accepted_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_985a8be93ce7a381d8ac7390c94" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_6bcd3218230a88c05b6ebe6bf0b" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_d3d8cebdd22225c204fe10d0224" FOREIGN KEY ("pickup_slot_id") REFERENCES "location_pickup_slot"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" ADD CONSTRAINT "FK_4d9babb64f7a5e728d515e9fe32" FOREIGN KEY ("impact_factor_id") REFERENCES "impact_factor"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location" ADD CONSTRAINT "FK_72bae6acde66aac4ea946f2df0c" FOREIGN KEY ("retailer_id") REFERENCES "retailer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location" ADD CONSTRAINT "FK_47b13c597d8c0f9c7e0ab99209c" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact" ADD CONSTRAINT "FK_253d7ecb177de805629f3034176" FOREIGN KEY ("retailer_id") REFERENCES "retailer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact" ADD CONSTRAINT "FK_328f38e58b490932d0997603052" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact" ADD CONSTRAINT "FK_33d4fc93803e7192e150216fffb" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact" ADD CONSTRAINT "FK_d1bd96773f6a846cbd490237d9b" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipient" ADD CONSTRAINT "FK_34ce548ce7ce253189f1a4aa644" FOREIGN KEY ("verified_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_8d31761ea7b4274d091f7d9d7cc" FOREIGN KEY ("retailer_id") REFERENCES "retailer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_b381ecc71ea7febddda52d418f6" FOREIGN KEY ("recipient_id") REFERENCES "recipient"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pickup_token" ADD CONSTRAINT "FK_7cf9a5d16e53d825d9365dd275e" FOREIGN KEY ("donation_id") REFERENCES "donation"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pickup_token" ADD CONSTRAINT "FK_dbc01110dfb27f8b31b2f969a94" FOREIGN KEY ("consumed_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pickup_token" DROP CONSTRAINT "FK_dbc01110dfb27f8b31b2f969a94"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pickup_token" DROP CONSTRAINT "FK_7cf9a5d16e53d825d9365dd275e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_b381ecc71ea7febddda52d418f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_8d31761ea7b4274d091f7d9d7cc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipient" DROP CONSTRAINT "FK_34ce548ce7ce253189f1a4aa644"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact" DROP CONSTRAINT "FK_d1bd96773f6a846cbd490237d9b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact" DROP CONSTRAINT "FK_33d4fc93803e7192e150216fffb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact" DROP CONSTRAINT "FK_328f38e58b490932d0997603052"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contact" DROP CONSTRAINT "FK_253d7ecb177de805629f3034176"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location" DROP CONSTRAINT "FK_47b13c597d8c0f9c7e0ab99209c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location" DROP CONSTRAINT "FK_72bae6acde66aac4ea946f2df0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_4d9babb64f7a5e728d515e9fe32"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_d3d8cebdd22225c204fe10d0224"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_6bcd3218230a88c05b6ebe6bf0b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_985a8be93ce7a381d8ac7390c94"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_0d89849dcc5dcb5ef5c0e957e3f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_d4b365d1557c6d0118797c92852"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_f3b0c4603c2c227abbe110dfe96"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_d958b0ca187c6e73e70697f3de9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_f42edc5870039849f1b9694bd76"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_05107abb6c90813621f6bbf7772"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation" DROP CONSTRAINT "FK_bb2b6ff7b913b0c61abfeda6459"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_line" DROP CONSTRAINT "FK_99dc09547a64d6022ada98ecf3d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_line" DROP CONSTRAINT "FK_34ec4f7ed08ad8e71cde4fb9a65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipient_vehicle" DROP CONSTRAINT "FK_1adcb9c7a9dd5d1b1116bb65bb0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_pickup_slot" DROP CONSTRAINT "FK_cfd9050298efca395d8580ce01c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item" DROP CONSTRAINT "FK_85d73dbc35d44ccac365ffa2600"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item" DROP CONSTRAINT "FK_b70c6bca6b0d4605c55182660a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_item" DROP CONSTRAINT "FK_b942344fe23484bcab6ef40fda4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_63207ac6d90925ab8a36be79acb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "retailer" DROP CONSTRAINT "FK_1c196b38bd1218cb7aee8229a4e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "retailer_recipient_partnership" DROP CONSTRAINT "FK_0c4fc8057142d4560e52b8b9906"`,
    );
    await queryRunner.query(
      `ALTER TABLE "retailer_recipient_partnership" DROP CONSTRAINT "FK_855918eb8f47016b25ef31f7e7f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_receipt" DROP CONSTRAINT "FK_580a936b0ba827c06e300360b6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "donation_receipt" DROP CONSTRAINT "FK_95765058f3c5351246cd4b15c39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invalid_token" DROP CONSTRAINT "FK_cd8757dd7316d71e0869f50e177"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_pickup_token_code"`);
    await queryRunner.query(`DROP INDEX "public"."idx_pickup_token_open"`);
    await queryRunner.query(`DROP INDEX "public"."uq_pickup_token_pin_open"`);
    await queryRunner.query(`DROP TABLE "pickup_token"`);
    await queryRunner.query(`DROP INDEX "public"."uq_user_email"`);
    await queryRunner.query(`DROP INDEX "public"."idx_user_retailer"`);
    await queryRunner.query(`DROP INDEX "public"."idx_user_recipient"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
    await queryRunner.query(`DROP INDEX "public"."uq_recipient_tax_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_recipient_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."uq_recipient_registration_code"`,
    );
    await queryRunner.query(`DROP TABLE "recipient"`);
    await queryRunner.query(`DROP TYPE "public"."urgency_threshold"`);
    await queryRunner.query(`DROP TYPE "public"."recipient_type"`);
    await queryRunner.query(`DROP INDEX "public"."idx_contact_retailer"`);
    await queryRunner.query(`DROP INDEX "public"."idx_contact_recipient"`);
    await queryRunner.query(`DROP INDEX "public"."idx_contact_location"`);
    await queryRunner.query(
      `DROP INDEX "public"."uq_contact_primary_retailer"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_contact_primary_recipient"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_contact_user"`);
    await queryRunner.query(`DROP TABLE "contact"`);
    await queryRunner.query(`DROP TYPE "public"."contact_type"`);
    await queryRunner.query(`DROP INDEX "public"."idx_location_retailer"`);
    await queryRunner.query(`DROP INDEX "public"."idx_location_recipient"`);
    await queryRunner.query(
      `DROP INDEX "public"."uq_location_primary_retailer"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_location_primary_recipient"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_location_geo"`);
    await queryRunner.query(`DROP INDEX "public"."uq_location_code_retailer"`);
    await queryRunner.query(`DROP TABLE "location"`);
    await queryRunner.query(`DROP TYPE "public"."location_type"`);
    await queryRunner.query(`DROP INDEX "public"."uq_donation_code"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_donation_location_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_donation_recipient_status"`,
    );
    await queryRunner.query(`DROP TABLE "donation"`);
    await queryRunner.query(`DROP TYPE "public"."cancellation_reason_code"`);
    await queryRunner.query(`DROP TYPE "public"."donation_origin"`);
    await queryRunner.query(`DROP TYPE "public"."donation_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_donation_line_donation"`);
    await queryRunner.query(`DROP INDEX "public"."idx_donation_line_item"`);
    await queryRunner.query(`DROP TABLE "donation_line"`);
    await queryRunner.query(`DROP INDEX "public"."uq_recipient_vehicle_plate"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_recipient_vehicle_recipient"`,
    );
    await queryRunner.query(`DROP TABLE "recipient_vehicle"`);
    await queryRunner.query(`DROP INDEX "public"."idx_pickup_slot_location"`);
    await queryRunner.query(`DROP TABLE "location_pickup_slot"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_inventory_location_status"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_inventory_expiry"`);
    await queryRunner.query(`DROP INDEX "public"."idx_inventory_listed"`);
    await queryRunner.query(`DROP INDEX "public"."idx_inventory_product"`);
    await queryRunner.query(`DROP INDEX "public"."idx_inventory_donation"`);
    await queryRunner.query(`DROP TABLE "inventory_item"`);
    await queryRunner.query(`DROP TYPE "public"."inventory_item_status"`);
    await queryRunner.query(`DROP TYPE "public"."donation_reason"`);
    await queryRunner.query(`DROP INDEX "public"."uq_product_barcode"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_product_retailer_category"`,
    );
    await queryRunner.query(`DROP TABLE "product"`);
    await queryRunner.query(`DROP TYPE "public"."unit_of_measure"`);
    await queryRunner.query(`DROP TYPE "public"."product_category"`);
    await queryRunner.query(`DROP INDEX "public"."uq_retailer_tax_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_retailer_status"`);
    await queryRunner.query(`DROP TABLE "retailer"`);
    await queryRunner.query(`DROP TYPE "public"."profile_status"`);
    await queryRunner.query(`DROP TYPE "public"."retailer_business_type"`);
    await queryRunner.query(`DROP INDEX "public"."uq_partnership_pair"`);
    await queryRunner.query(`DROP INDEX "public"."idx_partnership_retailer"`);
    await queryRunner.query(`DROP INDEX "public"."idx_partnership_recipient"`);
    await queryRunner.query(`DROP TABLE "retailer_recipient_partnership"`);
    await queryRunner.query(`DROP TYPE "public"."partnership_status"`);
    await queryRunner.query(`DROP INDEX "public"."uq_receipt_number"`);
    await queryRunner.query(`DROP TABLE "donation_receipt"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_impact_factor_effective"`,
    );
    await queryRunner.query(`DROP TABLE "impact_factor"`);
    await queryRunner.query(`DROP INDEX "public"."uq_invalid_token_jti"`);
    await queryRunner.query(`DROP INDEX "public"."idx_invalid_token_user"`);
    await queryRunner.query(`DROP INDEX "public"."idx_invalid_token_expires"`);
    await queryRunner.query(`DROP TABLE "invalid_token"`);
    await queryRunner.query(`DROP TYPE "public"."invalid_token_reason"`);
  }
}
