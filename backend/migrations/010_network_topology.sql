-- Explicit location, rack, device, port and connection relationships. Restartable.
CREATE TABLE IF NOT EXISTS network_areas (
  map_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  parent_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  name VARCHAR(255) NOT NULL,
  payload JSON NOT NULL,
  PRIMARY KEY(map_id,id),
  FOREIGN KEY(map_id) REFERENCES network_maps(id),
  FOREIGN KEY(map_id,parent_id) REFERENCES network_areas(map_id,id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS network_racks (
  map_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  area_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(255) NOT NULL,
  payload JSON NOT NULL,
  PRIMARY KEY(map_id,id),
  FOREIGN KEY(map_id,area_id) REFERENCES network_areas(map_id,id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS network_devices (
  map_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  area_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  rack_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  payload JSON NOT NULL,
  PRIMARY KEY(map_id,id),
  FOREIGN KEY(map_id,area_id) REFERENCES network_areas(map_id,id),
  FOREIGN KEY(map_id,rack_id) REFERENCES network_racks(map_id,id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS network_ports (
  map_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  device_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  label VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  PRIMARY KEY(map_id,id),
  UNIQUE KEY port_device_id(map_id,device_id,id),
  UNIQUE KEY port_device_label(map_id,device_id,label),
  FOREIGN KEY(map_id,device_id) REFERENCES network_devices(map_id,id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS network_connections (
  map_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_device_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source_port_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  target_device_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  target_port_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  cable_code VARCHAR(255) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  payload JSON NOT NULL,
  PRIMARY KEY(map_id,id),
  FOREIGN KEY(map_id,source_device_id) REFERENCES network_devices(map_id,id),
  FOREIGN KEY(map_id,target_device_id) REFERENCES network_devices(map_id,id),
  FOREIGN KEY(map_id,source_device_id,source_port_id) REFERENCES network_ports(map_id,device_id,id),
  FOREIGN KEY(map_id,target_device_id,target_port_id) REFERENCES network_ports(map_id,device_id,id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS network_map_legacy_backups (
  map_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  revision INT UNSIGNED NOT NULL,
  document JSON NOT NULL,
  backed_up_at DATETIME NOT NULL,
  PRIMARY KEY(map_id,revision),
  FOREIGN KEY(map_id) REFERENCES network_maps(id)
) ENGINE=InnoDB;