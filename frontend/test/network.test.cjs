const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {traceCore,portConnection,deletionReason,endLabel,withinArea,uid}=require('../src/components/network/topology.ts');
const seed=require('../../backend/seeds/network-map.json');
const {networkUuid:U,isNetworkUuid}=require('../../backend/src/modules/network/network.ids.ts');
const {moveRack,moveArea}=require('../src/components/network/topology.ts');
const {condenseRack,condenseArea,condenseDevices,rackGroup}=require('../src/components/network/topology.ts');

test('condense devices packs rack equipment and endpoints without changing rack positions or external devices',()=>{
 const d=structuredClone(seed), base=d.devices[0], rack=d.racks[0], area=d.areas[0];
 d.areas=[{...area,id:'root',parentId:null},{...area,id:'child',parentId:'root'},{...area,id:'outside',parentId:null}];
 d.racks=[{...rack,id:'a',areaId:'root',x:100,y:200},{...rack,id:'b',areaId:'child',x:2000,y:200},{...rack,id:'other',areaId:'outside',x:5000,y:5000}];
 d.devices=[['one','a','root'],['two','a','root'],['child-switch','b','child'],['external','other','outside'],['endpoint',null,'root'],['shared',null,'root']].map(([id,rackId,areaId],i)=>({...base,id,name:id,rackId,areaId,x:10000+i*500,y:10000}));
 d.connections=[['one','endpoint'],['one','shared'],['shared','external']].map(([a,b],i)=>({...seed.connections[0],id:String(i),source:{deviceId:a,portId:null},target:{deviceId:b,portId:null}}));
 d.ports=Array.from({length:48},(_,i)=>({...seed.ports[0],id:`port-${i}`,deviceId:'one'}));
 const original=structuredClone(d), packed=condenseDevices(d,'racks','a');
 assert.deepEqual(d,original); assert.deepEqual(packed.racks,d.racks); assert.deepEqual(packed.areas,d.areas);
 assert.deepEqual(packed.connections,d.connections); assert.deepEqual(packed.ports,d.ports);
 assert.equal(packed.devices[0].x,100); assert.equal(packed.devices[0].y,200);
 assert.equal(packed.devices[1].x,100); assert.ok(packed.devices[1].y>=200+262+12);
 assert.ok(Math.hypot(packed.devices[4].x-100,packed.devices[4].y-200)<500);
 for(const id of ['child-switch','external','shared']) assert.deepEqual(packed.devices.find(v=>v.id===id),d.devices.find(v=>v.id===id));
 assert.deepEqual(condenseDevices(packed,'racks','a'),packed);
 const all=condenseDevices(d,'areas','root');
 assert.equal(all.devices.find(v=>v.id==='child-switch').x,2000);
 assert.equal(all.devices.find(v=>v.id==='child-switch').y,200);
 assert.deepEqual(all.racks,d.racks); assert.deepEqual(all.areas,d.areas);
 assert.deepEqual(all.devices.find(v=>v.id==='external'),d.devices.find(v=>v.id==='external'));
 assert.deepEqual(condenseDevices(all,'areas','root'),all);
 assert.deepEqual(condenseDevices(d,'areas','missing'),d);
});

