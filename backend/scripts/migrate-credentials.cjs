require('dotenv').config();
const mysql = require('mysql2/promise');
const { randomUUID } = require('node:crypto');
async function main() {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const trustedRole = process.argv[2];
    let roleId;
    if (trustedRole) {
      const [roles] = await db.query('SELECT id FROM roles WHERE name = ?', [trustedRole]);
      if (roles.length !== 1) throw new Error('Trusted role name must match one existing role');
      roleId = roles[0].id;
    }
    const [columns] = await db.query("SHOW FULL COLUMNS FROM employees WHERE Field = 'id'");
    const collation = columns[0]?.Collation;
    if (!collation || !/^[a-zA-Z0-9_]+$/.test(collation)) throw new Error('Cannot determine employee ID collation');
    await db.query(`CREATE TABLE IF NOT EXISTS employee_credentials (
      id CHAR(36) NOT NULL PRIMARY KEY, employeeId CHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL, category VARCHAR(100) NOT NULL, purpose TEXT NOT NULL,
      systemLabel VARCHAR(255) NOT NULL, encryptedUsername TEXT NOT NULL, encryptedPassword TEXT NOT NULL,
      createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL,
      INDEX credentials_employee (employeeId),
      CONSTRAINT credentials_employee_fk FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=${collation.split('_')[0]} COLLATE=${collation}`);
    for (const [key, description] of [['credentials.read', 'View employee credential metadata and usernames'], ['credentials.manage', 'Create, edit and delete employee credentials'], ['credentials.reveal', 'Reveal employee credential passwords'], ['users.manage', 'Manage application users and role assignments'], ['roles.manage', 'Manage role permissions']]) {
      await db.query('INSERT INTO permissions (id, `key`, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)', [randomUUID(), key, description]);
      if (roleId) await db.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) SELECT ?, id FROM permissions WHERE `key` = ?', [roleId, key]);
    }
    console.log('Credential migration complete. Trusted role permissions assigned only if an explicit role name was supplied.');
  } finally { await db.end(); }
}
main().catch(error => { console.error('Credential migration failed:', error.message); process.exitCode = 1; });
