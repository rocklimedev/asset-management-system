import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

// ============================================================
// SYSTEM IT DATA REPORT
//
// One card per system, laid out like the IT data sheet:
//
//   [ COMPANY MARKER ]
//   PC NAME           SPRP-PC1
//   HOLDER NAME       DHAIRYA
//   Processor         ...
//   RAM               ...
//   Graphics Card     ...
//   Local Storage     ...
//   OneDrive Storage  ...
//   [ ASSIGNED ITEMS ]                  <- its own section
//   Monitor           Dell U2419 (MON-003, S/N ABC123)
//   Keyboard          ...
//   Mouse             ...
//   Laptop / Mobile Phone / iPad ...
//
// Rows with no data are left out, exactly like the sheet.
// ============================================================

/** Shown as the holder when a system has no employee. */
export const UNASSIGNED_HOLDER_LABEL = "UNASSIGNED";

/** Shown in the company marker when a system has no organisation. */
export const NO_COMPANY_LABEL = "NO COMPANY";

/** Heading of the section listing items assigned to the system. */
export const ASSIGNED_ITEMS_LABEL = "ASSIGNED ITEMS";

const GREEN = "#084D1B";
const SECTION_FILL = "#D9EADF";
const SECTION_HEIGHT = 22;

export type SystemReportField = { label: string; value: string };

/** One item assigned to the system, e.g. a monitor or a laptop. */
export interface SystemAssignedItem {
  category: string;
  name: string;
}

export interface SystemReportItem {
  id: string;
  company: string;
  nameLabel: string;
  name: string;
  holder: string;
  /** Specs of the system (processor, RAM, ...). */
  fields: SystemReportField[];
  /** Items assigned to the system, shown in their own section. */
  assignedItems: SystemAssignedItem[];
}

export interface SystemsReport {
  generatedAt: Date;
  totalSystems: number;
  byCompany: Record<string, number>;
  items: SystemReportItem[];
}

type ComponentLike = { name: string; category: string };

// ============================================================
// HELPERS
// ============================================================

const clean = (input: unknown): string => {
  if (input == null) return "";
  const text = String(input).trim();
  return text === "-" ? "" : text;
};

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Organisation named "null" comes from imported data and means "no company". */
export function companyName(...names: Array<string | null | undefined>) {
  for (const name of names) {
    const text = clean(name);
    if (text && text.toLowerCase() !== "null") return text;
  }
  return NO_COMPANY_LABEL;
}

function nameLabel(systemName: string, ownCategory: string): string {
  const name = systemName.toLowerCase();
  const category = ownCategory.toLowerCase();

  if (/macbook/.test(name)) return "MACBOOK NAME";
  if (/\b(mac mini|imac|mac studio|mac pro|mac)\b/.test(name)) return "MAC NAME";
  if (
    category === "laptop" ||
    /laptop|thinkpad|elitebook|latitude|galaxy book|ideapad|vivobook|inspiron|probook|aspire|\bl\d{3}\b/.test(
      name,
    )
  ) {
    return "LAPTOP NAME";
  }
  return "PC NAME";
}

/** "1TB" -> OneDrive Storage (as on the sheet); "Google Drive 2TB" -> Cloud Storage. */
function cloudLabel(value: string) {
  const sizeOnly = /^[\d.]+\s*(kb|mb|gb|tb)$/i.test(value);
  return sizeOnly || /onedrive/i.test(value) ? "OneDrive Storage" : "Cloud Storage";
}

// ============================================================
// BUILD ONE SYSTEM RECORD
// ============================================================

