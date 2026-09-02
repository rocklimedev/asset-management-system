const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ============================================================
// CONFIG
// ============================================================

const INPUT_FILE = path.join(__dirname, "./data/inventory_data.json");
const OUTPUT_DIR = path.join(__dirname, "./output");

// ============================================================
// HELPERS
// ============================================================

function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function writeJson(filename, data) {
  const filePath = path.join(OUTPUT_DIR, filename);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

  console.log(`Created: ${filename}`);
}

// ============================================================
// READ INPUT
// ============================================================

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`Input file not found: ${INPUT_FILE}`);
  process.exit(1);
}

let input;

try {
  input = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
} catch (error) {
  console.error("Invalid JSON:", error.message);
  process.exit(1);
}

if (!Array.isArray(input)) {
  console.error("Input JSON must be an array.");
  process.exit(1);
}

// ============================================================
// OUTPUT COLLECTIONS
// ============================================================

const organisations = [];
const categories = [];
const assets = [];
const holders = [];
const inventory = [];

// ============================================================
// LOOKUP MAPS
// ============================================================

const organisationMap = new Map();
const categoryMap = new Map();
const assetMap = new Map();
const holderMap = new Map();

// ============================================================
// PROCESS INPUT
// ============================================================

for (const row of input) {
  const organisationName = String(row.organisation ?? "").trim();

  const holderName = String(row.holder_name ?? "").trim();

  const categoryName = String(row.category_name ?? "").trim();

  const assetName = String(row.asset_name ?? "").trim();

  let status = String(row.status ?? "").trim();

  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (!organisationName) {
    console.warn("Skipping row: organisation missing", row);
    continue;
  }

  if (!categoryName) {
    console.warn("Skipping row: category missing", row);
    continue;
  }

  if (!assetName) {
    console.warn("Skipping row: asset missing", row);
    continue;
  }

  // ==========================================================
  // ORGANISATION
  // ==========================================================

  const organisationKey = normalize(organisationName);

  let organisation = organisationMap.get(organisationKey);

  if (!organisation) {
    organisation = {
      id: generateId("org"),
      name: organisationName,
    };

    organisationMap.set(organisationKey, organisation);

    organisations.push(organisation);
  }

  // ==========================================================
  // CATEGORY
  // ==========================================================

  const categoryKey = normalize(categoryName);

  let category = categoryMap.get(categoryKey);

  if (!category) {
    category = {
      id: generateId("cat"),
      name: categoryName,
    };

    categoryMap.set(categoryKey, category);

    categories.push(category);
  }

  // ==========================================================
  // ASSET
  // ==========================================================

  const assetKey = [organisationKey, normalize(assetName)].join("|");

  let asset = assetMap.get(assetKey);

  if (!asset) {
    asset = {
      id: generateId("asset"),
      organisation_id: organisation.id,
      category_id: category.id,
      name: assetName,
    };

    assetMap.set(assetKey, asset);

    assets.push(asset);
  }

  // ==========================================================
  // HOLDER
  // ==========================================================

  let holder = null;

  /*
   * If holder_name is empty/null,
   * this is an UNASSIGNED asset.
   */

  if (holderName) {
    const holderKey = [organisationKey, normalize(holderName)].join("|");

    holder = holderMap.get(holderKey);

    if (!holder) {
      holder = {
        id: generateId("holder"),
        organisation_id: organisation.id,
        name: holderName,
      };

      holderMap.set(holderKey, holder);

      holders.push(holder);
    }
  }

  // ==========================================================
  // DETERMINE ASSIGNMENT STATUS
  // ==========================================================

  if (!holder) {
    status = "Unassigned";
  } else if (!status) {
    status = "Assigned";
  }

  // ==========================================================
  // INVENTORY RECORD
  // ==========================================================

  const inventoryRecord = {
    id: generateId("inv"),

    organisation_id: organisation.id,

    asset_id: asset.id,

    category_id: category.id,

    holder_id: holder ? holder.id : null,

    status,
  };

  inventory.push(inventoryRecord);
}

// ============================================================
// CREATE OUTPUT DIRECTORY
// ============================================================

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, {
    recursive: true,
  });
}

// ============================================================
// SPLIT ASSIGNED / UNASSIGNED
// ============================================================

const assignedInventory = inventory.filter(
  (item) => item.status === "Assigned" && item.holder_id !== null,
);

const unassignedInventory = inventory.filter(
  (item) => item.status === "Unassigned" || item.holder_id === null,
);

// ============================================================
// WRITE MASTER JSON FILES
// ============================================================

writeJson("organisations.json", organisations);

writeJson("categories.json", categories);

writeJson("assets.json", assets);

writeJson("holders.json", holders);

writeJson("inventory.json", inventory);

// ============================================================
// WRITE SEPARATE ASSIGNED / UNASSIGNED FILES
// ============================================================

writeJson("assigned-inventory.json", assignedInventory);

writeJson("unassigned-inventory.json", unassignedInventory);

// ============================================================
// SUMMARY
// ============================================================

console.log("\n====================================");
console.log("IT INVENTORY NORMALIZATION COMPLETE");
console.log("====================================");

console.log(`Organisations       : ${organisations.length}`);

console.log(`Categories          : ${categories.length}`);

console.log(`Assets              : ${assets.length}`);

console.log(`Holders             : ${holders.length}`);

console.log(`Total Inventory     : ${inventory.length}`);

console.log(`Assigned Inventory  : ${assignedInventory.length}`);

console.log(`Unassigned Inventory: ${unassignedInventory.length}`);

console.log(`\nOutput directory: ${OUTPUT_DIR}`);
