require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
async function main() {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  let locked = false;
  try {
    const [[lock]] = await db.query("SELECT GET_LOCK('itam:migration:communication',0) AS acquired");
    if (Number(lock.acquired) !== 1) throw new Error('Communication migration already running');
    locked = true;
    const [columns] = await db.query("SHOW FULL COLUMNS FROM employees WHERE Field='id'");
    const collation = columns[0]?.Collation;
    if (!collation || !/^[a-zA-Z0-9_]+$/.test(collation)) throw new Error('Cannot determine employee ID collation');
    for (const table of ['users']) {
      const [ids] = await db.query(`SHOW FULL COLUMNS FROM ${table} WHERE Field='id'`);
      if (ids[0]?.Collation !== collation) throw new Error('Employee/user ID collations must match before migration');
    }
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/011_zoho_communication.sql'), 'utf8')
      .replace(/^--.*$/gm, '').replaceAll('${COLLATION}', collation);
    for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await db.query(statement);
    console.log('Zoho communication migration complete.');
  } finally {
    if (locked) await db.query("SELECT RELEASE_LOCK('itam:migration:communication')");
    await db.end();
  }
}
main().catch(() => { console.error('Communication migration failed; verify database permissions, schema and connectivity.'); process.exitCode = 1; });