test('area condensation includes nested racks and loose devices while preserving external and shared components',()=>{
 const d=structuredClone(seed), base=d.devices[0], area=d.areas[0], rack=d.racks[0];
 d.areas=[{...area,id:'root',parentId:null,x:10,y:20},{...area,id:'child',parentId:'root',x:9000,y:9000},{...area,id:'outside',parentId:null,x:-9000,y:-9000}];
 d.racks=[{...rack,id:'r1',areaId:'root',x:8000,y:8000},{...rack,id:'r2',areaId:'child',x:9000,y:9000},{...rack,id:'r3',areaId:'outside',x:-9000,y:-9000}];
 d.devices=[['switch','r1','root'],['child-switch','r2','child'],['external','r3','outside'],['local',null,'root'],['loose',null,'child'],['shared',null,'root'],['bridge',null,'root'],['outside-end',null,'outside']].map(([id,rackId,areaId],i)=>({...base,id,rackId,areaId,x:10000+i*500,y:10000}));
 d.connections=[['switch','local'],['switch','shared'],['shared','bridge'],['bridge','external'],['switch','external'],['switch','outside-end']].map(([a,b],i)=>({...seed.connections[0],id:String(i),source:{deviceId:a,portId:null},target:{deviceId:b,portId:null}}));
 d.ports=Array.from({length:48},(_,i)=>({...seed.ports[0],id:`port-${i}`,deviceId:'switch'}));
 const original=structuredClone(d), compact=condenseArea(d,'root');
 assert.deepEqual(d,original); assert.deepEqual(compact.connections,d.connections); assert.deepEqual(compact.ports,d.ports);
 for(const id of ['external','shared','bridge','outside-end']) assert.deepEqual(compact.devices.find(v=>v.id===id),d.devices.find(v=>v.id===id));
 assert.deepEqual(compact.racks,d.racks); assert.deepEqual(compact.areas,d.areas);
 for(const v of d.devices.filter(v=>v.rackId && v.areaId!=='outside')) {
  const rack=d.racks.find(r=>r.id===v.rackId), after=compact.devices.find(n=>n.id===v.id);
  assert.equal(after.x,rack.x); assert.equal(after.y,rack.y);
 }
 assert.equal(compact.areas[0].x,10); assert.equal(compact.areas[0].y,20);
 assert.notDeepEqual(compact.devices.find(v=>v.id==='local'),d.devices.find(v=>v.id==='local'));
 assert.notDeepEqual(compact.devices.find(v=>v.id==='loose'),d.devices.find(v=>v.id==='loose'));
 assert.deepEqual(condenseArea(compact,'root'),compact);
 assert.deepEqual(condenseArea(d,'missing'),d);
});

test('area condensation terminates for cyclic area ancestry and empty areas',()=>{
 const d=structuredClone(seed), base=d.areas[0];
 d.areas=[{...base,id:'a',parentId:'b',x:0,y:0},{...base,id:'b',parentId:'a',x:1000,y:1000}];
 d.devices=[]; d.racks=[]; d.ports=[]; d.connections=[];
 const compact=condenseArea(d,'a');
 assert.deepEqual(compact,d);
});

test('moving an area condenses rack endpoints and standalone devices throughout its hierarchy',()=>{
 const d=structuredClone(seed), area=d.areas[0], rack=d.racks[0], base=d.devices[0];
 d.areas=[{...area,id:'root',parentId:null,x:100,y:100},{...area,id:'child',parentId:'root',x:1500,y:100},{...area,id:'outside',parentId:null,x:5000,y:5000}];
 d.racks=[{...rack,id:'a',areaId:'root',x:100,y:300},{...rack,id:'b',areaId:'child',x:1500,y:300},{...rack,id:'external',areaId:'outside',x:5000,y:5000}];
 d.devices=[['switch-a','a','root',100,300],['switch-b','b','child',1500,300],['switch-out','external','outside',5000,5000],['camera',null,'root',20000,20000],['child-camera',null,'child',25000,25000],['loose',null,'child',30000,30000],['shared',null,'root',500,900],['outside-end',null,'outside',8000,8000]].map(([id,rackId,areaId,x,y])=>({...base,id,rackId,areaId,x,y}));
 d.connections=[['switch-a','camera'],['switch-b','child-camera'],['switch-a','shared'],['shared','switch-out']].map(([a,b],i)=>({...seed.connections[0],id:String(i),source:{deviceId:a,portId:null},target:{deviceId:b,portId:null}}));
 d.ports=[];
 const original=structuredClone(d), moved=moveArea(d,'root',80,-40);
 assert.deepEqual(d,original); assert.deepEqual(moved.connections,d.connections); assert.deepEqual(moved.ports,d.ports);
 for(const id of ['root','child']) {
  const before=d.areas.find(a=>a.id===id), after=moved.areas.find(a=>a.id===id);
  assert.equal(after.x,before.x+80); assert.equal(after.y,before.y-40);
 }
 for(const id of ['a','b']) {
  const before=d.racks.find(a=>a.id===id), after=moved.racks.find(a=>a.id===id);
  assert.equal(after.x,before.x+80); assert.equal(after.y,before.y-40);
 }
 for(const [device,rackId] of [['camera','a'],['child-camera','b']]) {
  const v=moved.devices.find(v=>v.id===device), r=moved.racks.find(r=>r.id===rackId);
  assert.ok(Math.hypot(v.x-r.x,v.y-r.y)<1000);
 }
 assert.equal(moved.devices.find(v=>v.id==='loose').x,1580);
 for(const id of ['switch-out','outside-end']) assert.deepEqual(moved.devices.find(v=>v.id===id),d.devices.find(v=>v.id===id));
 const shared=moved.devices.find(v=>v.id==='shared'); assert.equal(shared.x,580); assert.equal(shared.y,860);
 assert.deepEqual(moved.racks[2],d.racks[2]); assert.deepEqual(moved.areas[2],d.areas[2]);
 assert.deepEqual(condenseArea(moved,'root'),moved);
 const again=moveArea(moved,'root',20,30);
 for(const v of moved.devices.filter(v=>v.areaId!=='outside')) {
  const after=again.devices.find(a=>a.id===v.id);
  assert.ok(Math.abs(after.x-v.x-20)<1e-8); assert.ok(Math.abs(after.y-v.y-30)<1e-8);
 }
 assert.deepEqual(moveArea(d,'missing',100,100),d);
});