export function buildSystemRecord(args: {
  id: string;
  systemName: string;
  systemTag?: string | null;
  company: string;
  holder?: string | null;
  specs?: Record<string, any> | null;
  components: ComponentLike[];
}): SystemReportItem {
  const { specs } = args;

  // The system's own device (e.g. the "Desktop PC" asset called SPRP-PC1)
  // is already the name row, so it is not repeated as a component.
  let ownCategory = "";
  const parts = args.components.filter((component) => {
    const isSelf =
      same(component.name, args.systemName) ||
      (args.systemTag ? same(component.name, args.systemTag) : false);
    if (isSelf) ownCategory = component.category;
    return !isSelf;
  });

  const byCategory = (...names: string[]) =>
    parts
      .filter((part) => names.includes(part.category.toLowerCase()))
      .map((part) => clean(part.name));

  // ---------- Specs ----------
  const fields: SystemReportField[] = [];
  const add = (label: string, ...values: Array<string | string[]>) => {
    const text = unique(values.flat().map(clean)).join(", ");
    if (text) fields.push({ label, value: text });
  };

  const monitors = byCategory("monitor");

  add("Processor", specs?.processor);
  add("RAM", specs?.ram);
  add("Graphics Card", specs?.graphicsCard);
  add("Local Storage", specs?.localStorage);
  const cloud = clean(specs?.cloudStorage);
  if (cloud) add(cloudLabel(cloud), cloud);

  // The spec monitor is left out when an assigned monitor of the same model
  // is already listed (assigned names carry the unit code, e.g. "... (MON-003)").
  const specMonitor = clean(specs?.monitor);
  if (
    specMonitor &&
    !monitors.some((m) => m.toLowerCase().startsWith(specMonitor.toLowerCase()))
  ) {
    add("Monitor", specMonitor);
  }

  // ---------- Assigned items ----------
  const tablets = byCategory("tablet");
  const tabletLabel =
    tablets.length && tablets.every((t) => /ipad/i.test(t)) ? "iPad" : "Tablet";

  const groups: Array<[string, string[]]> = [
    ["Monitor", monitors],
    ["Keyboard", byCategory("keyboard")],
    ["Mouse", byCategory("mouse")],
    ["Laptop", byCategory("laptop")],
    ["Mobile Phone", byCategory("mobile phone")],
    [tabletLabel, tablets],
  ];

  // Any other category (speaker, camera, ...) still appears, under its own name.
  const shown = new Set([
    "monitor", "keyboard", "mouse", "laptop", "mobile phone", "tablet",
  ]);
  const others = new Map<string, string[]>();
  for (const part of parts) {
    const key = part.category;
    if (!key || shown.has(key.toLowerCase())) continue;
    others.set(key, [...(others.get(key) ?? []), part.name]);
  }
  others.forEach((names, category) => groups.push([category, names.map(clean)]));

  const assignedItems: SystemAssignedItem[] = groups.flatMap(([category, names]) =>
    unique(names).map((name) => ({ category, name })),
  );

  return {
    id: args.id,
    company: args.company,
    nameLabel: nameLabel(args.systemName, ownCategory),
    name: args.systemName,
    holder: clean(args.holder) || UNASSIGNED_HOLDER_LABEL,
    fields,
    assignedItems,
  };
}

/** Name + holder rows first, then the spec rows - the order used on the sheet. */
export function cardRows(item: SystemReportItem): SystemReportField[] {
  return [
    { label: item.nameLabel, value: item.name },
    { label: "HOLDER NAME", value: item.holder },
    ...item.fields,
  ];
}

/** Rows of the "Assigned Items" section: one row per item. */
export function assignedRows(item: SystemReportItem): SystemReportField[] {
  return item.assignedItems.map((entry) => ({
    label: entry.category,
    value: entry.name,
  }));
}

/**
 * Columns for the table sheet: spec fields, then one column per assigned
 * category (names of that category joined with commas).
 */
export function tableFields(item: SystemReportItem): SystemReportField[] {
  const grouped = new Map<string, string[]>();
  for (const entry of item.assignedItems) {
    grouped.set(entry.category, [...(grouped.get(entry.category) ?? []), entry.name]);
  }
  return [
    ...item.fields,
    ...[...grouped].map(([label, names]) => ({ label, value: names.join(", ") })),
  ];
}

export function systemsSummary(report: SystemsReport): string {
  const companies = Object.entries(report.byCompany)
    .map(([name, count]) => `${name}: ${count}`)
    .join("    |    ");
  return `Total Systems: ${report.totalSystems}${companies ? `    |    ${companies}` : ""}`;
}

// ============================================================
// PDF
// ============================================================

