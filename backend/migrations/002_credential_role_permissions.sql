-- MySQL migration: bootstrap currently enforced permissions for existing roles.
-- Run in the application's database using the mysql CLI or a client supporting
-- DELIMITER. Requires CREATE ROUTINE and CREATE TEMPORARY TABLES privileges.
-- This grants access across ALL employees, not only employees in a role's team.
-- Existing grants are preserved; setting a flag to 0 does NOT revoke a grant.
-- DEVELOPER and ADMIN receive EVERY permission registered at migration time.
-- Rerun after registering future permissions to grant those as well.
-- Safe to rerun. Do not run concurrently with another permissions migration.

-- Inspect existing names before editing the mapping below:
SELECT `id`, `name` FROM `roles` ORDER BY `name`;

DROP TEMPORARY TABLE IF EXISTS `_credential_role_grants`;
CREATE TEMPORARY TABLE `_credential_role_grants` (
  `role_name` VARCHAR(255) NOT NULL PRIMARY KEY,
  `vault_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `vault_manage` BOOLEAN NOT NULL DEFAULT FALSE,
  `vault_reveal` BOOLEAN NOT NULL DEFAULT FALSE,
  `users_manage` BOOLEAN NOT NULL DEFAULT FALSE,
  `roles_manage` BOOLEAN NOT NULL DEFAULT FALSE,
  `assets_write` BOOLEAN NOT NULL DEFAULT FALSE
);

-- DEVELOPER and ADMIN are handled automatically below.
-- Add rows for OTHER roles only with the permissions they should receive.
-- vault_read exposes usernames and metadata; vault_reveal exposes passwords.
-- users_manage / roles_manage can indirectly confer vault access.
-- Only developer/admin can read, manage or reveal the company-wide vault.
-- assets:write currently protects CDN image upload/deletion, not every asset route.
-- Explicit column names keep the intended role policy reviewable.
INSERT INTO `_credential_role_grants`
  (`role_name`, `vault_read`, `vault_manage`, `vault_reveal`, `users_manage`, `roles_manage`, `assets_write`)
VALUES
  ('manager',           FALSE, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('site_supervisor',   FALSE, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('inventory_manager', FALSE, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('designer',          FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('accounts',          FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('employee',          FALSE, FALSE, FALSE, FALSE, FALSE, FALSE);

DROP PROCEDURE IF EXISTS `_migrate_002_credential_role_permissions`;
DELIMITER $$
CREATE PROCEDURE `_migrate_002_credential_role_permissions`()
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  IF NOT EXISTS (SELECT 1 FROM `roles` WHERE UPPER(TRIM(`name`)) = 'DEVELOPER')
     OR NOT EXISTS (SELECT 1 FROM `roles` WHERE UPPER(TRIM(`name`)) = 'ADMIN') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Both DEVELOPER and ADMIN roles must exist before running this migration.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM `_credential_role_grants` g
    LEFT JOIN `roles` r ON r.`name` = g.`role_name`
    WHERE r.`id` IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Unknown role: replace migration role names with existing roles.name values.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM `_credential_role_grants`
    WHERE (`vault_manage` OR `vault_reveal`) AND NOT `vault_read`
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Vault manage/reveal also require vault_read = TRUE.';
  END IF;

  INSERT INTO `permissions` (`id`, `key`, `description`) VALUES
    (UUID(), 'credentials.read', 'View employee credential metadata and usernames'),
    (UUID(), 'credentials.manage', 'Create, edit and delete employee credentials'),
    (UUID(), 'credentials.reveal', 'Reveal employee credential passwords'),
    (UUID(), 'users.manage', 'Manage application users and role assignments'),
    (UUID(), 'roles.manage', 'Manage role permissions'),
    (UUID(), 'assets:write', 'Upload and delete asset images through the CDN')
  ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

  -- Full access for the two explicitly privileged roles, including permissions
  -- outside the credential feature. Preserve permission IDs and existing grants.
  INSERT INTO `role_permissions` (`role_id`, `permission_id`)
  SELECT r.`id`, p.`id`
  FROM `roles` r
  CROSS JOIN `permissions` p
  WHERE UPPER(TRIM(r.`name`)) IN ('DEVELOPER', 'ADMIN')
  ON DUPLICATE KEY UPDATE `permission_id` = VALUES(`permission_id`);

  -- Other roles receive only the explicitly selected additional permissions.
  INSERT INTO `role_permissions` (`role_id`, `permission_id`)
  SELECT r.`id`, p.`id`
  FROM `_credential_role_grants` g
  JOIN `roles` r ON r.`name` = g.`role_name`
  JOIN `permissions` p ON
       (p.`key` = 'credentials.read' AND g.`vault_read`)
    OR (p.`key` = 'credentials.manage' AND g.`vault_manage`)
    OR (p.`key` = 'credentials.reveal' AND g.`vault_reveal`)
    OR (p.`key` = 'users.manage' AND g.`users_manage`)
    OR (p.`key` = 'roles.manage' AND g.`roles_manage`)
    OR (p.`key` = 'assets:write' AND g.`assets_write`)
  ON DUPLICATE KEY UPDATE `permission_id` = VALUES(`permission_id`);

  COMMIT;
END$$
DELIMITER ;

CALL `_migrate_002_credential_role_permissions`();
DROP PROCEDURE `_migrate_002_credential_role_permissions`;

-- Verify every role, including roles with no grants (NULL permission_key).
SELECT r.`name` AS `role_name`, p.`key` AS `permission_key`
FROM `roles` r
LEFT JOIN `role_permissions` rp ON rp.`role_id` = r.`id`
LEFT JOIN `permissions` p ON p.`id` = rp.`permission_id`
ORDER BY r.`name`, p.`key`;

DROP TEMPORARY TABLE `_credential_role_grants`;