test('condensing packs only dedicated rack components and preserves all wiring',()=>{
 const d=structuredClone(seed), base=d.devices[0];
 d.racks=[{...d.racks[0],id:'a',x:0,y:0},{...d.racks[0],id:'b',x:900,y:900}];
 d.devices=[['a1','a'],['a2','a'],['b1','b'],['local',null],['shared',null],['bridge',null],['isolated',null]].map(([id,rackId],i)=>({...base,id,rackId,x:5000+i*500,y:7000}));
 d.connections=[['a1','local'],['a1','shared'],['shared','bridge'],['bridge','b1'],['a1','b1']].map(([a,b],i)=>({...seed.connections[0],id:String(i),source:{deviceId:a,portId:null},target:{deviceId:b,portId:null}}));
 d.ports=[];
 const original=structuredClone(d), compact=condenseRack(d,'a');
 assert.deepEqual([...rackGroup(d,'a')].sort(),['a1','a2','local']);
 assert.deepEqual(d,original); assert.deepEqual(compact.connections,d.connections); assert.deepEqual(compact.ports,d.ports);
 for(const id of ['b1','shared','bridge','isolated']) assert.deepEqual(compact.devices.find(v=>v.id===id),d.devices.find(v=>v.id===id));
 assert.deepEqual(compact.racks,d.racks);
 assert.equal(compact.devices[0].x,0); assert.equal(compact.devices[0].y,0);
 assert.equal(compact.devices[1].x,0); assert.equal(compact.devices[1].y,74);
 assert.ok(Math.hypot(compact.devices.find(v=>v.id==='local').x,compact.devices.find(v=>v.id==='local').y)<500);
 assert.notDeepEqual(compact.devices.find(v=>v.id==='local'),d.devices.find(v=>v.id==='local'));
 assert.deepEqual(condenseRack(compact,'a'),compact);
 const moved=moveRack(d,'a',10,20);
 assert.deepEqual(moved.devices.find(v=>v.id==='shared'),d.devices.find(v=>v.id==='shared'));
});

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
 for(const id of ['switch-a']) {
  const before=d.devices.find(v=>v.id===id), after=moved.devices.find(v=>v.id===id);
  assert.equal(after.x,before.x+40);assert.equal(after.y,before.y-30);
 }
 for(const id of ['switch-b','other-camera']) assert.deepEqual(moved.devices.find(v=>v.id===id),d.devices.find(v=>v.id===id));
 assert.deepEqual(moved.racks[1],d.racks[1]);assert.deepEqual(moved.connections,d.connections);
 const second=moveRack(d,'rack-a',50,-20);
 assert.deepEqual(second,condenseRack(second,'rack-a'));
 assert.deepEqual(moved,condenseRack(moved,'rack-a'));
 assert.ok(Math.hypot(moved.devices.find(v=>v.id==='camera').x-50,moved.devices.find(v=>v.id==='camera').y+10)<1000);
});
test('traces an endpoint across racks to the core, including marked assumed links',()=>{
 const path=traceCore(seed,U('devices','SO_ACECAM'));assert.ok(path);assert.equal(path[0].id,U('connections','access-SO_ACECAM'));assert.ok(path.some(c=>c.verification==='assumed'));assert.equal(path.at(-1).id,U('connections','k6'));
});

