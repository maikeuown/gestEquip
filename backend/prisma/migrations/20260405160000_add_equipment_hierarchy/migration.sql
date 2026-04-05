-- Migration: add_equipment_hierarchy
-- Adds parent_id self-relation and category enum to equipment table

-- 1. Add columns
ALTER TABLE "equipment" ADD COLUMN "parent_id" TEXT;
ALTER TABLE "equipment" ADD COLUMN "category" TEXT;

-- 2. Create the enum type (if not exists)
DO $$ BEGIN
  CREATE TYPE "EquipCategory" AS ENUM (
    'DESKTOP', 'MONITOR', 'MOUSE', 'KEYBOARD',
    'PRINTER', 'PROJECTOR', 'SERVER', 'NETWORK', 'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Convert column to enum type
ALTER TABLE "equipment" ALTER COLUMN "category" TYPE "EquipCategory" USING "category"::"EquipCategory";

-- 4. Backfill: set category to DESKTOP for all existing equipment (parent_id stays NULL)
UPDATE "equipment" SET "category" = 'DESKTOP' WHERE "category" IS NULL AND "deleted_at" IS NULL;

-- 5. Add foreign key constraint with ON DELETE CASCADE
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "equipment"("id") ON DELETE CASCADE;

-- 6. Add index for faster lookups of children
CREATE INDEX IF NOT EXISTS "equipment_parent_id_idx" ON "equipment"("parent_id");
