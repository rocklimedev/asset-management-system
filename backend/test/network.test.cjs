const {networkUuid: U, isNetworkUuid, OFFICE_NETWORK_ID}=require('../dist/modules/network/network.ids');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateNetwork}=require('../dist/modules/network/network.validation');
const {upgradeNetwork}=require('../dist/modules/network/network.legacy');
const {persistTopology}=require('../dist/modules/network/network.storage');
const {NetworkController}=require('../dist/modules/network/network.controller');
const seed=require('../seeds/network-map.json'),legacy=require('../seeds/network-map.legacy.json');
test('source data and confirmed numbered ports survive conversion',()=>{
  validateNetwork(seed);assert.equal(seed.racks.length,7);assert.equal(seed.devices.length,51);assert.equal(seed.connections.length,50);
  assert.equal(seed.connections.filter(c=>c.kind==='uplink').length,7);
  assert.equal(seed.connections.filter(c=>c.verification==='assumed').length,1);
  for(const rack of legacy.racks){let number=0;for(const leaf of legacy.leaves.filter(l=>l.p===rack.uid)){
    const c=seed.connections.find(c=>c.id===U('connections','access-'+leaf.uid));number++;
    assert.equal(seed.ports.find(p=>p.id===c.source.portId).label,String(number));
    assert.equal(c.source.deviceId,U('devices',rack.uid));assert.equal(c.target.deviceId,U('devices',leaf.uid));assert.equal(c.cableCode,leaf.c);assert.equal(c.verification,'confirmed');
    assert.equal(seed.devices.find(v=>v.id===U('devices',leaf.uid)).name,leaf.n);
  }}
  assert.deepEqual(upgradeNetwork(legacy),seed);assert.deepEqual(upgradeNetwork(seed),seed);
});
test('uplink cable codes are not mistaken for physical port assignments',()=>{
  for(const c of seed.connections.filter(c=>c.kind==='uplink')){assert.equal(c.source.portId,null);assert.equal(c.target.portId,null);}
  const camera=seed.devices.find(v=>v.id===U('devices','FF_MECAM2')),rack=seed.racks.find(r=>r.id===U('racks','rack-FF'));assert.notEqual(camera.areaId,rack.areaId);
});
test('rejects orphan locations, invalid rack placement, duplicate IDs, cyclic areas and invalid coordinates',()=>{
  for(const mutate of [d=>d.racks[0].areaId='missing',d=>d.devices[0].areaId=d.areas.at(-1).id,
    d=>d.devices[1].id=d.devices[0].id,d=>d.areas[0].parentId=d.areas[0].id,d=>d.devices[0].x=Infinity,
    d=>d.settings.unitsPerMeter=0,d=>d.devices[0].kind='unsupported',d=>delete d.areas[0].name]){
    const d=structuredClone(seed);mutate(d);assert.throws(()=>validateNetwork(d));
  }
});
test('rejects reused ports, wrong device ownership, incompatible media and duplicate port labels',()=>{
  for(const mutate of [d=>d.connections[1].source.portId=d.connections[0].source.portId,
    d=>d.connections[0].source.deviceId=U('devices','FF'),d=>d.ports[0].medium='fiber',
    d=>d.ports[1].label=d.ports[0].label,d=>d.connections[0].target.deviceId='missing']){
    const d=structuredClone(seed);mutate(d);assert.throws(()=>validateNetwork(d));
  }
});
test('unassigned uplink ports can be assigned without changing access port numbering',()=>{
  const d=structuredClone(seed),free=d.ports.find(p=>p.deviceId===U('devices','UG')&&!d.connections.some(c=>c.source.portId===p.id||c.target.portId===p.id));
  d.connections.find(c=>c.id===U('connections','k0')).source.portId=free.id;validateNetwork(d);
  assert.equal(d.connections.find(c=>c.id===U('connections','access-UG_MECAM1')).source.portId,U('ports','port-UG-1'));
});
test('stale revision cannot persist graph, update revision or audit',async()=>{
  const controller=new NetworkController({sequelize:{transaction:cb=>cb({LOCK:{UPDATE:'UPDATE'}}),query:()=>assert.fail('no persistence')},findByPk:async()=>({revision:2})},{log:()=>assert.fail('no audit')});
  await assert.rejects(controller.save({revision:1,document:seed},{id:'user'}),e=>e.getStatus()===409);
});
test('graph, revision and audit use the same transaction',async()=>{
  const tx={LOCK:{UPDATE:'UPDATE'}},queries=[];
  const map={id:OFFICE_NETWORK_ID,document:seed,revision:1,update:async(changes,options)=>{assert.equal(options.transaction,tx);Object.assign(map,changes);}};
  let audited=false;
  const controller=new NetworkController({sequelize:{transaction:cb=>cb(tx),query:async(sql,options)=>{assert.equal(options.transaction,tx);queries.push(sql);}},findByPk:async()=>map},{log:async(entry,t)=>{assert.equal(t,tx);assert.equal(entry.metadata.revision,2);audited=true;}});
  const result=await controller.save({revision:1,document:seed},{id:'user'});assert.equal(result.revision,2);assert.equal(audited,true);
  assert.equal(queries.filter(sql=>sql.startsWith('INSERT INTO network_connections')).length,50);
});
test('storage failure aborts before revision update or audit',async()=>{
  const controller=new NetworkController({sequelize:{transaction:cb=>cb({LOCK:{UPDATE:'UPDATE'}}),query:async()=>{throw new Error('database failure');}},findByPk:async()=>({id:OFFICE_NETWORK_ID,document:seed,revision:1,update:()=>assert.fail('no revision update')})},{log:()=>assert.fail('no audit')});
  await assert.rejects(controller.save({revision:1,document:seed},{id:'user'}),/database failure/);
});
test('legacy save backs up the previous map before writing relational topology',async()=>{
  const queries=[],map={id:OFFICE_NETWORK_ID,document:legacy,revision:1,update:async changes=>Object.assign(map,changes)};
  const controller=new NetworkController({sequelize:{transaction:cb=>cb({LOCK:{UPDATE:'UPDATE'}}),query:async(sql,options)=>queries.push([sql,options.replacements])},findByPk:async()=>map},{log:async()=>{}});
  await controller.save({revision:1,document:seed},{id:'user'});
  assert.match(queries[0][0],/network_map_legacy_backups/);assert.deepEqual(JSON.parse(queries[0][1][2]),legacy);
});
test('imports reject invalid data without altering the current graph',()=>{
  const controller=new NetworkController({},{});assert.throws(()=>controller.validate({document:{racks:[]}}),e=>e.getStatus()===400);
  assert.deepEqual(controller.validate({document:legacy}).document,seed);
});
test('relational writes reference actual device and port IDs',async()=>{
  const calls=[];await persistTopology(async(sql,values)=>calls.push({sql,values}),OFFICE_NETWORK_ID,seed);
  const cable=calls.find(c=>c.sql.startsWith('INSERT INTO network_connections')&&c.values[1]===U('connections','access-UG_MECAM1'));
  assert.deepEqual(cable.values.slice(0,8),[OFFICE_NETWORK_ID,U('connections','access-UG_MECAM1'),U('devices','UG'),U('ports','port-UG-1'),U('devices','UG_MECAM1'),null,'MECAM1','access']);
});

