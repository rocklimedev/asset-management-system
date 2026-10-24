require('reflect-metadata');
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Sequelize, Model } = require('sequelize-typescript');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { AssetsService } = require('../dist/modules/assets/assets.service');
const { SystemsService } = require('../dist/modules/assets/systems.service');
const { System } = require('../dist/modules/assets/models/system.model');
const { AssetCategory } = require('../dist/modules/assets/models/asset-category.model');
const { Employee } = require('../dist/modules/organisation/models/employees.model');
const { AssetAssignment } = require('../dist/modules/assets/models/asset-assignment.model');
const { AssetHistory } = require('../dist/modules/assets/models/asset-history.model');
const { CreateSystemDto } = require('../dist/modules/assets/dto/system.dto');
const actor = { id: 'actor', name: 'Admin' };
const restores = [];
function stub(target, key, value) { const previous = target[key]; target[key] = value; restores.push(() => { target[key] = previous; }); }
afterEach(() => { while (restores.length) restores.pop()(); });
function fixture() {
  const writes = [], audit = [], history = [];
  const t = { LOCK: { UPDATE: 'UPDATE' } };
  const db = { transaction: async callback => callback(t) };
  const asset = { id: 'asset', name: 'Monitor', status: 'AVAILABLE', quantity: 1, quantityAssigned: 0,
    update: async changes => Object.assign(asset, changes) };
  let active = null;
  const assets = { findByPk: async (_id, options) => {
    assert.equal(options.transaction, t);
    return asset;
  } };
  const assignments = { count: async () => active ? 1 : 0, create: async (data, options) => {
    assert.equal(options.transaction, t); writes.push(data); active = data; return data;
  }, findOne: async () => active };
  const employee = { id: 'employee', name: 'Ada', status: 'ACTIVE' };
  const employeeModel = { findByPk: async () => employee };
  const auditService = { log: async (data, transaction) => { assert.equal(transaction, t); audit.push(data); } };
  const historyModel = { create: async data => history.push(data) };
  const service = new AssetsService(assets, {}, historyModel, assignments, {}, {}, {}, {}, employeeModel, {}, db, {}, {}, auditService, {});
  return { service, asset, assignments, employee, db, t, auditService, writes, audit, history,
    setActive(value) { active = value; } };
}

test('all models initialize with the correct logical assignment foreign keys', async () => {
  function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
  const models = files(path.resolve(__dirname, '../dist/modules')).filter(f => f.endsWith('.model.js')).flatMap(f => Object.values(require(f)).filter(v => typeof v === 'function' && v.prototype instanceof Model));
  const db = new Sequelize({ dialect: 'mysql', models, logging: false });
  assert.equal(AssetAssignment.rawAttributes.employeeId.allowNull, true);
  assert.equal(AssetAssignment.rawAttributes.systemId.field, 'system_id');
  assert.equal(AssetAssignment.rawAttributes.employee_id, undefined);
  assert.equal(AssetAssignment.rawAttributes.asset_id, undefined);
  assert.equal(System.associations.assignments.foreignKey, 'systemId');
  assert.equal(System.associations.category.foreignKey, 'categoryId');
  assert.equal(System.rawAttributes.categoryId.field, 'category_id');
  assert.equal(Employee.associations.systems.foreignKey, 'employeeId');
  await db.close();
});

test('assignment requires exactly one target', async () => {
  const { service } = fixture();
  await assert.rejects(service.assign('asset', {}, actor), /exactly one/);
  await assert.rejects(service.assign('asset', { employeeId: 'employee', systemId: 'system' }, actor), /exactly one/);
});

test('direct employee assignment still works and increments custody count', async () => {
  const f = fixture();
  await f.service.assign('asset', { employeeId: 'employee' }, actor);
  assert.equal(f.writes[0].employeeId, 'employee');
  assert.equal(f.writes[0].systemId, null);
  assert.equal(f.asset.status, 'ASSIGNED');
  assert.equal(f.asset.quantityAssigned, 1);
});

test('system assignment stores no direct employee and records the system in history', async () => {
  const f = fixture();
  stub(System, 'findByPk', async (_id, options) => { assert.equal(options.lock, 'UPDATE'); return { id: 'system', systemTag: 'PC-001', name: 'Design PC' }; });
  await f.service.assign('asset', { systemId: 'system' }, actor);
  assert.equal(f.writes[0].employeeId, null);
  assert.equal(f.writes[0].systemId, 'system');
  assert.match(f.history[0].toValue, /PC-001/);
  await assert.rejects(f.service.assign('asset', { employeeId: 'employee' }, actor), /Only available/);
});

