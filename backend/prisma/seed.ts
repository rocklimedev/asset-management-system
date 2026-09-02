import { PrismaClient, AssetKind, AssetStatus, AssetCondition, EmployeeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  'dashboard.view',
  'employee.view', 'employee.manage',
  'asset.view', 'asset.create', 'asset.edit', 'asset.delete', 'asset.transfer', 'asset.history.view',
  'software.view', 'software.manage',
  'user.manage', 'role.manage', 'settings.manage', 'audit.view', 'export.data',
];

const ROLES: Record<string, string[]> = {
  'Super Admin': PERMISSIONS,
  'IT Admin': PERMISSIONS.filter((p) => p !== 'role.manage'),
  'IT Manager': ['dashboard.view', 'employee.view', 'asset.view', 'asset.edit', 'asset.transfer', 'asset.history.view', 'software.view', 'audit.view'],
  'IT Staff': ['dashboard.view', 'employee.view', 'asset.view', 'asset.transfer', 'asset.history.view', 'software.view'],
  'Viewer': ['dashboard.view', 'employee.view', 'asset.view', 'asset.history.view', 'software.view'],
};

const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'Finance', 'HR', 'Design', 'Operations', 'Customer Support'];
const LOCATIONS = ['New York HQ', 'San Francisco', 'London', 'Remote'];

const HARDWARE_CATALOG: { name: string; category: string; manufacturer: string; model: string }[] = [
  { name: 'MacBook Pro 16"', category: 'Laptop', manufacturer: 'Apple', model: 'MacBook Pro 16 M3' },
  { name: 'MacBook Air 13"', category: 'Laptop', manufacturer: 'Apple', model: 'MacBook Air M2' },
  { name: 'Dell Latitude 5440', category: 'Laptop', manufacturer: 'Dell', model: 'Latitude 5440' },
  { name: 'HP EliteBook 840', category: 'Laptop', manufacturer: 'HP', model: 'EliteBook 840 G9' },
  { name: 'Dell Monitor 27"', category: 'Monitor', manufacturer: 'Dell', model: 'U2723QE' },
  { name: 'LG Monitor 27"', category: 'Monitor', manufacturer: 'LG', model: '27UP850' },
  { name: 'Magic Keyboard', category: 'Keyboard', manufacturer: 'Apple', model: 'Magic Keyboard' },
  { name: 'Logitech MX Keys', category: 'Keyboard', manufacturer: 'Logitech', model: 'MX Keys' },
  { name: 'Magic Mouse', category: 'Mouse', manufacturer: 'Apple', model: 'Magic Mouse 2' },
  { name: 'Logitech MX Master 3', category: 'Mouse', manufacturer: 'Logitech', model: 'MX Master 3S' },
  { name: 'Sony WH-1000XM5', category: 'Headset', manufacturer: 'Sony', model: 'WH-1000XM5' },
  { name: 'iPhone 15', category: 'Mobile', manufacturer: 'Apple', model: 'iPhone 15' },
  { name: 'Samsung Galaxy S24', category: 'Mobile', manufacturer: 'Samsung', model: 'Galaxy S24' },
  { name: 'iPad Air', category: 'Tablet', manufacturer: 'Apple', model: 'iPad Air 5th Gen' },
  { name: 'HP LaserJet Pro', category: 'Printer', manufacturer: 'HP', model: 'LaserJet Pro M404' },
  { name: 'Dell PowerEdge R650', category: 'Server', manufacturer: 'Dell', model: 'PowerEdge R650' },
];

const SOFTWARE_CATALOG = [
  { name: 'Microsoft 365', vendor: 'Microsoft', category: 'Microsoft 365', seats: 100 },
  { name: 'Adobe Creative Cloud', vendor: 'Adobe', category: 'Adobe', seats: 40 },
  { name: 'Slack', vendor: 'Salesforce', category: 'Project Management', seats: 150 },
  { name: 'GitHub Enterprise', vendor: 'GitHub', category: 'Development tools', seats: 60 },
  { name: 'Figma', vendor: 'Figma Inc.', category: 'Design software', seats: 25 },
  { name: 'AutoCAD', vendor: 'Autodesk', category: 'Design software', seats: 10 },
  { name: 'CrowdStrike Falcon', vendor: 'CrowdStrike', category: 'Antivirus', seats: 200 },
];

