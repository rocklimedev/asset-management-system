import type { Connection, ConnectionEnd, NetworkDocument } from '../../types/network';
export const uid = () => crypto.randomUUID();

/** Hide local rack wiring while retaining inter-rack and shared-device links. */
export function rackDeviceConnectionIds(d: NetworkDocument): Set<string> {
  const owner = new Map<string, string>();
  for (const rack of d.racks) for (const id of rackGroup(d, rack.id)) owner.set(id, rack.id);
  return new Set(d.connections.filter((c) => {
    const rack = owner.get(c.source.deviceId);
    return rack !== undefined && rack === owner.get(c.target.deviceId);
  }).map((c) => c.id));
}

/** Only absorb unassigned components whose sole rack boundary is this rack. */
export function rackGroup(d: NetworkDocument, rackId: string): Set<string> {
  const devices = new Map(d.devices.map((v) => [v.id, v]));
  const neighbors = new Map<string, string[]>();
  for (const c of d.connections) {
    const a = c.source.deviceId,
      b = c.target.deviceId;
    neighbors.set(a, [...(neighbors.get(a) || []), b]);
    neighbors.set(b, [...(neighbors.get(b) || []), a]);
  }
  const group = new Set(d.devices.filter((v) => v.rackId === rackId).map((v) => v.id));
  const visited = new Set<string>();
  for (const root of d.devices.filter((v) => !v.rackId)) {
    if (visited.has(root.id)) continue;
    const component = new Set([root.id]),
      boundaries = new Set<string>();
    visited.add(root.id);
    for (const id of component) {
      for (const neighbor of neighbors.get(id) || []) {
        const device = devices.get(neighbor);
        if (!device) boundaries.add('unknown');
        else if (device.rackId) boundaries.add(device.rackId);
        else if (!visited.has(neighbor)) {
          visited.add(neighbor);
          component.add(neighbor);
        }
      }
    }
    if (boundaries.size === 1 && boundaries.has(rackId)) for (const id of component) group.add(id);
  }
  return group;
}

/** Pack rack equipment and dedicated endpoints together at the existing rack. */
export function condenseRack(d: NetworkDocument, rackId: string): NetworkDocument {
  const next = structuredClone(d);
  const rack = next.racks.find((r) => r.id === rackId);
  if (!rack) return next;
  const group = rackGroup(d, rackId);
  const equipment = next.devices
    .filter((v) => v.rackId === rackId)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }) || a.id.localeCompare(b.id),
    );
  const ports = new Map<string, number>();
  for (const port of next.ports) ports.set(port.deviceId, (ports.get(port.deviceId) || 0) + 1);
  let equipmentY = rack.y;
  for (const device of equipment) {
    device.x = rack.x;
    device.y = equipmentY;
    equipmentY += 62 + Math.ceil((ports.get(device.id) || 0) / 5) * 20 + 12;
  }
  const connectionOrder = new Map<string, number>();
  const equipmentIds = new Set(equipment.map((v) => v.id));
  for (const c of next.connections) {
    const end = equipmentIds.has(c.source.deviceId)
      ? c.source
      : equipmentIds.has(c.target.deviceId)
        ? c.target
        : null;
    if (!end) continue;
    const other = end === c.source ? c.target.deviceId : c.source.deviceId;
    if (!connectionOrder.has(other)) connectionOrder.set(other, connectionOrder.size);
  }
  const endpoints = next.devices
    .filter((v) => group.has(v.id) && !v.rackId)
    .sort(
      (a, b) =>
        (connectionOrder.get(a.id) ?? Infinity) - (connectionOrder.get(b.id) ?? Infinity) ||
        a.name.localeCompare(b.name, undefined, { numeric: true }) ||
        a.id.localeCompare(b.id),
    );
  if (!endpoints.length) return next;
  // Portless endpoints render as small markers; give those much tighter rows.
  const nodeHeight = (id: string) => (ports.has(id) ? 62 + Math.ceil(ports.get(id)! / 5) * 20 : 24);
  const averageHeight =
    endpoints.reduce((sum, v) => sum + nodeHeight(v.id) + 12, 0) / endpoints.length;
  const columns = Math.max(1, Math.ceil(Math.sqrt((endpoints.length * averageHeight) / 240)));
  const rows: { devices: typeof endpoints; height: number }[] = [];
  for (let i = 0; i < endpoints.length; i += columns) {
    const devices = endpoints.slice(i, i + columns);
    rows.push({ devices, height: Math.max(...devices.map((v) => nodeHeight(v.id))) });
  }
  const right = Math.max(rack.x + 114, ...equipment.map((v) => v.x + 114));
  const totalHeight = rows.reduce((sum, row) => sum + row.height + 12, 0) - 12;
  let top = rack.y - totalHeight / 2;
  for (const row of rows) {
    row.devices.forEach((device, column) => {
      device.x = right + 24 + column * 240 + (ports.has(device.id) ? 100 : 10);
      device.y = top + (ports.has(device.id) ? 35 : 10);
    });
    top += row.height + 12;
  }
  return next;
}