test('missing system, exited employee, empty stock and nonavailable assets are rejected', async () => {
  const f = fixture();
  stub(System, 'findByPk', async () => null);
  await assert.rejects(f.service.assign('asset', { systemId: 'missing' }, actor), /System not found/);
  f.employee.status = 'EXITED';
  await assert.rejects(f.service.assign('asset', { employeeId: 'employee' }, actor), /inactive or exited/);
  f.employee.status = 'ACTIVE';
  f.asset.quantity = 0;
  await assert.rejects(f.service.assign('asset', { employeeId: 'employee' }, actor), /no stock/);
  f.asset.quantity = 1;
  for (const status of ['REPAIR', 'DAMAGED', 'LOST', 'RETIRED', 'DISPOSED']) {
    f.asset.status = status;
    await assert.rejects(f.service.assign('asset', { employeeId: 'employee' }, actor), /Only available/);
  }
  assert.equal(f.writes.length, 0);
});

test('existing active assignment blocks assignment even with stale AVAILABLE status', async () => {
  const f = fixture(); f.setActive({ id: 'existing' });
  await assert.rejects(f.service.assign('asset', { employeeId: 'employee' }, actor), /Only available/);
});

test('removing a component closes history and restores availability', async () => {
  const f = fixture(); f.asset.status = 'ASSIGNED'; f.asset.quantityAssigned = 1;
  const assignment = { systemId: 'system', system: { systemTag: 'PC-001' }, status: 'ACTIVE', update: async data => Object.assign(assignment, data) };
  f.setActive(assignment);
  await f.service.returnAsset('asset', actor);
  assert.equal(assignment.status, 'RETURNED'); assert.ok(assignment.returnedAt);
  assert.equal(f.asset.status, 'AVAILABLE'); assert.equal(f.asset.quantityAssigned, 0);
  assert.equal(f.history[0].fromValue, 'System: PC-001');
});

test('removing a damaged component preserves its lifecycle status', async () => {
  const f = fixture(); f.asset.status = 'DAMAGED'; f.asset.quantityAssigned = 1;
  f.setActive({ status: 'ACTIVE', update: async () => {} });
  await f.service.returnAsset('asset', actor);
  assert.equal(f.asset.status, 'DAMAGED'); assert.equal(f.asset.quantityAssigned, 0);
});

test('system transfer and return keep component membership unchanged', async () => {
  const f = fixture();
  const system = { id: 'system', systemTag: 'LAP-001', categoryId: 'laptops', employeeId: 'previous', update: async data => Object.assign(system, data) };
  const components = [{ assetId: 'asset', systemId: 'system', status: 'ACTIVE' }];
  stub(System, 'findByPk', async () => system);
  stub(Employee, 'findByPk', async id => ({ id, name: id, status: 'ACTIVE' }));
  stub(AssetAssignment, 'findAll', async () => components);
  stub(AssetHistory, 'create', async data => f.history.push(data));
  const service = new SystemsService(f.db, f.auditService);
  await service.setEmployee('system', 'next', actor);
  assert.equal(system.employeeId, 'next');
  assert.equal(system.categoryId, 'laptops');
  await service.setEmployee('system', null, actor);
  assert.equal(system.employeeId, null);
  assert.deepEqual(components, [{ assetId: 'asset', systemId: 'system', status: 'ACTIVE' }]);
  assert.equal(f.history.length, 2);
  assert.equal(f.audit[1].action, 'SYSTEM_RETURNED');
});

test('system cannot be assigned to an exited employee', async () => {
  const f = fixture();
  stub(Employee, 'findByPk', async () => ({ status: 'EXITED' }));
  await assert.rejects(new SystemsService(f.db, f.auditService).setEmployee('system', 'employee', actor), /active employees/);
});

test('blank system names and tags are rejected after trimming', async () => {
  const dto = plainToInstance(CreateSystemDto, { name: '  ', systemTag: '  ', categoryId: '11111111-1111-4111-8111-111111111111' });
  const errors = await validate(dto);
  assert.deepEqual(errors.map(e => e.property).sort(), ['name', 'systemTag']);
});

test('employee release returns direct assets and whole systems separately', async () => {
  const f = fixture(), released = [], systems = [];
  f.assignments.findAll = async () => [{ assetId: 'direct' }];
  f.service.returnAsset = async id => { released.push(id); return f.asset; };
  f.service.systemsService = { setEmployee: async (id, employee) => systems.push([id, employee]) };
  stub(System, 'findAll', async () => [{ id: 'pc' }]);
  const result = await f.service.releaseAssetsForExitedEmployee('employee', actor);
  assert.deepEqual(released, ['direct']); assert.deepEqual(systems, [['pc', null]]);
  assert.equal(result.releasedSystems, 1);
});

test('creating a system needs no employee and saves it unassigned', async () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  let created;
  stub(System, 'create', async (data) => { created = { id: 'inventory-system', ...data }; return created; });
  stub(System, 'findByPk', async () => created);
  const service = new SystemsService({ transaction: async fn => fn(transaction) }, { log: async () => {} });
  stub(AssetCategory, 'findByPk', async () => ({ id: '11111111-1111-4111-8111-111111111111', name: 'Desktop PC', type: 'HARDWARE', isActive: true }));
  const dto = plainToInstance(CreateSystemDto, { name: 'Spare PC', systemTag: 'SPARE-001', categoryId: '11111111-1111-4111-8111-111111111111' });
  assert.equal((await validate(dto)).length, 0);
  const result = await service.create(dto, actor);
  assert.equal(result.employeeId, null);
});