test('UUIDs cover every entity and relationship and are stable across legacy upgrades',()=>{
 assert.ok(isNetworkUuid(OFFICE_NETWORK_ID));
 for(const collection of ['areas','racks','devices','ports','connections'])for(const item of seed[collection])assert.ok(isNetworkUuid(item.id),collection);
 for(const r of seed.racks)assert.ok(isNetworkUuid(r.areaId));
 for(const c of seed.connections)for(const end of [c.source,c.target]){assert.ok(isNetworkUuid(end.deviceId));if(end.portId)assert.ok(isNetworkUuid(end.portId));}
 const original=structuredClone(seed);const converted=upgradeNetwork(original);assert.deepEqual(converted,seed);assert.deepEqual(original,seed);
 const {randomUUID}=require('node:crypto');const real=randomUUID();assert.equal(U('devices',real),real);
});
test('raw non-UUID identifiers are rejected at the write boundary',()=>{
 const d=structuredClone(seed);d.racks[0].id='rack-UG';assert.throws(()=>validateNetwork(d),/unique UUIDs/);
});
test('version 2 string IDs and all foreign references upgrade together',()=>{
 const d=structuredClone(seed),device=d.devices[0],old=device.id;
 device.id='legacy-core';for(const p of d.ports)if(p.deviceId===old)p.deviceId='legacy-core';
 for(const c of d.connections)for(const end of [c.source,c.target])if(end.deviceId===old)end.deviceId='legacy-core';
 const upgraded=upgradeNetwork(d);validateNetwork(upgraded);
 const id=U('devices','legacy-core');assert.equal(upgraded.devices[0].id,id);
 assert.ok(upgraded.ports.some(p=>p.deviceId===id));assert.ok(upgraded.connections.some(c=>c.source.deviceId===id||c.target.deviceId===id));
});
const fs=require('node:fs');
const {buildNetworkSeed,literal}=require('../scripts/export-network-seed.cjs');
test('direct SQL seed matches JSON and contains every relational row with unchanged UUIDs',()=>{
 const sql=buildNetworkSeed(seed);
 assert.equal(fs.readFileSync(require('node:path').join(__dirname,'../seeds/network-map.sql'),'utf8'),sql);
 assert.ok(sql.includes(literal(JSON.stringify(seed))));
 for(const [collection,table] of [['areas','network_areas'],['racks','network_racks'],['devices','network_devices'],['ports','network_ports'],['connections','network_connections']]){
  const block=sql.match(new RegExp('INSERT INTO '+table+' \\([^;]+?;'))[0];
  assert.equal((block.match(/^      \(/gm)||[]).length,seed[collection].length);
  for(const item of seed[collection])assert.ok(block.includes(literal(JSON.stringify(item))));
 }
 assert.match(sql,/DECLARE EXIT HANDLER FOR SQLEXCEPTION[\s\S]*ROLLBACK;[\s\S]*RESIGNAL;/);
 assert.match(sql,/IF v_inserted THEN/);
 assert.doesNotMatch(sql,/DELETE FROM|REPLACE INTO|FOREIGN_KEY_CHECKS/);
});
test('SQL text literals preserve quotes, Unicode and JSON backslashes in either SQL mode',()=>{
 assert.equal(literal("Ajay's · office"),"_utf8mb4'Ajay''s · office'");
 const value='Cable \\ route\n'+JSON.stringify({notes:'one\ntwo'});
 const encoded=literal(value),hex=encoded.match(/^CONVERT\(X'([0-9a-f]+)' USING utf8mb4\)$/)[1];
 assert.equal(Buffer.from(hex,'hex').toString('utf8'),value);
 assert.equal(literal(null),'NULL');
});
test('SQL export validates references and orders nested area assignments before equipment',()=>{
 const d=structuredClone(seed);d.areas[1].parentId=d.areas[0].id;
 const sql=buildNetworkSeed(d);assert.ok(sql.indexOf('UPDATE network_areas')<sql.indexOf('INSERT INTO network_racks'));
 d.ports[0].deviceId='missing';assert.throws(()=>buildNetworkSeed(d));
});
const {upgradeNetworkUuids}=require('../dist/modules/network/network.uuid-migration');
const schema=['009_network_maps.sql','010_network_topology.sql'].map(file=>fs.readFileSync(require('node:path').join(__dirname,'../migrations',file),'utf8')).join('\n');
function migrationDb(document=legacy){
 const calls=[];let committed=false,rolledBack=false,dropped=false;
 const definitions=[...schema.matchAll(/CREATE TABLE IF NOT EXISTS (network_\w+)\s*\(([\s\S]*?)\) ENGINE=InnoDB;/g)];
 const columns=definitions.flatMap(m=>[...m[2].matchAll(/^\s*(\w+) CHAR\(36\)/gm)].map(c=>({tableName:m[1],columnName:c[1],dataType:'varchar',size:100,collationName:'ascii_bin'})));
 const keys=[{tableName:'network_racks',constraintName:'old_rack_fk',columnName:'area_id',targetTable:'network_areas',targetColumn:'id'}];
 const db={beginTransaction:async()=>calls.push('begin'),commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},
  execute:async(sql,values)=>{calls.push({sql,values});if(sql==='SELECT * FROM network_maps ORDER BY id FOR UPDATE')return [[{id:'office',document,revision:7,createdAt:new Date('2026-01-01')}]];return [{}];},
  query:async(sql)=>{calls.push({sql});if(sql.includes('information_schema.COLUMNS'))return [columns];if(sql.includes('information_schema.KEY_COLUMN_USAGE'))return [dropped?[]:keys];if(sql.includes('DROP FOREIGN KEY'))dropped=true;return [{}];}};
 return {db,calls,state:()=>({committed,rolledBack})};
}
test('existing map UUID upgrade preserves graph and backup before narrowing ID columns',async()=>{
 const fake=migrationDb();await upgradeNetworkUuids(fake.db,schema);assert.equal(fake.state().committed,true);
 const insert=fake.calls.find(c=>c.sql?.startsWith('INSERT INTO network_maps'));
 assert.equal(insert.values[0],OFFICE_NETWORK_ID);assert.equal(insert.values[2],8);assert.deepEqual(JSON.parse(insert.values[1]),seed);
 const backup=fake.calls.find(c=>c.sql?.startsWith('INSERT IGNORE INTO network_map_legacy_backups'));assert.equal(backup.values[0],OFFICE_NETWORK_ID);assert.deepEqual(JSON.parse(backup.values[2]),legacy);
 const narrow=fake.calls.findIndex(c=>c.sql?.includes(' MODIFY ')),drop=fake.calls.findIndex(c=>c.sql?.includes('DROP FOREIGN KEY'));
 assert.ok(narrow>drop&&drop>=0);assert.ok(fake.calls.some(c=>c.sql?.includes('ADD CONSTRAINT')));
 const cable=fake.calls.find(c=>c.sql?.startsWith('INSERT INTO network_connections'));assert.ok(isNetworkUuid(cable.values[1]));assert.ok(isNetworkUuid(cable.values[2]));
});
test('failed UUID conversion rolls back without changing the schema',async()=>{
 const invalid=structuredClone(seed);invalid.devices[0].areaId='missing';const fake=migrationDb(invalid);
 await assert.rejects(upgradeNetworkUuids(fake.db,schema));assert.equal(fake.state().rolledBack,true);assert.equal(fake.state().committed,false);assert.equal(fake.calls.some(c=>c.sql?.startsWith('ALTER TABLE')),false);
});
