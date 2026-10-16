-- --------------------------------------------------------
-- Host:                         119.18.54.11
-- Server version:               5.7.23-23 - Percona Server (GPL), Release 23, Revision 500fcf5
-- Server OS:                    Linux
-- HeidiSQL Version:             12.17.0.7270
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for spsyn8lm_asset_management
CREATE DATABASE IF NOT EXISTS `spsyn8lm_asset_management` /*!40100 DEFAULT CHARACTER SET utf8 COLLATE utf8_unicode_ci */;
USE `spsyn8lm_asset_management`;

-- Dumping structure for table spsyn8lm_asset_management.asset_assignments
CREATE TABLE IF NOT EXISTS `asset_assignments` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_unit_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `system_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assignedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `returnedAt` datetime DEFAULT NULL,
  `assigned_by` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ACTIVE','RETURNED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_asset_assignments_asset_id` (`asset_id`),
  KEY `idx_asset_assignments_employee_id` (`employee_id`),
  KEY `idx_asset_assignments_status` (`status`),
  KEY `fk_asset_assignments_assigned_by` (`assigned_by`),
  KEY `idx_asset_assignments_system_id` (`system_id`),
  KEY `idx_asset_assignments_asset_unit_id` (`asset_unit_id`) USING BTREE,
  CONSTRAINT `fk_asset_assignments_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_assignments_asset_unit` FOREIGN KEY (`asset_unit_id`) REFERENCES `asset_units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_assignments_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_assignments_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_assignments_system` FOREIGN KEY (`system_id`) REFERENCES `systems` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.asset_categories
