-- MySQL: backfill usage for software with current custody or installation records.
-- Re-runnable. Historical/removed assignments do not count. Keep blocked software blocked.
START TRANSACTION;

UPDATE software_details AS sd
SET sd.usage = 'IN_USE', sd.updatedAt = CURRENT_TIMESTAMP
WHERE sd.usage NOT IN ('IN_USE', 'BLOCKED')
  AND (
    EXISTS (
      SELECT 1 FROM software_license_assignments AS sla
      WHERE sla.asset_id = sd.asset_id AND sla.assignment_status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM software_assignments AS sa
      WHERE sa.software_asset_id = sd.asset_id AND sa.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM asset_assignments AS aa
      WHERE aa.asset_id = sd.asset_id AND aa.status = 'ACTIVE'
    )
  );

COMMIT;