/** Explicitly pack rack equipment as well as its dedicated connected endpoints. */
export function condenseDevices(
  d: NetworkDocument,
  collection: 'racks' | 'areas',
  id: string,
): NetworkDocument {
  return collection === 'areas' ? condenseArea(d, id) : condenseRack(d, id);
}

/** Condense connections at each rack's existing position throughout an area. */
export function condenseArea(d: NetworkDocument, areaId: string): NetworkDocument {
  if (!d.areas.some((a) => a.id === areaId)) return structuredClone(d);
  let next = structuredClone(d);
  for (const rack of d.racks) {
    if (withinArea(d, rack.areaId, areaId)) next = condenseRack(next, rack.id);
  }
  // Area actions leave endpoints assigned to other areas at their own locations.
  const original = new Map(d.devices.map((v) => [v.id, v]));
  for (const device of next.devices) {
    if (!withinArea(d, device.areaId, areaId)) {
      const before = original.get(device.id)!;
      device.x = before.x;
      device.y = before.y;
    }
  }
  // Standalone devices belong near their own area marker. Components touching
  // racks or another area retain their placement rather than being claimed twice.
  const neighbors = new Map<string, string[]>();
  for (const c of next.connections) {
    const a = c.source.deviceId,
      b = c.target.deviceId;
    neighbors.set(a, [...(neighbors.get(a) || []), b]);
    neighbors.set(b, [...(neighbors.get(b) || []), a]);
  }
  const devices = new Map(next.devices.map((v) => [v.id, v]));
  const standalone = new Set<string>();
  const visited = new Set<string>();
  for (const root of next.devices.filter((v) => !v.rackId && withinArea(d, v.areaId, areaId))) {
    if (visited.has(root.id)) continue;
    const component = new Set([root.id]);
    let dedicated = true;
    visited.add(root.id);
    for (const id of component) {
      for (const neighbor of neighbors.get(id) || []) {
        const device = devices.get(neighbor);
        if (!device || device.rackId || device.areaId !== root.areaId) dedicated = false;
        else if (!visited.has(neighbor)) {
          visited.add(neighbor);
          component.add(neighbor);
        }
      }
    }
    if (dedicated) for (const id of component) standalone.add(id);
  }
  const height = (id: string) =>
    62 + Math.ceil(next.ports.filter((p) => p.deviceId === id).length / 5) * 20;
  for (const area of next.areas.filter((a) => withinArea(d, a.id, areaId))) {
    const loose = next.devices
      .filter((v) => v.areaId === area.id && standalone.has(v.id))
      .sort((a, b) => a.id.localeCompare(b.id));
    const columns = Math.max(1, Math.ceil(Math.sqrt(loose.length)));
    let y = Math.max(
      area.y + 100,
      ...next.devices
        .filter((v) => v.areaId === area.id && !standalone.has(v.id))
        .map((v) => v.y + height(v.id) + 80),
    );
    for (let i = 0; i < loose.length; i += columns) {
      const row = loose.slice(i, i + columns);
      row.forEach((device, column) => {
        device.x = area.x + column * 240;
        device.y = y;
      });
      y += Math.max(...row.map((v) => height(v.id))) + 28;
    }
  }
  return next;
}

