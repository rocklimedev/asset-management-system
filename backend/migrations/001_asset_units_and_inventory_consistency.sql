-- Migration: Ensure AssetUnit allocation support and inventory consistency
-- Run against the target MySQL database before deploying the updated services.
-- Safe to re-run (uses IF NOT EXISTS / conditional checks where possible).

-- ============================================================
-- 1. asset_units table
-- ============================================================
CREATE TABLE IF NOT EXISTS `asset_units` (
  `id` CHAR(36) NOT NULL,
  `asset_id` CHAR(36) NOT NULL,
  `unit_code` VARCHAR(255) NULL,
  `serial_number` VARCHAR(255) NULL,
  `status` ENUM('AVAILABLE','ASSIGNED','REPAIR','LOST','DAMAGED','RETIRED','DISPOSED') NOT NULL DEFAULT 'AVAILABLE',
  `condition` ENUM('NEW','GOOD','FAIR','POOR') NOT NULL DEFAULT 'GOOD',
  `location_id` CHAR(36) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_units_unit_code_unique` (`unit_code`),
  UNIQUE KEY `asset_units_serial_number_unique` (`serial_number`),
  KEY `asset_units_asset_id_idx` (`asset_id`),
  KEY `asset_units_status_idx` (`status`),
  KEY `asset_units_condition_idx` (`condition`),
  KEY `asset_units_location_id_idx` (`location_id`),
  CONSTRAINT `asset_units_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Ensure asset_assignments has asset_unit_id (nullable for legacy)
-- ============================================================
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'asset_assignments'
    AND COLUMN_NAME = 'asset_unit_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `asset_assignments` ADD COLUMN `asset_unit_id` CHAR(36) NULL AFTER `asset_id`, ADD INDEX `asset_assignments_asset_unit_id_idx` (`asset_unit_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FK if missing (best-effort)
SET @fk_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'asset_assignments'
    AND CONSTRAINT_NAME = 'asset_assignments_asset_unit_id_fkey'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `asset_assignments` ADD CONSTRAINT `asset_assignments_asset_unit_id_fkey` FOREIGN KEY (`asset_unit_id`) REFERENCES `asset_units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- 3. assets.tracking_mode and quantityAssigned (if missing)
-- ============================================================
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'assets'
    AND COLUMN_NAME = 'tracking_mode'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `assets` ADD COLUMN `tracking_mode` ENUM(''INDIVIDUAL'',''QUANTITY'') NOT NULL DEFAULT ''QUANTITY'' AFTER `quantity`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'assets'
    AND COLUMN_NAME = 'quantityAssigned'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `assets` ADD COLUMN `quantityAssigned` INT NOT NULL DEFAULT 0 AFTER `quantity`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- 4. inventory_history table
-- ============================================================
CREATE TABLE IF NOT EXISTS `inventory_history` (
  `id` CHAR(36) NOT NULL,
  `asset_id` CHAR(36) NOT NULL,
  `changeType` ENUM('RESTOCK','CONSUMED','WRITE_OFF','ADJUSTMENT','ASSIGNED','RETURNED') NOT NULL,
  `quantityDelta` INT NOT NULL DEFAULT 0,
  `quantity_after` INT NOT NULL,
  `quantity_assigned_after` INT NOT NULL,
  `performedBy` VARCHAR(255) NOT NULL,
  `reason` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `inventory_history_asset_id_idx` (`asset_id`),
  KEY `inventory_history_changeType_idx` (`changeType`),
  CONSTRAINT `inventory_history_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Backfill: create AssetUnits for existing assets that have none
--    (one unit per quantity, status derived from asset status)
-- ============================================================
-- NOTE: This is a one-time data migration helper. Review before running on production.
-- Uncomment and adapt as needed:
/*
INSERT INTO asset_units (id, asset_id, unit_code, status, `condition`, location_id, createdAt, updatedAt)
SELECT
  UUID() AS id,
  a.id AS asset_id,
  CONCAT(COALESCE(a.assetTag, 'UNIT'), '-', LPAD(seq.n, 3, '0')) AS unit_code,
  CASE
    WHEN a.status = 'ASSIGNED' AND seq.n = 1 THEN 'ASSIGNED'
    WHEN a.status IN ('REPAIR','LOST','DAMAGED','RETIRED','DISPOSED') AND seq.n = 1 THEN a.status
    ELSE 'AVAILABLE'
  END AS status,
  COALESCE(a.`condition`, 'GOOD') AS `condition`,
  a.location_id,
  NOW(),
  NOW()
FROM assets a
CROSS JOIN (
  SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
  -- extend if higher quantities exist
) seq
WHERE seq.n <= GREATEST(COALESCE(a.quantity, 1), 1)
  AND NOT EXISTS (SELECT 1 FROM asset_units u WHERE u.asset_id = a.id)
  AND a.kind = 'HARDWARE';
*/

-- ============================================================
-- 6. Sync quantityAssigned from unit statuses (safe re-run)
-- ============================================================
UPDATE assets a
SET a.quantityAssigned = (
  SELECT COUNT(*) FROM asset_units u
  WHERE u.asset_id = a.id AND u.status = 'ASSIGNED'
)
WHERE EXISTS (SELECT 1 FROM asset_units u WHERE u.asset_id = a.id);

