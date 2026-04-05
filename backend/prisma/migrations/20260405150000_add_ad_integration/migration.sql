-- Migration: add_ad_integration
-- Add AD columns to users table
ALTER TABLE "users" ADD COLUMN "ad_sid" TEXT;
ALTER TABLE "users" ADD COLUMN "ad_guid" TEXT;
ALTER TABLE "users" ADD COLUMN "ad_source" TEXT;
ALTER TABLE "users" ADD COLUMN "ad_last_sync_at" TIMESTAMP(3);

-- Create unique index on ad_sid
CREATE UNIQUE INDEX "users_ad_sid_key" ON "users"("ad_sid");

-- Create school_ad_configs table
CREATE TABLE "school_ad_configs" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "domain_controller" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 636,
    "base_dn" TEXT NOT NULL,
    "bind_dn" TEXT NOT NULL,
    "bind_password" TEXT NOT NULL,
    "use_ldaps" BOOLEAN NOT NULL DEFAULT true,
    "teacher_group_dns" JSONB NOT NULL DEFAULT '[]',
    "user_filter" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "last_sync_status" TEXT,
    "last_sync_users_count" INTEGER NOT NULL DEFAULT 0,
    "last_sync_errors" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_ad_configs_pkey" PRIMARY KEY ("id")
);

-- Create ad_sync_logs table
CREATE TABLE "ad_sync_logs" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "users_found" INTEGER NOT NULL DEFAULT 0,
    "users_created" INTEGER NOT NULL DEFAULT 0,
    "users_updated" INTEGER NOT NULL DEFAULT 0,
    "users_skipped" INTEGER NOT NULL DEFAULT 0,
    "users_failed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB DEFAULT '[]',
    "queued" BOOLEAN NOT NULL DEFAULT false,
    "retry_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ad_sync_logs_pkey" PRIMARY KEY ("id")
);

-- Create index
CREATE UNIQUE INDEX "school_ad_configs_institution_id_key" ON "school_ad_configs"("institution_id");

-- Add foreign keys
ALTER TABLE "school_ad_configs" ADD CONSTRAINT "school_ad_configs_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ad_sync_logs" ADD CONSTRAINT "ad_sync_logs_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "school_ad_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
