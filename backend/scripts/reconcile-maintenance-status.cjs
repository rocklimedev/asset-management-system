// Repair the former inventory-only REPAIR/DAMAGED status updates.
// Dry run by default. Run with --apply to synchronize safe, unassigned units.
const path = require('node:path');
const { randomUUID } = require('node:crypto');

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/reconcile-maintenance-status.cjs [--apply]');
  require('@nestjs/config').ConfigModule.forRoot({ envFilePath: path.join(__dirname, '../.env') });
  const db = await require('mysql2/promise').createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });
  try {
    await db.beginTransaction();
    // Skip assigned, lost, retired and disposed inventory, and mixed maintenance states.
    const [rows] = await db.query(`
      SELECT a.id AS assetId, a.name, a.status AS targetStatus,
        u.id AS unitId, u.status AS previousStatus
      FROM assets a JOIN asset_units u ON u.asset_id = a.id
      WHERE a.status IN ('REPAIR', 'DAMAGED') AND u.status = 'AVAILABLE'
        AND a.quantityAssigned = 0
        AND NOT EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.status = 'ACTIVE')
        AND NOT EXISTS (SELECT 1 FROM asset_units other WHERE other.asset_id = a.id
          AND other.status NOT IN ('AVAILABLE', a.status))
      ORDER BY a.id, u.id FOR UPDATE`);
    console.log(`Found ${rows.length} unit(s) with inventory-only maintenance status.`);
    for (const row of rows) console.log(`${row.name}: ${row.previousStatus} -> ${row.targetStatus} (${row.unitId})`);
    if (!args.includes('--apply')) {
      await db.rollback();
      console.log('Dry run only. Use --apply to synchronize these units.');
      return;
    }
    for (const row of rows) {
      await db.execute('UPDATE asset_units SET status = ?, updatedAt = NOW() WHERE id = ? AND status = ?',
        [row.targetStatus, row.unitId, row.previousStatus]);
      await db.execute(`INSERT INTO asset_history
        (id, asset_id, asset_unit_id, action, performedBy, fromValue, toValue, notes, createdAt)
        VALUES (?, ?, ?, 'UNIT_STATUS_CHANGED', 'Maintenance reconciliation', ?, ?, ?, NOW())`,
      [randomUUID(), row.assetId, row.unitId, row.previousStatus, row.targetStatus,
        'Synchronized physical unit with the inventory maintenance status after the inline status fix.']);
    }
    await db.commit();
    console.log(`Synchronized ${rows.length} unit(s).`);
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
