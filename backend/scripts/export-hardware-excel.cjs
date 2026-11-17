const path = require('node:path');
const fs = require('node:fs/promises');
const ExcelJS = require('exceljs');

const JOINS = `
  LEFT JOIN organisations o ON o.id = a.organisation_id
  LEFT JOIN asset_categories c ON c.id = a.category_id`;

const INVENTORY_SQL = `
SELECT a.id AS assetId, a.name AS asset, a.assetTag, o.name AS organisation,
  c.name AS category, a.manufacturer, a.model, a.tracking_mode AS trackingMode,
  u.unit_code AS unitCode,
  CASE WHEN u.id IS NULL THEN a.serialNumber ELSE u.serial_number END AS serialNumber,
  COALESCE(u.status, a.status) AS status,
  COALESCE(u.condition, a.condition) AS assetCondition,
  l.name AS location,
  CASE WHEN u.id IS NULL THEN a.quantity ELSE 1 END AS quantity,
  CASE WHEN u.id IS NULL THEN a.quantityAssigned
       WHEN u.status = 'ASSIGNED' THEN 1 ELSE 0 END AS assignedQuantity,
  CASE WHEN u.id IS NOT NULL THEN IF(u.status = 'AVAILABLE', 1, 0)
       WHEN a.status IN ('AVAILABLE', 'ASSIGNED')
       THEN GREATEST(a.quantity - a.quantityAssigned, 0) ELSE 0 END AS availableQuantity
FROM assets a
${JOINS}
LEFT JOIN asset_units u ON u.asset_id = a.id
LEFT JOIN locations l ON l.id = COALESCE(u.location_id, a.location_id)
WHERE a.kind = 'HARDWARE'
ORDER BY o.name, c.name, a.name, u.unit_code`;

const ASSIGNMENTS_SQL = `
SELECT aa.id AS assignmentId, a.id AS assetId, a.name AS asset, a.assetTag,
  o.name AS organisation, c.name AS category,
  u.unit_code AS unitCode,
  CASE WHEN aa.asset_unit_id IS NULL THEN a.serialNumber ELSE u.serial_number END AS serialNumber,
  COALESCE(e.employeeCode, se.employeeCode) AS employeeCode,
  COALESCE(e.name, se.name) AS employee,
  COALESCE(e.email, se.email) AS email,
  s.systemTag, s.name AS system, aa.assignedAt, aa.status, aa.notes,
  aa.employee_id AS employeeId, aa.system_id AS systemId
FROM asset_assignments aa
JOIN assets a ON a.id = aa.asset_id
${JOINS}
LEFT JOIN asset_units u ON u.id = aa.asset_unit_id
LEFT JOIN employees e ON e.id = aa.employee_id
LEFT JOIN systems s ON s.id = aa.system_id
LEFT JOIN employees se ON se.id = s.employee_id
WHERE a.kind = 'HARDWARE' AND aa.status = 'ACTIVE'
ORDER BY o.name, COALESCE(e.name, se.name), a.name, u.unit_code`;

const inventoryColumns = [
  ['assetId', 'Asset ID'], ['organisation', 'Organisation'], ['category', 'Category'],
  ['asset', 'Asset'], ['assetTag', 'Asset Tag'], ['manufacturer', 'Manufacturer'],
  ['model', 'Model'], ['trackingMode', 'Tracking Mode'], ['unitCode', 'Unit Code'],
  ['serialNumber', 'Serial Number'], ['status', 'Status'], ['assetCondition', 'Condition'],
  ['location', 'Location'], ['quantity', 'Quantity'], ['assignedQuantity', 'Assigned Quantity'],
  ['availableQuantity', 'Available Quantity'],
];
const assignmentColumns = [
  ['assignmentId', 'Assignment ID'], ['assetId', 'Asset ID'], ['organisation', 'Organisation'],
  ['category', 'Category'], ['asset', 'Asset'], ['assetTag', 'Asset Tag'],
  ['unitCode', 'Unit Code'], ['serialNumber', 'Serial Number'],
  ['employeeCode', 'Employee Code'], ['employee', 'Employee'], ['email', 'Email'],
  ['systemTag', 'System Tag'], ['system', 'System'], ['assignedAt', 'Assigned At'],
  ['status', 'Status'], ['notes', 'Notes'], ['employeeId', 'Employee ID'], ['systemId', 'System ID'],
];

function addSheet(workbook, name, columns, rows) {
  if (rows.length > 1048575) throw new Error(`${name} exceeds the Excel row limit.`);
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map(([key, header]) => ({ key, header, width: key.endsWith('Id') ? 38 : 24 }));
  for (const row of rows) sheet.addRow(row);
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: columns.length } };
  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
  });
  sheet.getRow(1).height = 28;
  for (const [key] of columns) {
    sheet.getColumn(key).numFmt = key === 'assignedAt' ? 'yyyy-mm-dd hh:mm:ss' :
      ['quantity', 'assignedQuantity', 'availableQuantity'].includes(key) ? '0' : '@';
  }
  return sheet;
}

function buildWorkbook(inventory, assignments) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Asset Management';
  workbook.created = new Date();
  addSheet(workbook, 'Hardware Inventory', inventoryColumns, inventory);
  addSheet(workbook, 'Assigned Hardware', assignmentColumns, assignments);
  return workbook;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: node scripts/export-hardware-excel.cjs [output.xlsx]\nReads backend/.env and exports hardware inventory and ACTIVE assignments.');
    return;
  }
  if (args.length > 1) throw new Error('Supply only one output file path.');
  const output = path.resolve(args[0] || path.join(__dirname, '../exports', `hardware-${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`));
  if (path.extname(output).toLowerCase() !== '.xlsx') throw new Error('Output must end in .xlsx.');
  require('@nestjs/config').ConfigModule.forRoot({ envFilePath: path.join(__dirname, '../.env') });
  for (const key of ['DB_HOST', 'DB_USERNAME', 'DB_NAME']) {
    if (!process.env[key]) throw new Error(`Missing ${key} in backend/.env or environment.`);
  }
  const db = await require('mysql2/promise').createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // Preserve database clock values without converting through the local timezone.
    dateStrings: true,
  });
  let inventory, assignments;
  try {
    await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    [inventory] = await db.query(INVENTORY_SQL);
    [assignments] = await db.query(ASSIGNMENTS_SQL);
    await db.commit();
  } finally {
    await db.end();
  }
  await fs.mkdir(path.dirname(output), { recursive: true });
  // Exclusive creation prevents accidental replacement of an existing export.
  await fs.writeFile(output, await buildWorkbook(inventory, assignments).xlsx.writeBuffer(), { flag: 'wx' });
  console.log(`Created: ${output}\nInventory rows: ${inventory.length}\nActive assignments: ${assignments.length}`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { buildWorkbook, INVENTORY_SQL, ASSIGNMENTS_SQL };
