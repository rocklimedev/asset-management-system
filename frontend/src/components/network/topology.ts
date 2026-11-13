import type { Connection, ConnectionEnd, NetworkDocument } from '../../types/network';
export const uid = () => crypto.randomUUID();

/** Move rack equipment and its connected, unassigned devices as one group. */
export function moveRack(d: NetworkDocument, rackId: string, dx: number, dy: number, compact = false): NetworkDocument {
  const next = structuredClone(d);
  const rack = next.racks.find((r) => r.id === rackId);
  if (!rack) return next;
  const devices = new Map(next.devices.map((v) => [v.id, v]));
  const moving = new Set(next.devices.filter((v) => v.rackId === rackId).map((v) => v.id));
  const neighbors = new Map<string, string[]>();
  for (const c of next.connections) {
    const a = c.source.deviceId, b = c.target.deviceId;
    neighbors.set(a, [...(neighbors.get(a) || []), b]);
    neighbors.set(b, [...(neighbors.get(b) || []), a]);
  }
  for (const id of moving) {
    for (const neighbor of neighbors.get(id) || []) {
      const device = devices.get(neighbor);
      if (device && !device.rackId) moving.add(neighbor);
    }
  }
  rack.x += dx;
  rack.y += dy;
  for (const id of moving) {
    const device = devices.get(id)!;
    device.x += dx;
    device.y += dy;
  }
  if (compact) {
    const equipment = next.devices.filter((v) => v.rackId === rackId);
    const endpoints = next.devices.filter((v) => moving.has(v.id) && !v.rackId).sort((a, b) => a.id.localeCompare(b.id));
    const nodeHeight = (id: string) => Math.max(60, 62 + Math.ceil(next.ports.filter((p) => p.deviceId === id).length / 5) * 20);
    // Start outside the rack equipment, then add evenly spaced rings as needed.
    const clearance = Math.max(260, ...endpoints.map((v) => nodeHeight(v.id) + 60));
    let radius = Math.max(0, ...equipment.map((v) => Math.hypot(v.x - rack.x, v.y - rack.y) + Math.max(114, nodeHeight(v.id)))) + clearance;
    let index = 0;
    while (index < endpoints.length) {
      const capacity = Math.max(1, Math.floor(Math.PI / Math.asin(Math.min(1, clearance / (2 * radius)))));
      const count = Math.min(capacity, endpoints.length - index);
      for (let slot = 0; slot < count; slot++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * slot) / count;
        const device = endpoints[index++];
        device.x = rack.x + Math.cos(angle) * radius;
        device.y = rack.y + Math.sin(angle) * radius;
      }
      radius += clearance;
    }
  }
  return next;
}
export function withinArea(d: NetworkDocument, actual: string, selected: string) {
  if (!selected) return true;
  const visited = new Set<string>();
  let current: string | null = actual;
  while (current && !visited.has(current)) {
    if (current === selected) return true;
    visited.add(current);
    current = d.areas.find(a => a.id === current)?.parentId || null;
  }
  return false;
}
export function endLabel(d: NetworkDocument, end: ConnectionEnd) {
  const device=d.devices.find(v=>v.id===end.deviceId), port=d.ports.find(p=>p.id===end.portId);
  const rack=d.racks.find(r=>r.id===device?.rackId), area=d.areas.find(a=>a.id===device?.areaId);
  return (rack ? rack.name+' / ' : '')+(device?.code || device?.name || 'Unknown device')+' · '+(port ? 'Port '+port.label : 'Port unassigned')+' · '+(area?.name || 'Unknown area');
}
export function portConnection(d: NetworkDocument, id: string, except?: string) {
  return d.connections.find(c=>c.id!==except && (c.source.portId===id || c.target.portId===id));
}
export function traceCore(d: NetworkDocument, start: string): Connection[] | null {
  const queue=[start], visited=new Set(queue), previous=new Map<string,{device:string;connection:Connection}>();
  while(queue.length) {
    const id=queue.shift()!;
    if(d.devices.find(v=>v.id===id)?.kind==='core') {
      const route:Connection[]=[];let current=id;
      while(current!==start){const step=previous.get(current)!;route.unshift(step.connection);current=step.device;}return route;
    }
    for(const c of d.connections.filter(c=>c.status!=='planned' && (c.source.deviceId===id || c.target.deviceId===id))) {
      const next=c.source.deviceId===id?c.target.deviceId:c.source.deviceId;
      if(!visited.has(next)){visited.add(next);previous.set(next,{device:id,connection:c});queue.push(next);}
    }
  }
  return null;
}
export function deletionReason(d: NetworkDocument, collection: 'areas'|'racks'|'devices'|'ports'|'connections', id: string): string | null {
  if(collection==='areas' && (d.areas.some(a=>a.parentId===id)||d.racks.some(r=>r.areaId===id)||d.devices.some(v=>v.areaId===id))) return 'Move the child areas, racks and devices before deleting this area.';
  if(collection==='racks' && d.devices.some(v=>v.rackId===id)) return 'Move the devices out of this rack first.';
  if(collection==='devices' && d.connections.some(c=>c.source.deviceId===id||c.target.deviceId===id)) return 'Disconnect this device before deleting it.';
  if(collection==='ports' && portConnection(d,id)) return 'Disconnect this port before deleting it.';
  return null;
}