export function createSystemsPdf(report: SystemsReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const x = 42;
    const width = doc.page.width - 84;
    const split = width * 0.37;
    const bottom = doc.page.height - 55;

    const header = () => {
      doc.font("Helvetica-Bold").fontSize(15).fillColor(GREEN)
        .text("SYSTEM IT DATA", x, 36, { width, align: "center" });
      doc.font("Helvetica").fontSize(8).fillColor("#555555").text(
        `Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}`,
        x, 57, { width, align: "center" },
      );
      return 82;
    };

    let y = header();
    doc.font("Helvetica").fontSize(8).fillColor("#111111")
      .text(systemsSummary(report), x, y, { width, align: "center" });
    y = doc.y + 18;

    const rowHeight = (label: string, value: string, bold: boolean) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
      return Math.max(
        23,
        doc.heightOfString(value, { width: width - split - 16 }) + 12,
        doc.heightOfString(label, { width: split - 16 }) + 12,
      );
    };

    const drawRow = (row: { label: string; value: string; bold: boolean; height: number }) => {
      if (y + row.height > bottom) {
        doc.addPage();
        y = header();
      }
      doc.lineWidth(0.65).rect(x, y, split, row.height).stroke("#111111");
      doc.rect(x + split, y, width - split, row.height).stroke("#111111");
      doc.font(row.bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#111111");
      doc.text(row.label, x + 8, y + 6, { width: split - 16, align: "center" });
      doc.text(row.value, x + split + 8, y + 6, { width: width - split - 16, align: "center" });
      y += row.height;
    };

    for (const item of report.items) {
      const rows = cardRows(item).map((row, index) => ({
        ...row,
        bold: index < 2, // PC NAME + HOLDER NAME
        height: rowHeight(row.label, row.value, index < 2),
      }));
      const assigned = assignedRows(item).map((row) => ({
        ...row,
        bold: false,
        height: rowHeight(row.label, row.value, false),
      }));

      doc.font("Helvetica-Bold").fontSize(15);
      const markerHeight = Math.max(30, doc.heightOfString(item.company.toUpperCase(), { width: width - 20 }) + 14);
      const total =
        markerHeight +
        rows.reduce((sum, row) => sum + row.height, 0) +
        (assigned.length
          ? SECTION_HEIGHT + assigned.reduce((sum, row) => sum + row.height, 0)
          : 0);

      if (y + total > bottom && y > 82) {
        doc.addPage();
        y = header();
      }

      // Company marker
      doc.rect(x, y, width, markerHeight).fillAndStroke(GREEN, "#111111");
      doc.font("Helvetica-Bold").fontSize(15).fillColor("white")
        .text(item.company.toUpperCase(), x + 10, y + 8, { width: width - 20, align: "center" });
      y += markerHeight;

      rows.forEach(drawRow);

      // Assigned items section
      if (assigned.length) {
        if (y + SECTION_HEIGHT + assigned[0].height > bottom) {
          doc.addPage();
          y = header();
        }
        doc.lineWidth(0.65).rect(x, y, width, SECTION_HEIGHT).fillAndStroke(SECTION_FILL, "#111111");
        doc.font("Helvetica-Bold").fontSize(10).fillColor(GREEN)
          .text(ASSIGNED_ITEMS_LABEL, x, y + 6, { width, align: "center", lineBreak: false });
        y += SECTION_HEIGHT;
        assigned.forEach(drawRow);
      }
      y += 18;
    }

    if (!report.items.length) {
      doc.font("Helvetica").fontSize(11).fillColor("#111111")
        .text("No systems match the selected filters.", x, y, { width, align: "center" });
    }

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      // The footer sits inside the bottom margin; without this PDFKit would
      // add a new page for it.
      doc.page.margins.bottom = 0;
      doc.font("Helvetica").fontSize(8).fillColor("#666666").text(
        `CM Asset Management    |    Page ${i + 1} of ${range.count}`,
        x, doc.page.height - 35, { width, align: "center", lineBreak: false },
      );
    }
    doc.end();
  });
}

// ============================================================
// EXCEL
//   Sheet 1 "System IT Data" - same cards as the PDF
//   Sheet 2 "Systems Table"  - one row per system, filterable
// ============================================================