CREATE TABLE IF NOT EXISTS `asset_categories` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `type` enum('HARDWARE','SOFTWARE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `organisation_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asset_categories_type` (`type`),
  KEY `idx_asset_categories_organisation_id` (`organisation_id`),
  KEY `idx_asset_categories_isActive` (`isActive`),
  CONSTRAINT `fk_asset_categories_organisation` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.asset_history
CREATE TABLE IF NOT EXISTS `asset_history` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_unit_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `performedBy` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fromValue` text COLLATE utf8mb4_unicode_ci,
  `toValue` text COLLATE utf8mb4_unicode_ci,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asset_history_asset_id` (`asset_id`),
  KEY `idx_asset_history_createdAt` (`createdAt`),
  KEY `idx_asset_history_asset_unit_id` (`asset_unit_id`) USING BTREE,
  CONSTRAINT `fk_asset_history_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_history_asset_unit` FOREIGN KEY (`asset_unit_id`) REFERENCES `asset_units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.asset_transfers
CREATE TABLE IF NOT EXISTS `asset_transfers` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `from_employee_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_employee_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_by_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `approved_by_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'COMPLETED',
  `reason` text COLLATE utf8mb4_unicode_ci,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `approvedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asset_transfers_asset_id` (`asset_id`),
  KEY `idx_asset_transfers_from_employee_id` (`from_employee_id`),
  KEY `idx_asset_transfers_to_employee_id` (`to_employee_id`),
  KEY `idx_asset_transfers_status` (`status`),
  KEY `idx_asset_transfers_requested_by_id` (`requested_by_id`),
  KEY `idx_asset_transfers_approved_by_id` (`approved_by_id`),
  CONSTRAINT `fk_asset_transfers_approved_by` FOREIGN KEY (`approved_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_transfers_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_transfers_from_employee` FOREIGN KEY (`from_employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_transfers_requested_by` FOREIGN KEY (`requested_by_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_transfers_to_employee` FOREIGN KEY (`to_employee_id`) REFERENCES `employees` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.asset_units
CREATE TABLE IF NOT EXISTS `asset_units` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serial_number` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('AVAILABLE','ASSIGNED','REPAIR','LOST','DAMAGED','RETIRED','DISPOSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AVAILABLE',
  `condition` enum('NEW','GOOD','FAIR','POOR') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GOOD',
  `location_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_asset_units_unit_code` (`unit_code`) USING BTREE,
  UNIQUE KEY `uq_asset_units_serial_number` (`serial_number`) USING BTREE,
  KEY `idx_asset_units_asset_id` (`asset_id`) USING BTREE,
  KEY `idx_asset_units_status` (`status`) USING BTREE,
  KEY `idx_asset_units_condition` (`condition`) USING BTREE,
  KEY `idx_asset_units_location_id` (`location_id`) USING BTREE,
  CONSTRAINT `fk_asset_units_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_units_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.assets
CREATE TABLE IF NOT EXISTS `assets` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assetTag` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kind` enum('HARDWARE','SOFTWARE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `organisation_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `manufacturer` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serialNumber` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchaseDate` datetime DEFAULT NULL,
  `purchasePrice` decimal(12,2) DEFAULT NULL,
  `vendor_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `invoiceNumber` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warrantyStart` datetime DEFAULT NULL,
  `warrantyExpiry` datetime DEFAULT NULL,
  `status` enum('AVAILABLE','ASSIGNED','REPAIR','LOST','DAMAGED','RETIRED','DISPOSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AVAILABLE',
  `condition` enum('NEW','GOOD','FAIR','POOR') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GOOD',
  `location_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `quantity` int(11) NOT NULL DEFAULT '1',
  `quantityAssigned` int(11) NOT NULL DEFAULT '0',
  `reorder_level` int(11) DEFAULT NULL,
  `image_key` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_mode` enum('INDIVIDUAL','QUANTITY') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'QUANTITY',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_assets_assetTag` (`assetTag`),
  UNIQUE KEY `uq_assets_serialNumber` (`serialNumber`),
  KEY `idx_assets_kind` (`kind`),
  KEY `idx_assets_organisation_id` (`organisation_id`),
  KEY `idx_assets_category_id` (`category_id`),
  KEY `idx_assets_vendor_id` (`vendor_id`),
  KEY `idx_assets_status` (`status`),
  KEY `idx_assets_location_id` (`location_id`),
  KEY `idx_assets_tracking_mode` (`tracking_mode`),
  CONSTRAINT `fk_assets_category` FOREIGN KEY (`category_id`) REFERENCES `asset_categories` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_assets_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_assets_organisation` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_assets_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entityId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user_id` (`user_id`),
  KEY `idx_audit_logs_createdAt` (`createdAt`),
  KEY `idx_audit_logs_entity` (`entity`),
  KEY `idx_audit_logs_entityId` (`entityId`),
  CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.departments
CREATE TABLE IF NOT EXISTS `departments` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_departments_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.employees
CREATE TABLE IF NOT EXISTS `employees` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `employeeCode` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatarUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organisation_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `designation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('ACTIVE','ON_LEAVE','INACTIVE','EXITED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `joiningDate` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employees_employeeCode` (`employeeCode`),
  UNIQUE KEY `uq_employees_email` (`email`),
  KEY `idx_employees_organisation_id` (`organisation_id`),
  KEY `idx_employees_department_id` (`department_id`),
  KEY `idx_employees_manager_id` (`manager_id`),
  KEY `idx_employees_location_id` (`location_id`),
  KEY `idx_employees_status` (`status`),
  CONSTRAINT `fk_employees_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employees_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employees_manager` FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_employees_organisation` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.inventory_history
CREATE TABLE IF NOT EXISTS `inventory_history` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changeType` enum('RESTOCK','ASSIGNED','CONSUMED','RETURNED','ADJUSTMENT','WRITE_OFF') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantityDelta` int(11) NOT NULL,
  `quantity_after` int(11) NOT NULL,
  `quantity_assigned_after` int(11) NOT NULL,
  `performedBy` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_inventory_history_asset_id` (`asset_id`) USING BTREE,
  KEY `idx_inventory_history_changeType` (`changeType`) USING BTREE,
  KEY `idx_inventory_history_createdAt` (`createdAt`) USING BTREE,
  CONSTRAINT `fk_inventory_history_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.inventory_history_backup_20260923
CREATE TABLE IF NOT EXISTS `inventory_history_backup_20260923` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changeType` enum('RESTOCK','ASSIGNED','CONSUMED','RETURNED','ADJUSTMENT','WRITE_OFF') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantityDelta` int(11) NOT NULL,
  `quantity_after` int(11) NOT NULL,
  `quantity_assigned_after` int(11) NOT NULL,
  `performedBy` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_inventory_history_asset_id` (`asset_id`) USING BTREE,
  KEY `idx_inventory_history_changeType` (`changeType`) USING BTREE,
  KEY `idx_inventory_history_createdAt` (`createdAt`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.locations
CREATE TABLE IF NOT EXISTS `locations` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organisation_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_locations_name` (`name`),
  KEY `idx_locations_organisation_id` (`organisation_id`),
  CONSTRAINT `fk_locations_organisation` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.organisations
CREATE TABLE IF NOT EXISTS `organisations` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_organisations_name` (`name`),
  UNIQUE KEY `uq_organisations_code` (`code`),
  KEY `idx_organisations_isActive` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.permissions
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.role_permissions
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_role_permissions_permission` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.software_assignments
CREATE TABLE IF NOT EXISTS `software_assignments` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `software_asset_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `system_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ACTIVE','RETURNED','REVOKED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` datetime DEFAULT NULL,
  `assigned_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_software_assignments_software_asset_id` (`software_asset_id`) USING BTREE,
  KEY `idx_software_assignments_system_id` (`system_id`) USING BTREE,
  KEY `idx_software_assignments_status` (`status`) USING BTREE,
  KEY `idx_software_assignments_assigned_by` (`assigned_by`) USING BTREE,
  CONSTRAINT `fk_software_assignments_software_asset` FOREIGN KEY (`software_asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_software_assignments_system` FOREIGN KEY (`system_id`) REFERENCES `systems` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.software_details
CREATE TABLE IF NOT EXISTS `software_details` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_software_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usage` enum('IN_USE','NOT_IN_USE','OCCASIONAL','TRIAL','BLOCKED','UNKNOWN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNKNOWN',
  `subscription_type` enum('OPEN_SOURCE','FREE','SUBSCRIPTION','PERPETUAL','TRIAL','COMPANY_LICENSE','UNKNOWN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNKNOWN',
  `warranty_applicable` tinyint(1) NOT NULL DEFAULT '0',
  `version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `edition` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publisher` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_software_details_asset_id` (`asset_id`) USING BTREE,
  KEY `idx_software_details_parent_software_id` (`parent_software_id`) USING BTREE,
  KEY `idx_software_details_usage` (`usage`) USING BTREE,
  KEY `idx_software_details_subscription_type` (`subscription_type`) USING BTREE,
  CONSTRAINT `fk_software_details_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_software_details_parent_software` FOREIGN KEY (`parent_software_id`) REFERENCES `assets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.software_license_assignments
CREATE TABLE IF NOT EXISTS `software_license_assignments` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `license_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `system_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `installation_status` enum('INSTALLED','NOT_INSTALLED','UNINSTALLED','BLOCKED','UNKNOWN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INSTALLED',
  `assignment_status` enum('ACTIVE','REMOVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `installed_at` datetime DEFAULT NULL,
  `removed_at` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_software_license_assignments_asset_id` (`asset_id`) USING BTREE,
  KEY `idx_software_license_assignments_license_id` (`license_id`) USING BTREE,
  KEY `idx_software_license_assignments_system_id` (`system_id`) USING BTREE,
  KEY `idx_software_license_assignments_installation_status` (`installation_status`) USING BTREE,
  KEY `idx_software_license_assignments_assignment_status` (`assignment_status`) USING BTREE,
  CONSTRAINT `fk_software_license_assignments_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_software_license_assignments_license` FOREIGN KEY (`license_id`) REFERENCES `software_licenses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_software_license_assignments_system` FOREIGN KEY (`system_id`) REFERENCES `systems` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.software_licenses
CREATE TABLE IF NOT EXISTS `software_licenses` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vendor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `licenseType` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `licenseReference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `totalSeats` int(11) NOT NULL DEFAULT '1',
  `assignedSeats` int(11) NOT NULL DEFAULT '0',
  `purchaseDate` datetime DEFAULT NULL,
  `expiryDate` datetime DEFAULT NULL,
  `renewalDate` datetime DEFAULT NULL,
  `cost` decimal(12,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_software_licenses_asset_id` (`asset_id`),
  KEY `idx_software_licenses_licenseReference` (`licenseReference`),
  KEY `idx_software_licenses_expiryDate` (`expiryDate`),
  KEY `idx_software_licenses_vendor` (`vendor`),
  CONSTRAINT `fk_software_licenses_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.system_specs
CREATE TABLE IF NOT EXISTS `system_specs` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `system_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `processor` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ram` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `local_storage` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `graphics_card` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motherboard` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `power_supply` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monitor` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monitor_size` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operating_system` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `os_version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cloud_storage` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cloud_storage_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cloud_storage_password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mac_address` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_system_specs_system_id` (`system_id`) USING BTREE,
  KEY `idx_system_specs_system_id` (`system_id`) USING BTREE,
  CONSTRAINT `fk_system_specs_system` FOREIGN KEY (`system_id`) REFERENCES `systems` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.systems
CREATE TABLE IF NOT EXISTS `systems` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `systemTag` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `employee_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `organisation_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_systems_systemTag` (`systemTag`),
  KEY `idx_systems_employee_id` (`employee_id`),
  KEY `idx_systems_organisation_id` (`organisation_id`) USING BTREE,
  CONSTRAINT `fk_systems_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_systems_organisation` FOREIGN KEY (`organisation_id`) REFERENCES `organisations` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ACTIVE','DISABLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `employee_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_employee_id` (`employee_id`),
  KEY `idx_users_role_id` (`role_id`),
  KEY `idx_users_employee_id` (`employee_id`),
  CONSTRAINT `fk_users_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table spsyn8lm_asset_management.vendors
CREATE TABLE IF NOT EXISTS `vendors` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vendors_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
