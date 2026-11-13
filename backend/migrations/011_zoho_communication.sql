-- Applied by scripts/migrate-communication.cjs. InnoDB, additive, restartable.
-- ${COLLATION} is replaced with employees.id collation by the migration runner.
CREATE TABLE IF NOT EXISTS zoho_connections (
  id VARCHAR(30) PRIMARY KEY, organizationId VARCHAR(80), organizationName VARCHAR(255), accountEmail VARCHAR(254),
  dataCenter VARCHAR(10), encryptedAccessToken TEXT, encryptedRefreshToken TEXT, tokenExpiresAt DATETIME,
  scopes JSON NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'DISCONNECTED', tokenHealth VARCHAR(40) NOT NULL DEFAULT 'DISCONNECTED',
  lastAuthenticatedAt DATETIME, lastHealthCheckAt DATETIME, lastSyncAt DATETIME
) ENGINE=InnoDB COLLATE=${COLLATION};
INSERT IGNORE INTO zoho_connections (id,scopes) VALUES ('zoho',JSON_ARRAY());
CREATE TABLE IF NOT EXISTS zoho_oauth_states (
  stateHash CHAR(64) PRIMARY KEY, actorId CHAR(36) NOT NULL, expiresAt DATETIME NOT NULL, usedAt DATETIME,
  dataCenter VARCHAR(10) NOT NULL, organizationId VARCHAR(80) NOT NULL, scopes JSON NOT NULL,
  INDEX oauth_expiry (expiresAt), FOREIGN KEY (actorId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB COLLATE=${COLLATION};
CREATE TABLE IF NOT EXISTS connectors (
  provider VARCHAR(40) PRIMARY KEY, name VARCHAR(100) NOT NULL, description VARCHAR(255),
  enabled BOOLEAN NOT NULL DEFAULT TRUE, health VARCHAR(40) NOT NULL DEFAULT 'UNKNOWN',
  lastSuccessfulRequest DATETIME, lastError VARCHAR(100)
) ENGINE=InnoDB COLLATE=${COLLATION};
INSERT IGNORE INTO connectors (provider,name,description) VALUES
  ('zoho-mail','Zoho Mail','Organization email provisioning'),('zoho-cliq','Zoho Cliq','Employee identities and channel membership');
CREATE TABLE IF NOT EXISTS communication_channels (
  id CHAR(36) PRIMARY KEY, provider VARCHAR(40) NOT NULL, externalChannelId VARCHAR(100) NOT NULL,
  channelName VARCHAR(255) NOT NULL, channelType VARCHAR(40), isActive BOOLEAN NOT NULL DEFAULT TRUE, updatedAt DATETIME NOT NULL,
  UNIQUE KEY channel_external (provider,externalChannelId)
) ENGINE=InnoDB COLLATE=${COLLATION};
CREATE TABLE IF NOT EXISTS communication_profiles (
  id CHAR(36) PRIMARY KEY, name VARCHAR(120) NOT NULL, code VARCHAR(80) NOT NULL UNIQUE, description TEXT,
  isActive BOOLEAN NOT NULL DEFAULT TRUE, channelIds JSON NOT NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL
) ENGINE=InnoDB COLLATE=${COLLATION};
CREATE TABLE IF NOT EXISTS employee_communication_plans (
  employeeId CHAR(36) PRIMARY KEY, profileId CHAR(36), channelIds JSON NOT NULL, updatedAt DATETIME NOT NULL,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE RESTRICT,
  FOREIGN KEY (profileId) REFERENCES communication_profiles(id) ON DELETE RESTRICT
) ENGINE=InnoDB COLLATE=${COLLATION};
CREATE TABLE IF NOT EXISTS employee_communication_accounts (
  employeeId CHAR(36) PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE, mailAccountId VARCHAR(100) UNIQUE,
  mailUserId VARCHAR(100) UNIQUE, cliqUserId VARCHAR(100) UNIQUE, activationStatus VARCHAR(40) NOT NULL,
  createAttempted BOOLEAN NOT NULL DEFAULT FALSE, cliqCreateAttempted BOOLEAN NOT NULL DEFAULT FALSE, createdAt DATETIME NOT NULL,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE RESTRICT
) ENGINE=InnoDB COLLATE=${COLLATION};
CREATE TABLE IF NOT EXISTS employee_communication_assignments (
  id CHAR(36) PRIMARY KEY, employeeId CHAR(36) NOT NULL, channelId CHAR(36) NOT NULL,
  status VARCHAR(40) NOT NULL, assignedAt DATETIME, verifiedAt DATETIME, lastError VARCHAR(100),
  UNIQUE KEY employee_channel (employeeId,channelId),
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE RESTRICT,
  FOREIGN KEY (channelId) REFERENCES communication_channels(id) ON DELETE RESTRICT
) ENGINE=InnoDB COLLATE=${COLLATION};
CREATE TABLE IF NOT EXISTS onboarding_workflows (
  id CHAR(36) PRIMARY KEY, employeeId CHAR(36) NOT NULL UNIQUE, status VARCHAR(40) NOT NULL,
  createdBy CHAR(36), startedAt DATETIME NOT NULL, completedAt DATETIME,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE RESTRICT,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB COLLATE=${COLLATION};
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id CHAR(36) PRIMARY KEY, employeeId CHAR(36) NOT NULL, taskType VARCHAR(40) NOT NULL, taskOrder INT NOT NULL,
  status VARCHAR(40) NOT NULL, attemptCount INT NOT NULL DEFAULT 0, lastError VARCHAR(100), startedAt DATETIME, completedAt DATETIME,
  UNIQUE KEY employee_task (employeeId,taskType), FOREIGN KEY (employeeId) REFERENCES onboarding_workflows(employeeId) ON DELETE CASCADE
) ENGINE=InnoDB COLLATE=${COLLATION};
CREATE TABLE IF NOT EXISTS communication_requests (
  idempotencyKey VARCHAR(100) PRIMARY KEY, employeeId CHAR(36) NOT NULL, intentHash CHAR(64) NOT NULL, createdAt DATETIME NOT NULL,
  FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE RESTRICT
) ENGINE=InnoDB COLLATE=${COLLATION};
CREATE TABLE IF NOT EXISTS integration_logs (
  id CHAR(36) PRIMARY KEY, provider VARCHAR(40) NOT NULL, operation VARCHAR(80) NOT NULL, entityId VARCHAR(100) NOT NULL,
  status VARCHAR(40) NOT NULL, actorId CHAR(36), errorCode VARCHAR(100), createdAt DATETIME NOT NULL,
  INDEX integration_entity_date (entityId,createdAt)
) ENGINE=InnoDB COLLATE=${COLLATION};
INSERT INTO permissions (id,`key`,description) VALUES
  (UUID(),'integrations:read','View integration health'),(UUID(),'integrations:manage','Manage integration authentication and configuration'),
  (UUID(),'communication:read','View employee communication accounts and plans'),
  (UUID(),'communication:profiles:manage','Manage communication profiles'),(UUID(),'communication:channels:manage','Synchronize channel directory'),
  (UUID(),'communication:employees:provision','Provision employee communication identities'),(UUID(),'communication:employees:manage','Manage employee profiles, activation and membership')
ON DUPLICATE KEY UPDATE description=VALUES(description);
INSERT INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE UPPER(TRIM(r.name)) IN ('DEVELOPER','ADMIN','SUPER_ADMIN','SUPER ADMIN')
AND (p.`key` LIKE 'integrations:%' OR p.`key` LIKE 'communication:%')
ON DUPLICATE KEY UPDATE permission_id=VALUES(permission_id);
