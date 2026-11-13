const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {traceCore,portConnection,deletionReason,endLabel,withinArea,uid}=require('../src/components/network/topology.ts');
const seed=require('../../backend/seeds/network-map.json');
const {networkUuid:U,isNetworkUuid}=require('../../backend/src/modules/network/network.ids.ts');
const {moveRack}=require('../src/components/network/topology.ts');

test('rack movement carries equipment and connected unassigned devices without moving other racks',()=>{
 const device=seed.devices[0], cable=seed.connections[0];
 const d={...structuredClone(seed),racks:[{...seed.racks[0],id:'rack-a',x:10,y:20},{...seed.racks[0],id:'rack-b',x:500,y:600}],devices:[
  {...device,id:'switch-a',rackId:'rack-a',x:10,y:20},
  {...device,id:'camera',rackId:null,x:100,y:200},
  {...device,id:'endpoint',rackId:null,x:150,y:250},
  {...device,id:'switch-b',rackId:'rack-b',x:500,y:600},
  {...device,id:'other-camera',rackId:null,x:700,y:800},
 ],connections:[['switch-a','camera'],['camera','endpoint'],['endpoint','camera'],['switch-a','switch-b'],['switch-b','other-camera']].map(([a,b],i)=>({...cable,id:String(i),source:{deviceId:a,portId:null},target:{deviceId:b,portId:null}}))};
 const original=structuredClone(d), moved=moveRack(d,'rack-a',40,-30);
 assert.deepEqual(d,original);
 assert.equal(moved.racks[0].x,50);assert.equal(moved.racks[0].y,-10);
 for(const id of ['switch-a','camera','endpoint']) {
  const before=d.devices.find(v=>v.id===id), after=moved.devices.find(v=>v.id===id);
  assert.equal(after.x,before.x+40);assert.equal(after.y,before.y-30);
 }
 for(const id of ['switch-b','other-camera']) assert.deepEqual(moved.devices.find(v=>v.id===id),d.devices.find(v=>v.id===id));
 assert.deepEqual(moved.racks[1],d.racks[1]);assert.deepEqual(moved.connections,d.connections);
 const second=moveRack(d,'rack-a',50,-20);
 assert.equal(second.devices.find(v=>v.id==='camera').x,150);
});
test('traces an endpoint across racks to the core, including marked assumed links',()=>{
 const path=traceCore(seed,U('devices','SO_ACECAM'));assert.ok(path);assert.equal(path[0].id,U('connections','access-SO_ACECAM'));assert.ok(path.some(c=>c.verification==='assumed'));assert.equal(path.at(-1).id,U('connections','k6'));
});

test('compact rack movement arranges scattered endpoints in bounded rings and preserves port assignments',()=>{
 const rack={...seed.racks[0],id:'rack',x:0,y:0};
 const equipment={...seed.devices[0],id:'switch',rackId:'rack',x:0,y:0};
 const endpoints=Array.from({length:24},(_,i)=>({...seed.devices[0],id:`endpoint-${i}`,rackId:null,x:10000+i*500,y:-10000}));
 const d={...structuredClone(seed),racks:[rack],devices:[equipment,...endpoints],connections:endpoints.map((v,i)=>({...seed.connections[0],id:`cable-${i}`,source:{deviceId:'switch',portId:'switch-port'},target:{deviceId:v.id,portId:null}})),ports:[]};
 const original=structuredClone(d), moved=moveRack(d,'rack',600,400,true);
 assert.deepEqual(d,original);assert.deepEqual(moved.connections,d.connections);
 for(const v of moved.devices.filter(v=>!v.rackId)) {
  const distance=Math.hypot(v.x-600,v.y-400);
  assert.ok(distance>=374 && distance<1200);
 }
 const placed=moved.devices.filter(v=>!v.rackId);
 for(let i=0;i<placed.length;i++) for(let j=i+1;j<placed.length;j++) assert.ok(Math.hypot(placed[i].x-placed[j].x,placed[i].y-placed[j].y)>=259);
 const movedAgain=moveRack(moved,'rack',100,50,true);
 for(let i=0;i<moved.devices.length;i++) {
  assert.ok(Math.abs(movedAgain.devices[i].x-moved.devices[i].x-100)<1e-8);
  assert.ok(Math.abs(movedAgain.devices[i].y-moved.devices[i].y-50)<1e-8);
 }
});
test('disconnected devices have no recorded core route',()=>{const d=structuredClone(seed);d.connections=d.connections.filter(c=>c.id!==U('connections','k4'));assert.equal(traceCore(d,U('devices','SO_ACECAM')),null);});
test('planned connections are excluded from documented reachability',()=>{const d=structuredClone(seed);d.connections.find(c=>c.id===U('connections','k6')).status='planned';assert.equal(traceCore(d,U('devices','SO_ACECAM')),null);});
test('port occupancy and deletion rules preserve connected entities',()=>{
 assert.equal(portConnection(seed,U('ports','port-UG-1')).id,U('connections','access-UG_MECAM1'));assert.equal(portConnection(seed,U('ports','port-UG-9')),undefined);
 assert.ok(deletionReason(seed,'ports',U('ports','port-UG-1')));assert.equal(deletionReason(seed,'ports',U('ports','port-UG-9')),null);
 assert.ok(deletionReason(seed,'racks',U('racks','rack-UG')));assert.ok(deletionReason(seed,'devices',U('devices','UG_MECAM1')));assert.ok(deletionReason(seed,'areas',seed.racks[0].areaId));
});
test('connection label includes the physical area and assigned port',()=>{
 const c=seed.connections.find(c=>c.id===U('connections','access-UG_MECAM1'));assert.match(endLabel(seed,c.source),/Port 1/);assert.match(endLabel(seed,c.target),/Main Entry Gate/);assert.match(endLabel(seed,c.target),/Port unassigned/);
});

test('parent area filters include nested locations but not unrelated areas',()=>{const d=structuredClone(seed);const root=d.areas[0],child=d.areas.at(-1);child.parentId=root.id;assert.equal(withinArea(d,child.id,root.id),true);assert.equal(withinArea(d,root.id,child.id),false);assert.equal(withinArea(d,child.id,''),true);});

test('new editor entities receive bare UUIDs',()=>{const value=uid();assert.ok(isNetworkUuid(value));assert.equal(value.length,36);assert.notEqual(uid(),value);});