test('compact rack movement packs endpoints in a tight block beside the rack and preserves port assignments',()=>{
 const rack={...seed.racks[0],id:'rack',x:0,y:0};
 const equipment={...seed.devices[0],id:'switch',rackId:'rack',x:0,y:0};
 const endpoints=Array.from({length:24},(_,i)=>({...seed.devices[0],id:`endpoint-${i}`,rackId:null,x:10000+i*500,y:-10000}));
 const d={...structuredClone(seed),racks:[rack],devices:[equipment,...endpoints],connections:endpoints.map((v,i)=>({...seed.connections[0],id:`cable-${i}`,source:{deviceId:'switch',portId:'switch-port'},target:{deviceId:v.id,portId:null}})),ports:[]};
 const original=structuredClone(d), moved=moveRack(d,'rack',600,400);
 assert.deepEqual(d,original);assert.deepEqual(moved.connections,d.connections);
 for(const v of moved.devices.filter(v=>!v.rackId)) {
  const distance=Math.hypot(v.x-600,v.y-400);
  assert.ok(distance<500);
  assert.ok(v.x>=600+138 && v.x<=600+400);
 }
 const placed=moved.devices.filter(v=>!v.rackId);
 for(let i=0;i<placed.length;i++) for(let j=i+1;j<placed.length;j++) {
  assert.ok(Math.abs(placed[i].x-placed[j].x)>=240 || Math.abs(placed[i].y-placed[j].y)>=36);
 }
 const movedAgain=moveRack(moved,'rack',100,50);
 for(let i=0;i<moved.devices.length;i++) {
  assert.ok(Math.abs(movedAgain.devices[i].x-moved.devices[i].x-100)<1e-8);
  assert.ok(Math.abs(movedAgain.devices[i].y-moved.devices[i].y-50)<1e-8);
 }
});
test('tight rack layout leaves clearance for tall port cards without moving rack equipment',()=>{
 const d=structuredClone(seed), base=d.devices[0];
 d.racks=[{...d.racks[0],id:'rack',x:200,y:300}];
 d.devices=[{...base,id:'switch',rackId:'rack',x:200,y:300},...Array.from({length:8},(_,i)=>({...base,id:`end-${i}`,rackId:null,x:20000,y:20000}))];
 d.ports=d.devices.flatMap(v=>Array.from({length:v.id==='end-0'?48:5},(_,i)=>({...seed.ports[0],id:`${v.id}-${i}`,deviceId:v.id})));
 d.connections=d.devices.slice(1).map((v,i)=>({...seed.connections[0],id:String(i),source:{deviceId:'switch',portId:null},target:{deviceId:v.id,portId:null}}));
 const packed=condenseRack(d,'rack'), endpoints=packed.devices.slice(1);
 assert.deepEqual(packed.racks,d.racks); assert.deepEqual(packed.devices[0],d.devices[0]);
 assert.deepEqual(packed.ports,d.ports); assert.deepEqual(packed.connections,d.connections);
 for(let i=0;i<endpoints.length;i++) for(let j=i+1;j<endpoints.length;j++) {
  const a=endpoints[i],b=endpoints[j];
  const h=v=>62+Math.ceil(d.ports.filter(p=>p.deviceId===v.id).length/5)*20;
  assert.ok(Math.abs(a.x-b.x)>=220 || a.y+h(a)+12<=b.y || b.y+h(b)+12<=a.y);
 }
 assert.equal(Math.min(...endpoints.map(v=>v.x-100))-(d.racks[0].x+114),24);
 assert.deepEqual(condenseRack(packed,'rack'),packed);
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