const FIRST_NAMES = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Daniel', 'Laura', 'James', 'Anna', 'Robert', 'Priya', 'Chris', 'Maria', 'Kevin', 'Nina', 'Tom', 'Rachel', 'Omar', 'Grace'];
const LAST_NAMES = ['Doe', 'Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Patel', 'Evans', 'Garcia', 'Clark', 'Kumar', 'Lewis', 'Chen', 'Hassan', 'Turner'];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 3600 * 1000);
}

async function main() {
  console.log('Seeding permissions & roles...');
  const permissionRecords = await Promise.all(
    PERMISSIONS.map((key) =>
      prisma.permission.upsert({ where: { key }, update: {}, create: { key, description: key } }),
    ),
  );

  const roleRecords: Record<string, { id: number }> = {};
  for (const [roleName, perms] of Object.entries(ROLES)) {
    const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });
    roleRecords[roleName] = role;
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const p of perms) {
      const perm = permissionRecords.find((pr) => pr.key === p)!;
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
    }
  }

  console.log('Seeding departments & locations...');
  const departments = await Promise.all(
    DEPARTMENTS.map((name) => prisma.department.upsert({ where: { name }, update: {}, create: { name } })),
  );
  const locations = await Promise.all(
    LOCATIONS.map((name) => prisma.location.upsert({ where: { name }, update: {}, create: { name } })),
  );

  console.log('Seeding admin user...');
  const adminEmployee = await prisma.employee.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      employeeCode: 'EMP-0001',
      name: 'Alex Morgan',
      email: 'admin@company.com',
      departmentId: rand(departments).id,
      designation: 'IT Administrator',
      locationId: rand(locations).id,
      status: EmployeeStatus.ACTIVE,
      joiningDate: daysFromNow(-900),
    },
  });
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      name: 'Alex Morgan',
      email: 'admin@company.com',
      passwordHash: await bcrypt.hash('Admin123!', 10),
      roleId: roleRecords['Super Admin'].id,
      employeeId: adminEmployee.id,
    },
  });
  console.log('  Login: admin@company.com / Admin123!');

  console.log('Seeding employees...');
  const employees = [adminEmployee];
  for (let i = 0; i < 20; i++) {
    const first = FIRST_NAMES[i];
    const last = LAST_NAMES[i];
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@company.com`;
    const emp = await prisma.employee.upsert({
      where: { email },
      update: {},
      create: {
        employeeCode: `EMP-${String(i + 2).padStart(4, '0')}`,
        name: `${first} ${last}`,
        email,
        phone: `+1-555-01${String(i).padStart(2, '0')}`,
        departmentId: rand(departments).id,
        designation: rand(['Software Engineer', 'Senior Developer', 'Product Designer', 'Sales Executive', 'Marketing Manager', 'Financial Analyst', 'HR Specialist', 'Support Lead']),
        locationId: rand(locations).id,
        status: EmployeeStatus.ACTIVE,
        joiningDate: daysFromNow(-randInt(30, 1200)),
      },
    });
    employees.push(emp);
  }

  console.log('Seeding asset categories & vendors...');
  const hwCategoryNames = [...new Set(HARDWARE_CATALOG.map((h) => h.category))];
  const hwCategories: Record<string, { id: number }> = {};
  for (const name of hwCategoryNames) {
    hwCategories[name] = await prisma.assetCategory.upsert({
      where: { name }, update: {}, create: { name, type: AssetKind.HARDWARE },
    });
  }
  const swCategoryNames = [...new Set(SOFTWARE_CATALOG.map((s) => s.category))];
  const swCategories: Record<string, { id: number }> = {};
  for (const name of swCategoryNames) {
    swCategories[name] = await prisma.assetCategory.upsert({
      where: { name }, update: {}, create: { name, type: AssetKind.SOFTWARE },
    });
  }

  const vendorNames = [...new Set([...HARDWARE_CATALOG.map((h) => h.manufacturer), ...SOFTWARE_CATALOG.map((s) => s.vendor)])];
  const vendors: Record<string, { id: number }> = {};
  for (const name of vendorNames) {
    vendors[name] = await prisma.vendor.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log('Seeding hardware assets...');
  const statusPool: AssetStatus[] = [
    AssetStatus.ASSIGNED, AssetStatus.ASSIGNED, AssetStatus.ASSIGNED, AssetStatus.ASSIGNED,
    AssetStatus.AVAILABLE, AssetStatus.AVAILABLE,
    AssetStatus.REPAIR, AssetStatus.RETIRED, AssetStatus.LOST,
  ];
  let tagCounter = 100;
  const hardwareAssets: number[] = [];
  for (let i = 0; i < 55; i++) {
    const item = rand(HARDWARE_CATALOG);
    tagCounter++;
    const prefix = item.category.slice(0, 3).toUpperCase();
    const status = i < 40 ? AssetStatus.ASSIGNED : rand(statusPool); // bias toward assigned so the board looks populated
    const asset = await prisma.asset.create({
      data: {
        name: item.name,
        assetTag: `${prefix}-${String(tagCounter).padStart(5, '0')}`,
        kind: AssetKind.HARDWARE,
        categoryId: hwCategories[item.category].id,
        manufacturer: item.manufacturer,
        model: item.model,
        serialNumber: `SN${randInt(100000, 999999)}`,
        purchaseDate: daysFromNow(-randInt(60, 900)),
        purchasePrice: randInt(150, 3200),
        vendorId: vendors[item.manufacturer].id,
        warrantyStart: daysFromNow(-randInt(60, 900)),
        warrantyExpiry: daysFromNow(randInt(-60, 500)),
        status,
        condition: status === AssetStatus.REPAIR ? AssetCondition.POOR : status === AssetStatus.RETIRED ? AssetCondition.FAIR : AssetCondition.GOOD,
        locationId: rand(locations).id,
      },
    });
    await prisma.assetHistory.create({
      data: { assetId: asset.id, action: 'CREATED', performedBy: 'Seed Script', toValue: status },
    });
    if (status === AssetStatus.ASSIGNED) {
      const emp = rand(employees.slice(1)); // avoid overloading admin
      await prisma.assetAssignment.create({
        data: { assetId: asset.id, employeeId: emp.id, assignedBy: adminUser.id, assignedAt: daysFromNow(-randInt(5, 400)) },
      });
      await prisma.assetHistory.create({
        data: { assetId: asset.id, action: 'ASSIGNED', performedBy: 'Alex Morgan', toValue: emp.name },
      });
    }
    hardwareAssets.push(asset.id);
  }

  console.log('Seeding software licenses...');
  for (const sw of SOFTWARE_CATALOG) {
    let assignedSeats = 0;
    const asset = await prisma.asset.create({
      data: {
        name: sw.name,
        assetTag: `SW-${String(++tagCounter).padStart(5, '0')}`,
        kind: AssetKind.SOFTWARE,
        categoryId: swCategories[sw.category].id,
        vendorId: vendors[sw.vendor].id,
        status: AssetStatus.ASSIGNED,
        condition: AssetCondition.NEW,
      },
    });
    const seatEmployees = employees.slice(0, randInt(5, Math.min(sw.seats, employees.length)));
    for (const emp of seatEmployees) {
      await prisma.assetAssignment.create({
        data: { assetId: asset.id, employeeId: emp.id, assignedBy: adminUser.id },
      });
      assignedSeats++;
    }
    await prisma.softwareLicense.create({
      data: {
        assetId: asset.id,
        vendor: sw.vendor,
        licenseType: 'Subscription',
        licenseReference: `LIC-${randInt(10000, 99999)}`,
        totalSeats: sw.seats,
        assignedSeats,
        purchaseDate: daysFromNow(-randInt(60, 400)),
        expiryDate: daysFromNow(randInt(-10, 200)),
        renewalDate: daysFromNow(randInt(200, 400)),
        cost: randInt(500, 50000),
      },
    });
    await prisma.assetHistory.create({
      data: { assetId: asset.id, action: 'CREATED', performedBy: 'Seed Script', toValue: 'ASSIGNED' },
    });
  }

  console.log('Seed complete.');
  console.log(`Employees: ${employees.length}, Hardware assets: ${hardwareAssets.length}, Software products: ${SOFTWARE_CATALOG.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
