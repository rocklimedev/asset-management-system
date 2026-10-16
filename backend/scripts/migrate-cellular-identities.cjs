// Additive migration; run from backend with npm run migrate:cellular.
const { ConfigModule } = require('@nestjs/config');
ConfigModule.forRoot();
const mysql = require('mysql2/promise');

async function main() {
  const db = await mysql.createConnection({ host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM asset_units LIKE 'cellular_identities'");
    if (!columns.length) await db.query('ALTER TABLE asset_units ADD COLUMN cellular_identities JSON NULL');
    console.log('Unit IMEI / SIM storage ready.');
  } finally { await db.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
