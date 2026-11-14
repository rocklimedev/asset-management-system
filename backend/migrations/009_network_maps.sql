-- Restartable: preserves existing maps and permission grants.
CREATE TABLE IF NOT EXISTS network_maps (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  document JSON NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
) ENGINE=InnoDB;
INSERT INTO permissions (id, `key`, description)
SELECT UUID(), 'network.manage', 'View and edit the office network map'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE `key` = 'network.manage');
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE LOWER(TRIM(r.name)) IN ('admin','developer') AND p.`key` = 'network.manage'
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id=r.id AND rp.permission_id=p.id);
