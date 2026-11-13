The Network module is available at /network in the app and /api/network in the API.
It uses a native React/SVG topology editor with explicit physical relationships:

- Areas are independent locations with optional parent areas.
- Racks belong to physical areas. A rack can contain multiple pieces of equipment.
- Devices have their own area, optional physical rack, code, type, model, IP, MAC and notes.
- Numbered/named ports belong to a device; their identity is independent of list order.
- A cable connects two devices and their known ports. It records its cable code,
  medium, purpose (access/uplink/crosslink), operational status and verification.
  Device-to-device links with unknown physical ports remain documented as unassigned.
- A device's physical location is independent of the rack providing its network cable.

From backend, run:

    npm run migrate:network
    npm run seed:network

To seed directly in MySQL without running Node, open seeds/network-map.sql in
HeidiSQL (or use the mysql CLI) and execute the entire file after migrations 009
and 010. It contains the UUID map JSON and all 49 areas, 7 racks, 51 devices,
61 ports and 50 connection rows. Run it in the application's selected database.
It preserves an existing office map, including on reruns, and rolls back all seed
inserts on any SQL error. Its temporary procedure is removed after a successful
run; the client must support DELIMITER and the database account needs routine
creation/execution permissions. No foreign-key checks are disabled.
Regenerate the SQL from the JSON after changing the source data:

    npm run seed:network:sql

For an existing saved map, use this instead of the seeder:

    npm run migrate:network
    npm run upgrade:network

Database execution is still pending: the earlier remote MySQL approval was declined.
The migration command builds the backend and applies 009_network_maps.sql and 010_network_topology.sql.
Run it with the backend stopped: MySQL column/foreign-key DDL commits independently.
Fresh schemas use UUID values in CHAR(36) ASCII binary columns, following the app’s
MySQL UUID convention, for map/area/rack/device/port/cable primary and foreign keys.
Names, device codes and cable labels remain separate text fields. Sequelize uses
DataType.UUID and new editor records use crypto.randomUUID() without prefixes.
Legacy IDs are deterministically remapped to UUIDv5; existing valid UUIDs are kept.
Document references, relational rows and backup references are converted together
in a transaction before narrowing old VARCHAR identifier columns. Canonical foreign
keys are restored afterward; rerun the command if schema DDL is interrupted.
The command migrates all existing maps and retains their old documents as backups.
It registers network.manage and grants it to admin/developer roles. Other roles can
receive it in Roles & Permissions. Sign in again after changing grants.
The schema creates areas, racks, devices, ports and connections with foreign keys;
record payloads preserve metadata and positions. The versioned map JSON and these
relational records are written together under a row lock, with an audit entry.
A reused port, wrong port owner, incompatible cable medium, missing location,
invalid rack placement or cyclic area hierarchy is rejected. Stale saves return 409.

The seed JSON preserves all 51 original equipment nodes, 43 access cables and 7
uplinks. The source's 8 switch/router entries become 7 racks and their equipment
plus the standalone UG router. Each endpoint's original location/name is kept as
an independent area label, resulting in 49 editable areas. No geographical grouping
is inferred from the serving rack: those labels can be renamed or nested as needed.
The 61 known numbered ports include spare ports on the original 9/10-port switches.
Core capacity is not specified, so only its 5 used numbered ports are initially
created. Extra physical ports can be added without renumbering any existing cable.
The user confirmed the HTML's displayed endpoint port numbers are actual ports;
those 43 assignments are confirmed. Destination ports and uplink physical ports
were not specified and remain unassigned. Cable codes are preserved verbatim,
including the one assumed router-to-core link. Runtime/live status is unknown.
The original graph is retained in seeds/network-map.legacy.json for provenance.

The seeder never replaces an existing map. The upgrader converts the existing
saved document (including edits), backs up the original legacy document in
network_map_legacy_backups, and writes the topology in a transaction. Current
version 2 maps can be reprojected without replacing their graph or revision.
After the UUID migration, GET can read legacy document formats and the next
successful save also backs up and upgrades their entity identifiers. Raw writes
require UUID IDs; importing older JSON remaps its identifiers and references first.

The editor supports area/rack/device movement, explicit port and cable editing,
port occupancy, safe deletion, searches/area filters, documented routes to core,
measurements, zoom/pan, snap/grid, undo/redo and JSON import/export. Drag an area
label to move its contents, or a rack title to move its equipment. Connect ports
lets you pick two available physical ports; device clicks retain unknown port ends.
Deleting an in-use port/device/rack/area is blocked until its dependencies are moved
or disconnected. Reassigning a device's area removes its old physical rack;
moving a rack's area moves all equipment in it consistently.

Save network commits edits. Export before reloading after a conflict. Import JSON
validates on the backend and accepts both version 2 exports and the original HTML
JSON. Browser close/refresh and navigation links warn about unsaved changes;
browser history navigation can still leave the page, so save or export first.
Routes to core are based on recorded connections, including explicitly marked
assumed/unverified links, and exclude planned cables. They are not live reachability
checks. The HTML's localStorage-only edits must be exported from that browser first.

Verification:

    cd backend
    npm run test:network

    cd ../frontend
    npm run build
    node --test test/network.test.cjs

A visual preview was attempted but Computer Use stopped because the Windows browser
URL could not be determined reliably. No visual or live-database verification is claimed.
