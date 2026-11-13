import type { NetworkDocument } from './network.types';
import { isNetworkUuid } from './network.ids';
type Query = (sql: string, values: any[]) => Promise<unknown>;
// Caller must hold the map row lock and wrap this operation in the map transaction.
export async function clearTopology(query: Query, mapId: string) {
  for(const table of ['network_connections','network_ports','network_devices','network_racks'])
    await query('DELETE FROM '+table+' WHERE map_id = ?', [mapId]);
  await query('UPDATE network_areas SET parent_id = NULL WHERE map_id = ?', [mapId]);
  await query('DELETE FROM network_areas WHERE map_id = ?', [mapId]);
}
export async function persistTopology(query: Query, mapId: string, d: NetworkDocument) {
  if (!isNetworkUuid(mapId)) throw new Error('Network map ID must be a UUID.');
  await clearTopology(query,mapId);
  const insert = async (table: string, columns: string[], values: any[]) => {
    await query('INSERT INTO '+table+' (map_id,'+columns.join(',')+') VALUES ('+Array(columns.length+1).fill('?').join(',')+')',[mapId,...values]);
  };
  for(const a of d.areas) await insert('network_areas',['id','parent_id','name','payload'],[a.id,null,a.name,JSON.stringify(a)]);
  for(const a of d.areas) if(a.parentId) await query('UPDATE network_areas SET parent_id = ? WHERE map_id = ? AND id = ?', [a.parentId,mapId,a.id]);
  for(const r of d.racks) await insert('network_racks',['id','area_id','name','payload'],[r.id,r.areaId,r.name,JSON.stringify(r)]);
  for(const v of d.devices) await insert('network_devices',['id','area_id','rack_id','name','kind','payload'],[v.id,v.areaId,v.rackId,v.name,v.kind,JSON.stringify(v)]);
  for(const p of d.ports) await insert('network_ports',['id','device_id','label','payload'],[p.id,p.deviceId,p.label,JSON.stringify(p)]);
  for(const c of d.connections) await insert('network_connections',['id','source_device_id','source_port_id','target_device_id','target_port_id','cable_code','kind','payload'],[c.id,c.source.deviceId,c.source.portId,c.target.deviceId,c.target.portId,c.cableCode,c.kind,JSON.stringify(c)]);
}