/** Move the area's hierarchy, then gather devices at their new rack/area positions. */
export function moveArea(
  d: NetworkDocument,
  areaId: string,
  dx: number,
  dy: number,
): NetworkDocument {
  const next = structuredClone(d);
  if (!next.areas.some((a) => a.id === areaId)) return next;
  const areas = new Set(next.areas.filter((a) => withinArea(d, a.id, areaId)).map((a) => a.id));
  const racks = new Set(next.racks.filter((r) => areas.has(r.areaId)).map((r) => r.id));
  for (const area of next.areas)
    if (areas.has(area.id)) {
      area.x += dx;
      area.y += dy;
    }
  for (const rack of next.racks)
    if (racks.has(rack.id)) {
      rack.x += dx;
      rack.y += dy;
    }
  for (const device of next.devices) {
    if (device.rackId ? racks.has(device.rackId) : areas.has(device.areaId)) {
      device.x += dx;
      device.y += dy;
    }
  }
  return condenseArea(next, areaId);
}

/** Moving a rack always gathers its dedicated endpoints at the new position. */
export function moveRack(
  d: NetworkDocument,
  rackId: string,
  dx: number,
  dy: number,
): NetworkDocument {
  const next = structuredClone(d);
  const rack = next.racks.find((r) => r.id === rackId);
  if (!rack) return next;
  rack.x += dx;
  rack.y += dy;
  for (const device of next.devices) {
    if (device.rackId === rackId) {
      device.x += dx;
      device.y += dy;
    }
  }
  return condenseRack(next, rackId);
}
export function withinArea(d: NetworkDocument, actual: string, selected: string) {
  if (!selected) return true;
  const visited = new Set<string>();
  let current: string | null = actual;
  while (current && !visited.has(current)) {
    if (current === selected) return true;
    visited.add(current);
    current = d.areas.find((a) => a.id === current)?.parentId || null;
  }
  return false;
}
export function endLabel(d: NetworkDocument, end: ConnectionEnd) {
  const device = d.devices.find((v) => v.id === end.deviceId),
    port = d.ports.find((p) => p.id === end.portId);
  const rack = d.racks.find((r) => r.id === device?.rackId),
    area = d.areas.find((a) => a.id === device?.areaId);
  return (
    (rack ? rack.name + ' / ' : '') +
    (device?.code || device?.name || 'Unknown device') +
    ' · ' +
    (port ? 'Port ' + port.label : 'Port unassigned') +
    ' · ' +
    (area?.name || 'Unknown area')
  );
}
export function portConnection(d: NetworkDocument, id: string, except?: string) {
  return d.connections.find(
    (c) => c.id !== except && (c.source.portId === id || c.target.portId === id),
  );
}
export function traceCore(d: NetworkDocument, start: string): Connection[] | null {
  const queue = [start],
    visited = new Set(queue),
    previous = new Map<string, { device: string; connection: Connection }>();
  while (queue.length) {
    const id = queue.shift()!;
    if (d.devices.find((v) => v.id === id)?.kind === 'core') {
      const route: Connection[] = [];
      let current = id;
      while (current !== start) {
        const step = previous.get(current)!;
        route.unshift(step.connection);
        current = step.device;
      }
      return route;
    }
    for (const c of d.connections.filter(
      (c) => c.status !== 'planned' && (c.source.deviceId === id || c.target.deviceId === id),
    )) {
      const next = c.source.deviceId === id ? c.target.deviceId : c.source.deviceId;
      if (!visited.has(next)) {
        visited.add(next);
        previous.set(next, { device: id, connection: c });
        queue.push(next);
      }
    }
  }
  return null;
}
export function deletionReason(
  d: NetworkDocument,
  collection: 'areas' | 'racks' | 'devices' | 'ports' | 'connections',
  id: string,
): string | null {
  if (
    collection === 'areas' &&
    (d.areas.some((a) => a.parentId === id) ||
      d.racks.some((r) => r.areaId === id) ||
      d.devices.some((v) => v.areaId === id))
  )
    return 'Move the child areas, racks and devices before deleting this area.';
  if (collection === 'racks' && d.devices.some((v) => v.rackId === id))
    return 'Move the devices out of this rack first.';
  if (
    collection === 'devices' &&
    d.connections.some((c) => c.source.deviceId === id || c.target.deviceId === id)
  )
    return 'Disconnect this device before deleting it.';
  if (collection === 'ports' && portConnection(d, id))
    return 'Disconnect this port before deleting it.';
  return null;
}
