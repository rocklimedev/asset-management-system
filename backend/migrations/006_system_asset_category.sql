-- Existing computers remain unclassified until their category is selected in Edit computer.
-- No tags, assets, assignments, or employee custody are changed.
ALTER TABLE systems ADD COLUMN category_id CHAR(36) NULL,
  ADD INDEX idx_systems_category (category_id),
  ADD CONSTRAINT fk_systems_category FOREIGN KEY (category_id) REFERENCES asset_categories(id);
