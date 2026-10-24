-- Retain employee records for asset history while hiding deleted employees.
ALTER TABLE employees ADD COLUMN deletedAt DATETIME NULL DEFAULT NULL;