test('system reports and Excel explicitly identify unassigned inventory', async () => {
  const { buildSystemRecord, cardRows, createSystemsExcel } = require('../dist/modules/reports/system-report');
  const ExcelJS = require('exceljs');
  const inventory = buildSystemRecord({ id: 'spare', systemName: 'Spare PC', company: 'Example', components: [] });
  const assigned = buildSystemRecord({ id: 'used', systemName: 'Work PC', company: 'Example', employeeId: 'employee', holder: 'Ada', components: [] });
  assert.equal(inventory.holder, 'UNASSIGNED');
  assert.equal(inventory.assignmentStatus, 'Unassigned (Inventory)');
  assert.equal(assigned.assignmentStatus, 'Assigned');
  assert.ok(cardRows(inventory).some(row => row.label === 'ASSIGNMENT STATUS' && row.value === 'Unassigned (Inventory)'));
  const buffer = await createSystemsExcel({ generatedAt: new Date(), totalSystems: 2, byCompany: { Example: 2 }, items: [inventory, assigned] });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const table = workbook.getWorksheet('Systems Table');
  assert.equal(table.getCell('E1').value, 'Assignment Status');
  assert.equal(table.getCell('E2').value, 'Unassigned (Inventory)');
  assert.equal(table.getCell('E3').value, 'Assigned');
});

test('computer creation stores its selected laptop category without assigning an employee', async () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const categoryId = '11111111-1111-4111-8111-111111111111';
  let created;
  stub(AssetCategory, 'findByPk', async id => { assert.equal(id, categoryId); return { id, name: 'Laptop', type: 'HARDWARE', isActive: true }; });
  stub(System, 'create', async data => { created = { id: 'laptop-system', ...data }; return created; });
  stub(System, 'findByPk', async () => created);
  const service = new SystemsService({ transaction: async fn => fn(transaction) }, { log: async () => {} });
  const result = await service.create({ name: 'Finance laptop', systemTag: 'LAP-001', categoryId }, actor);
  assert.equal(result.categoryId, categoryId);
  assert.equal(result.employeeId, null);
});

test('computer categories must exist, be active hardware, and match the organisation', async () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const service = new SystemsService({ transaction: async fn => fn(transaction) }, { log: async () => {} });
  let category;
  stub(AssetCategory, 'findByPk', async () => category);
  const create = categoryId => service.create({ name: 'Laptop', systemTag: 'LAP-001', categoryId }, actor);
  await assert.rejects(create(undefined), /Select a computer category/);
  await assert.rejects(create('missing'), /category not found/);
  category = { type: 'SOFTWARE', isActive: true };
  await assert.rejects(create('software'), /active hardware category/);
  category = { type: 'HARDWARE', isActive: false };
  await assert.rejects(create('inactive'), /active hardware category/);
  category = { name: 'Desktop PC', type: 'HARDWARE', isActive: true, organisationId: 'other' };
  await assert.rejects(create('other-company'), /selected organisation/);
});

test('computer category can be corrected on an existing record without changing its employee', async () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const record = { id: 'system', categoryId: null, employeeId: 'employee', organisationId: null,
    update: async data => Object.assign(record, data) };
  stub(System, 'findByPk', async () => record);
  stub(AssetCategory, 'findByPk', async () => ({ name: 'Desktop PC', type: 'HARDWARE', isActive: true }));
  const service = new SystemsService({ transaction: async fn => fn(transaction) }, { log: async () => {} });
  await service.update('system', { categoryId: 'laptops' }, actor);
  assert.equal(record.categoryId, 'laptops');
  assert.equal(record.employeeId, 'employee');
  await assert.rejects(service.update('system', { categoryId: null }, actor), /Select a computer category/);
});

test('computer category selection allows only Desktop PC and Laptop', async () => {
  const service = new SystemsService({}, {});
  let name;
  stub(AssetCategory, 'findByPk', async () => ({ name, type: 'HARDWARE', isActive: true }));
  for (name of ['Desktop PC', 'Laptop', ' desktop pc ', 'LAPTOP']) {
    await service.validateCategory('category', null, { LOCK: { UPDATE: 'UPDATE' } });
  }
  for (name of ['Mobile Phone', 'Camera', 'Mobile charger', 'Monitor', 'Tablet', 'INFINIX GT 30 PRO']) {
    await assert.rejects(service.validateCategory('category', null, { LOCK: { UPDATE: 'UPDATE' } }), /must be Desktop PC or Laptop/);
  }
});
