import { BadRequestException } from '@nestjs/common';
import type { NetworkDocument } from './network.types';
import { isNetworkUuid } from './network.ids';
export function validateNetwork(input: unknown): asserts input is NetworkDocument {
  const fail = (message: string): never => { throw new BadRequestException(message); };
  const d = input as NetworkDocument;
  const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1000000;
  const text = (v: unknown, max=2000): v is string => typeof v === 'string' && v.length <= max;
  const object = (v: unknown): v is Record<string,any> => !!v && typeof v==='object' && !Array.isArray(v);
  if (!object(d) || d.version!==2 || JSON.stringify(d).length>750000) fail('Expected a version 2 network document (maximum 750 KB).');
  for(const key of ['areas','racks','devices','ports','connections','dims'] as const)
    if(!Array.isArray(d[key]) || d[key].length>5000) fail('Invalid '+key+' collection.');
  const ids = new Set<string>();
  const identify = (v: any, positioned=false) => {
    if(!object(v) || !isNetworkUuid(v.id) || ids.has(v.id)) fail('All network entities require unique UUIDs.');
    ids.add(v.id);
    if(positioned && (!number(v.x) || !number(v.y))) fail('Invalid canvas position.');
    if(positioned && (!text(v.name,255) || !v.name.trim())) fail('A name is required.');
    if(!text(v.notes)) fail('Notes must be text (maximum 2000 characters).');
  };
  for(const a of d.areas) identify(a,true);
  const areas = new Map(d.areas.map(a=>[a.id,a]));
  for(const a of d.areas) {
    const visited=new Set([a.id]); let parent=a.parentId;
    while(parent!==null) { if(!areas.has(parent) || visited.has(parent)) fail('Area hierarchy contains a missing parent or a cycle.'); visited.add(parent); parent=areas.get(parent)!.parentId; }
  }
  for(const r of d.racks) { identify(r,true); if(!areas.has(r.areaId)) fail('Rack area does not exist.'); }
  const racks = new Map(d.racks.map(r=>[r.id,r]));
  for(const v of d.devices) {
    identify(v,true);
    if(!areas.has(v.areaId) || (v.rackId!==null && (!racks.has(v.rackId) || racks.get(v.rackId)!.areaId!==v.areaId))) fail('Device area must exist and match its physical rack location.');
    if(!['core','switch','router','nvr','wifi','tv','camera','outlet'].includes(v.kind)) fail('Unsupported device type.');
    for(const k of ['code','model','ip','mac'] as const) if(!text(v[k],255)) fail('Invalid device '+k+'.');
  }
  const devices = new Set(d.devices.map(v=>v.id)), labels=new Set<string>();
  const media=['copper','fiber','wireless','unknown'];
  for(const p of d.ports) {
    identify(p);
    if(!text(p.label,100)) fail('Invalid port label.');
    const key=p.deviceId+':'+p.label.trim().toLowerCase();
    if(!devices.has(p.deviceId) || !p.label.trim() || labels.has(key) || !media.includes(p.medium) || typeof p.poe!=='boolean') fail('Ports need unique labels within an existing device and a valid medium.');
    labels.add(key);
  }
  const ports = new Map(d.ports.map(p=>[p.id,p])), occupied=new Set<string>();
  for(const c of d.connections) {
    identify(c);
    if(!object(c.source) || !object(c.target) || c.source.deviceId===c.target.deviceId) fail('A connection needs two distinct devices.');
    for(const end of [c.source,c.target]) {
      if(!devices.has(end.deviceId)) fail('Connection device does not exist.');
      if(end.portId!==null) {
        const p=ports.get(end.portId);
        if(!p || p.deviceId!==end.deviceId) fail('Connection port does not belong to the selected device.');
        if(occupied.has(p!.id)) fail('Port '+p!.label+' is already connected. Disconnect it before reusing it.');
        occupied.add(p!.id);
        if(c.medium!=='unknown' && p!.medium!=='unknown' && c.medium!==p!.medium) fail('Cable and port media do not match.');
      }
    }
    if(!['access','uplink','crosslink'].includes(c.kind) || !text(c.cableCode,255) || !media.includes(c.medium) || !['active','planned','unknown'].includes(c.status) || !['confirmed','unverified','assumed'].includes(c.verification)) fail('Invalid connection details.');
  }
  for(const dim of d.dims) {
    if(!object(dim) || !isNetworkUuid(dim.uid) || ids.has(dim.uid) || ![dim.a,dim.b].every(v=>Array.isArray(v) && v.length===2 && v.every(number)) || !number(dim.off)) fail('Invalid dimension or duplicate UUID.');
    ids.add(dim.uid);
  }
  if(!object(d.settings) || !number(d.settings.unitsPerMeter) || d.settings.unitsPerMeter<=0) fail('Invalid map scale.');
}
