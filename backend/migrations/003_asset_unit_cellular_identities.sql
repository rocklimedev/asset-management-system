-- Migration: Store multiple IMEI / SIM entries on each physical asset unit.
-- Select the target MySQL database before running this file.
-- Requires asset_units from migration 001. Run before deploying the new model.
-- Safe to re-run; also safe after running npm run migrate:cellular.
-- Existing serial_number values and asset assignments are preserved.
-- Existing units retain NULL until identifiers are saved by the application.
-- This column is optional for EVERY category. Non-cellular assets need no data.
-- Do not infer IMEI/SIM values from serial numbers, unit codes, notes, or IDs.
-- No INSERT, UPDATE, DELETE, category conversion, or inventory reconciliation
-- is performed by this migration. Do not re-run migration 001 for this change.
--
-- Reviewed export: 71 units / 54 asset IDs; 42 ASSIGNED, 26 AVAILABLE,
-- 3 DAMAGED; all serial_number values NULL. These counts are informational:
-- compare against the current database snapshot, not a hard-coded row count.
--
-- Run the WHOLE file in ONE connection with application writes paused so the
-- verification compares a stable dataset. Take a database backup beforehand.
-- MySQL ALTER TABLE implicitly commits; wrapping it in BEGIN does not provide
-- rollback. The temporary snapshot below is for verification, not recovery.
-- The connection must permit CREATE TEMPORARY TABLES and ALTER TABLE.
-- Example cellular_identities JSON (identifiers remain strings):
-- [
--   {"imei":"123456789012345","simNumber":"001234567890"},
--   {"imei":"987654321098765","simNumber":"+919876543210"}
-- ]

-- 1. Capture every original column, preserving NULLs and timestamps.
-- If no database is selected or asset_units is absent, this statement fails;
-- configure the SQL client to stop on errors (do not use mysql --force).
SELECT DATABASE() AS target_database;

CREATE TEMPORARY TABLE `migration_003_asset_units_before` AS
SELECT `id`, `asset_id`, `unit_code`, `serial_number`, `status`, `condition`,
       `location_id`, `notes`, `createdAt`, `updatedAt`
FROM `asset_units`;

SET @migration_003_units_before = (
  SELECT COUNT(*) FROM `migration_003_asset_units_before`
);

SELECT COUNT(*) AS units_before,
       COUNT(DISTINCT asset_id) AS assets_before,
       SUM(status = 'ASSIGNED') AS assigned_before,
       SUM(status = 'AVAILABLE') AS available_before,
       SUM(status = 'DAMAGED') AS damaged_before
FROM `migration_003_asset_units_before`;

-- 2. Add nullable storage only. Existing rows get SQL NULL, not fabricated
-- identifiers or empty objects. If the column already exists, leave it intact.
SET @cellular_identities_column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'asset_units'
    AND COLUMN_NAME = 'cellular_identities'
);

SET @cellular_identities_migration_sql = IF(
  @cellular_identities_column_exists = 0,
  'ALTER TABLE `asset_units` ADD COLUMN `cellular_identities` JSON NULL',
  'SELECT ''cellular_identities already exists'' AS migration_status'
);

PREPARE cellular_identities_migration FROM @cellular_identities_migration_sql;
EXECUTE cellular_identities_migration;
DEALLOCATE PREPARE cellular_identities_migration;

-- 3. Verify the resulting column definition: expect json / YES.
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'asset_units'
  AND COLUMN_NAME = 'cellular_identities';

-- 4. Verify all original rows and values with NULL-safe comparisons.
-- Expect unchanged_original_rows = units_before and all three *_rows = 0.
-- A nonzero result means verification failed; investigate before deployment.
-- Concurrent application writes can also cause differences, hence the pause.
SELECT
  @migration_003_units_before AS units_before,
  (SELECT COUNT(*) FROM `asset_units`) AS units_after,
  COUNT(CASE WHEN u.id IS NOT NULL
    AND (u.asset_id <=> b.asset_id)
    AND (BINARY u.unit_code <=> BINARY b.unit_code)
    AND (BINARY u.serial_number <=> BINARY b.serial_number)
    AND (BINARY u.status <=> BINARY b.status)
    AND (BINARY u.condition <=> BINARY b.condition)
    AND (u.location_id <=> b.location_id)
    AND (BINARY u.notes <=> BINARY b.notes)
    AND (u.createdAt <=> b.createdAt)
    AND (u.updatedAt <=> b.updatedAt)
    THEN 1 END) AS unchanged_original_rows,
  COUNT(CASE WHEN u.id IS NULL THEN 1 END) AS missing_original_rows,
  COUNT(CASE WHEN u.id IS NOT NULL AND NOT (
    (u.asset_id <=> b.asset_id)
    AND (BINARY u.unit_code <=> BINARY b.unit_code)
    AND (BINARY u.serial_number <=> BINARY b.serial_number)
    AND (BINARY u.status <=> BINARY b.status)
    AND (BINARY u.condition <=> BINARY b.condition)
    AND (u.location_id <=> b.location_id)
    AND (BINARY u.notes <=> BINARY b.notes)
    AND (u.createdAt <=> b.createdAt)
    AND (u.updatedAt <=> b.updatedAt)
    ) THEN 1 END) AS changed_original_rows
FROM `migration_003_asset_units_before` b
LEFT JOIN `asset_units` u ON u.id = b.id;

-- Separate query because MySQL permits only one reference to a temporary
-- table per query. Expect added_rows = 0.
SELECT COUNT(*) AS added_rows
FROM `asset_units` n
WHERE NOT EXISTS (
  SELECT 1 FROM `migration_003_asset_units_before` old_unit
  WHERE old_unit.id = n.id
);

-- First run: expect 0. Re-runs may show identifiers already saved by users;
-- those existing identifiers are deliberately preserved.
SELECT COUNT(*) AS units_with_cellular_data
FROM `asset_units`
WHERE `cellular_identities` IS NOT NULL;

DROP TEMPORARY TABLE `migration_003_asset_units_before`;
