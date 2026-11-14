const fs = require('node:fs');
const path = require('node:path');
const { validateNetwork } = require('../dist/modules/network/network.validation');
const { OFFICE_NETWORK_ID, isNetworkUuid } = require('../dist/modules/network/network.ids');

// Safe under both normal SQL mode and NO_BACKSLASH_ESCAPES, including JSON escapes.
function literal(value) {
  if (value === null) return 'NULL';
  if (typeof value !== 'string') throw new Error('Expected text or NULL.');
  if (/[\\\x00-\x1f\x7f]/.test(value))
    return `CONVERT(X'${Buffer.from(value, 'utf8').toString('hex')}' USING utf8mb4)`;
  return `_utf8mb4'${value.replaceAll("'", "''")}'`;
}

function buildNetworkSeed(document, mapId = OFFICE_NETWORK_ID) {
  validateNetwork(document);
  if (!isNetworkUuid(mapId)) throw new Error('Map ID must be a UUID.');
  const statements = [];
  const insert = (table, columns, rows) => {
    if (!rows.length) return;
    statements.push(`    INSERT INTO ${table} (map_id, ${columns.join(', ')}) VALUES\n` +
      rows.map(row => '      (' + [mapId, ...row].map(literal).join(', ') + ')').join(',\n') + ';');
  };
  insert('network_areas', ['id','parent_id','name','payload'], document.areas.map(a => [a.id,null,a.name,JSON.stringify(a)]));
  for (const area of document.areas) if (area.parentId)
    statements.push(`    UPDATE network_areas SET parent_id = ${literal(area.parentId)} WHERE map_id = ${literal(mapId)} AND id = ${literal(area.id)};`);
  insert('network_racks', ['id','area_id','name','payload'], document.racks.map(r => [r.id,r.areaId,r.name,JSON.stringify(r)]));
  insert('network_devices', ['id','area_id','rack_id','name','kind','payload'], document.devices.map(v => [v.id,v.areaId,v.rackId,v.name,v.kind,JSON.stringify(v)]));
  insert('network_ports', ['id','device_id','label','payload'], document.ports.map(p => [p.id,p.deviceId,p.label,JSON.stringify(p)]));
  insert('network_connections', ['id','source_device_id','source_port_id','target_device_id','target_port_id','cable_code','kind','payload'],
    document.connections.map(c => [c.id,c.source.deviceId,c.source.portId,c.target.deviceId,c.target.portId,c.cableCode,c.kind,JSON.stringify(c)]));

  const routine = '_seed_network_map_' + mapId.slice(0,8);
  return `-- Generated from backend/seeds/network-map.json. Do not edit generated data.
-- Run in the application's MySQL database AFTER migrations 009 and 010.
-- Existing UUID or legacy office maps are preserved in full on rerun.
-- Contains: ${document.areas.length} areas, ${document.racks.length} racks, ${document.devices.length} devices,
-- ${document.ports.length} ports and ${document.connections.length} connections, with original UUID references.
-- Run the entire file using a client supporting DELIMITER (mysql CLI / HeidiSQL).
-- Requires CREATE ROUTINE, ALTER ROUTINE, EXECUTE, SELECT and INSERT (UPDATE for nested areas).

DELIMITER $$
DROP PROCEDURE IF EXISTS ${routine}$$
CREATE PROCEDURE ${routine}()
BEGIN
  DECLARE v_inserted BOOLEAN DEFAULT FALSE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  INSERT INTO network_maps (id, document, revision, createdAt, updatedAt)
  SELECT ${literal(mapId)}, ${literal(JSON.stringify(document))}, 1, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM network_maps WHERE id IN (${literal(mapId)}, 'office'));
  SET v_inserted = ROW_COUNT() = 1;

  IF v_inserted THEN
${statements.join('\n\n')}
  END IF;
  COMMIT;
  SELECT IF(v_inserted, 'Office network seeded successfully.', 'Existing office map preserved; no data changed.') AS result;
END$$
CALL ${routine}()$$
DROP PROCEDURE ${routine}$$
DELIMITER ;
`;
}

if (require.main === module) {
  const document = JSON.parse(fs.readFileSync(path.join(__dirname, '../seeds/network-map.json'), 'utf8'));
  const output = path.join(__dirname, '../seeds/network-map.sql');
  fs.writeFileSync(output, buildNetworkSeed(document));
  console.log(`Generated ${output}`);
}
module.exports = { buildNetworkSeed, literal };