export async function createSystemsExcel(report: SystemsReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CM Asset Management";
  workbook.created = new Date();

  addCardsSheet(workbook, report);
  addTableSheet(workbook, report);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function addCardsSheet(workbook: ExcelJS.Workbook, report: SystemsReport) {
  const sheet = workbook.addWorksheet("System IT Data", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });
  sheet.columns = [{ width: 28 }, { width: 56 }];
  sheet.headerFooter.oddFooter = "&L CM Asset Management&R Page &P of &N";

  const merged = (text: string, size: number, green = false) => {
    const row = sheet.addRow([text]);
    sheet.mergeCells(row.number, 1, row.number, 2);
    row.height = Math.max(green ? 30 : 22, Math.ceil(text.length / 65) * (size + 4) + 10);
    row.font = { name: "Calibri", size, bold: green, color: { argb: green ? "FFFFFFFF" : "FF111111" } };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    if (green) row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF084D1B" } };
    return row;
  };

  merged("SYSTEM IT DATA", 16);
  merged(`Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}`, 10);
  merged(systemsSummary(report), 10);
  sheet.addRow([]);

  const rowHeightOf = (row: SystemReportField) =>
    Math.max(22, Math.ceil(row.value.length / 48) * 15 + 8);

  let pageHeight = 100;
  for (const item of report.items) {
    const rows = cardRows(item);
    const assigned = assignedRows(item);
    const heights = rows.map(rowHeightOf);
    const assignedHeights = assigned.map(rowHeightOf);
    const cardHeight =
      30 +
      heights.reduce((a, b) => a + b, 0) +
      (assigned.length ? SECTION_HEIGHT + assignedHeights.reduce((a, b) => a + b, 0) : 0) +
      16;

    if (pageHeight + cardHeight > 690) {
      sheet.getRow(sheet.rowCount).addPageBreak();
      pageHeight = 0;
    }

    const start = merged(item.company.toUpperCase(), 16, true).number;

    rows.forEach((row, index) => {
      const excelRow = sheet.addRow([row.label, row.value]);
      excelRow.height = heights[index];
      excelRow.font = { name: "Calibri", size: 11, bold: index < 2 };
      excelRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });

    if (assigned.length) {
      const section = sheet.addRow([ASSIGNED_ITEMS_LABEL, ""]);
      sheet.mergeCells(section.number, 1, section.number, 2);
      section.height = SECTION_HEIGHT;
      section.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF084D1B" } };
      section.alignment = { horizontal: "center", vertical: "middle" };
      section.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EADF" } };
      });

      assigned.forEach((row, index) => {
        const excelRow = sheet.addRow([row.label, row.value]);
        excelRow.height = assignedHeights[index];
        excelRow.font = { name: "Calibri", size: 11, bold: false };
        excelRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });
    }

    const edge: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FF111111" } };
    for (let n = start; n <= sheet.rowCount; n++) {
      sheet.getRow(n).eachCell((cell) => {
        cell.border = { top: edge, bottom: edge, left: edge, right: edge };
      });
    }
    sheet.addRow([]).height = 16;
    pageHeight += cardHeight;
  }

  if (!report.items.length) merged("No systems match the selected filters.", 11);
  sheet.pageSetup.printArea = `A1:B${sheet.rowCount}`;
}

function addTableSheet(workbook: ExcelJS.Workbook, report: SystemsReport) {
  const sheet = workbook.addWorksheet("Systems Table");

  // Columns = every label that appears, in first-seen order.
  const labels: string[] = [];
  for (const item of report.items) {
    for (const field of tableFields(item)) {
      if (!labels.includes(field.label)) labels.push(field.label);
    }
  }

  sheet.addRow(["Company", "Type", "System Name", "Holder Name", ...labels]);
  for (const item of report.items) {
    const byLabel = new Map(tableFields(item).map((field) => [field.label, field.value]));
    sheet.addRow([
      item.company,
      item.nameLabel.replace(/ NAME$/, ""),
      item.name,
      item.holder,
      ...labels.map((label) => byLabel.get(label) ?? ""),
    ]);
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };

  sheet.columns.forEach((column) => {
    let max = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      max = Math.max(max, Math.min(String(cell.value ?? "").length + 2, 45));
    });
    column.width = max;
  });
}
