// Additive, restartable migration. Run from backend: npm run migrate:systems
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [columns] = await db.query("SHOW FULL COLUMNS FROM employees WHERE Field = 'id'");
    const collation = columns[0]?.Collation;
    if (!collation || !/^[a-zA-Z0-9_]+$/.test(collation)) throw new Error('Could not determine employee ID collation');
    const charset = collation.split('_')[0];
    await db.query(`CREATE TABLE IF NOT EXISTS systems (
      id CHAR(36) NOT NULL PRIMARY KEY,
      systemTag VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      notes TEXT NULL,
      employee_id CHAR(36) NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      INDEX systems_employee (employee_id),
      CONSTRAINT systems_employee_fk FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=${charset} COLLATE=${collation}`);
    const [assignmentColumns] = await db.query('SHOW FULL COLUMNS FROM asset_assignments');
    const employeeColumn = assignmentColumns.find(c => c.Field === 'employee_id');
    if (!employeeColumn || !/^[a-zA-Z0-9_]+$/.test(employeeColumn.Collation)) throw new Error('Missing employee_id column');
    if (employeeColumn.Null !== 'YES') await db.query(`ALTER TABLE asset_assignments MODIFY employee_id CHAR(36) COLLATE ${employeeColumn.Collation} NULL`);
    if (!assignmentColumns.some(c => c.Field === 'system_id')) {
      await db.query(`ALTER TABLE asset_assignments ADD system_id CHAR(36) COLLATE ${collation} NULL,
        ADD INDEX assignments_system (system_id),
        ADD CONSTRAINT assignments_system_fk FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE RESTRICT`);
    }
    // Existing employee assignments are preserved. Reconcile the serialized
    // assignment counter used by the pool without changing asset lifecycle status.
    await db.query(`UPDATE assets a SET quantityAssigned = (SELECT COUNT(*) FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.status = 'ACTIVE')`);
    console.log('Systems migration complete. Existing employee assignments preserved.');
  } finally { await db.end(); }
}
main().catch(error => { console.error('Systems migration failed:', error.message); process.exitCode = 1; });
