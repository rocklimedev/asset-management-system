import { createHash } from 'node:crypto';

export const isNetworkUuid = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);

// UUIDv5: deterministic conversion preserves IDs across repeated legacy imports.
export function networkUuid(kind: string, legacyId: string): string {
  if (typeof legacyId !== 'string' || !legacyId) throw new Error('Missing network identifier.');
  const canonical = legacyId.toLowerCase();
  if (isNetworkUuid(canonical)) return canonical;
  const namespace = Buffer.from('d978af83b337459b987d7ca3f82c9455', 'hex');
  const bytes = createHash('sha1').update(namespace).update(`${kind}:${legacyId}`).digest().subarray(0,16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export const OFFICE_NETWORK_ID = networkUuid('maps', 'office');

export function uuidNetworkDocument(input: import('./network.types').NetworkDocument): import('./network.types').NetworkDocument {
  const d = JSON.parse(JSON.stringify(input)) as typeof input;
  for (const collection of ['areas','racks','devices','ports','connections'] as const)
    for (const item of d[collection]) item.id = networkUuid(collection,item.id);
  const optional = (kind: string,id: string|null) => id === null ? null : networkUuid(kind,id);
  for (const a of d.areas) a.parentId = optional('areas',a.parentId);
  for (const r of d.racks) r.areaId = networkUuid('areas',r.areaId);
  for (const v of d.devices) { v.areaId=networkUuid('areas',v.areaId);v.rackId=optional('racks',v.rackId); }
  for (const p of d.ports) p.deviceId=networkUuid('devices',p.deviceId);
  for (const c of d.connections) for (const end of [c.source,c.target]) {
    end.deviceId=networkUuid('devices',end.deviceId);end.portId=optional('ports',end.portId);
  }
  for (const dim of d.dims) dim.uid=networkUuid('dimensions',dim.uid);
  return d;
}
