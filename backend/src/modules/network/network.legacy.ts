import type { Area, Device, NetworkDocument } from './network.types';
import { uuidNetworkDocument } from './network.ids';
export function upgradeNetwork(input: any): NetworkDocument {
  if (input?.version === 2) return uuidNetworkDocument(input);
  const areas: Area[] = [];
  const area = (name: string, x: number, y: number) => {
    let found = areas.find(a => a.name === name);
    if (!found) { found = { id: `area-${areas.length + 1}`, name, parentId: null, notes: '', x, y }; areas.push(found); }
    return found.id;
  };
  const names: Record<string,string> = { UGG:'Upper Ground', UG:'Upper Ground', FF:'First Floor', AJ:'Ajay Sir Cabin', CM:'CM Counter', SO:'Staff Office', EM:'Embark Showroom', RR:'Upper Ground' };
  const racks: NetworkDocument['racks'] = [], devices: Device[] = [], ports: NetworkDocument['ports'] = [], connections: NetworkDocument['connections'] = [];
  for (const r of input.racks) {
    const areaId = area(names[r.uid] || r.n, r.x, r.y - 150), rackId = r.t === 'rtr' ? null : `rack-${r.uid}`;
    if (rackId) racks.push({ id: rackId, name: r.n, areaId, notes: r.s || '', x:r.x, y:r.y });
    devices.push({ id:r.uid, name:r.n, code:r.uid, kind:r.t==='rtr'?'router':r.t==='core'?'core':'switch', areaId, rackId, model:'', ip:'', mac:'', notes:r.s || '', x:r.x, y:r.y });
    const count = Number(/(\d+)-pot/.exec(r.s || '')?.[1] || input.leaves.filter((l: any) => l.p===r.uid).length);
    for(let i=1;i<=count;i++) ports.push({ id:`port-${r.uid}-${i}`,deviceId:r.uid,label:String(i),medium:'copper',poe:r.t!=='rtr',notes:'Numbered port from the source map.' });
  }
  const ordinal: Record<string,number> = {};
  const kinds: Record<string,Device['kind']> = {cam:'camera',wifi:'wifi',nvr:'nvr',tv:'tv',rtr:'router',place:'outlet'};
  for(const l of input.leaves) {
    const parent = devices.find(d=>d.id===l.p)!;
    // Preserve each source location label independently of the serving rack's area.
    const areaId = area(l.n, l.x, l.y - 70);
    devices.push({id:l.uid,name:l.n,code:l.c,kind:kinds[l.t] || 'outlet',areaId,rackId:null,model:'',ip:'',mac:'',notes:l.notes || '',x:l.x,y:l.y});
    const number = ordinal[l.p] = (ordinal[l.p] || 0) + 1;
    connections.push({id:`access-${l.uid}`,source:{deviceId:parent.id,portId:`port-${l.p}-${number}`},target:{deviceId:l.uid,portId:null},kind:'access',cableCode:l.c,medium:'copper',status:'unknown',verification:'confirmed',notes:'Source switch port confirmed from the HTML. Destination port and live status were not recorded.'});
  }
  for (const [key,kind] of [['links','uplink'],['xlinks','crosslink']] as const) {
    for (const l of input[key] || []) connections.push({id:l.uid,source:{deviceId:l.a,portId:null},target:{deviceId:l.b,portId:null},kind,cableCode:l.c || '',medium:'unknown',status:'unknown',verification:l.assume?'assumed':'unverified',notes:'Physical ports were not specified in the original map.'});
  }
  return uuidNetworkDocument({version:2,areas,racks,devices,ports,connections,dims:input.dims || [],settings:input.settings || {unitsPerMeter:100}});
}
