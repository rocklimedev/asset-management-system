import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

// ============================================================
// UNASSIGNED INVENTORY REPORT
//
// Lists only what is NOT assigned right now, grouped by category:
//   - one line per available unit (unit code + serial number)
//   - one line per pooled asset (no units), with its free quantity
// Nothing else (no totals, assigned counts or stock flags) is shown.
// ============================================================

/** Category used for assets that have no category. */
export const UNCATEGORISED_LABEL = "UNCATEGORISED";

const GREEN = "#084D1B";
const SECTION_FILL = "#D9EADF";
const COLUMNS = ["Asset", "Unit Code", "Serial Number", "Quantity"];

export interface InventoryRow {
  asset: string;
  unitCode: string;
  serialNumber: string;
  quantity: number;
}

export interface InventoryCategory {
  name: string;
  total: number;
  rows: InventoryRow[];
}

export interface InventoryReport {
  generatedAt: Date;
  totalUnassigned: number;
  totalCategories: number;
  categories: InventoryCategory[];
}

const summaryText = (report: InventoryReport) =>
  `Unassigned Items: ${report.totalUnassigned}    |    Categories: ${report.totalCategories}`;

const shown = (value: string | number) =>
  value === "" || value == null ? "-" : String(value);

// ============================================================
// PDF
// ============================================================

export function createInventoryPdf(report: InventoryReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const x = 42;
    const width = doc.page.width - 84;
    const bottom = doc.page.height - 55;
    const rowWidths = [0.4, 0.2, 0.25, 0.15].map((f) => f * width);
    const summaryWidths = [0.7 * width, 0.3 * width];

    const header = () => {
      doc.font("Helvetica-Bold").fontSize(15).fillColor(GREEN)
        .text("UNASSIGNED INVENTORY", x, 36, { width, align: "center" });
      doc.font("Helvetica").fontSize(8).fillColor("#555555").text(
        `Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}`,
        x, 57, { width, align: "center" },
      );
      return 82;
    };

    let y = header();
    doc.font("Helvetica").fontSize(8).fillColor("#111111")
      .text(summaryText(report), x, y, { width, align: "center" });
    y = doc.y + 18;

    const rowHeight = (colWidths: number[], values: string[], bold: boolean) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
      return Math.max(
        22,
        ...values.map((value, i) => doc.heightOfString(value, { width: colWidths[i] - 16 }) + 12),
      );
    };

    /** Starts a new page when `height` does not fit, then redraws the heading. */
    const ensureSpace = (height: number, onNewPage?: () => void) => {
      if (y + height > bottom) {
        doc.addPage();
        y = header();
        onNewPage?.();
      }
    };

    const drawCells = (
      colWidths: number[],
      values: string[],
      bold: boolean,
      fill: string | null = null,
    ) => {
      const height = rowHeight(colWidths, values, bold);
      let cellX = x;
      colWidths.forEach((cellWidth, i) => {
        if (fill) {
          doc.lineWidth(0.65).rect(cellX, y, cellWidth, height).fillAndStroke(fill, "#111111");
        } else {
          doc.lineWidth(0.65).rect(cellX, y, cellWidth, height).stroke("#111111");
        }
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10)
          .fillColor(fill === GREEN ? "white" : "#111111");
        doc.text(values[i], cellX + 8, y + 6, { width: cellWidth - 16, align: "center" });
        cellX += cellWidth;
      });
      y += height;
    };

    if (!report.categories.length) {
      doc.font("Helvetica").fontSize(11).fillColor("#111111")
        .text("No unassigned items match the selected filters.", x, y, { width, align: "center" });
    } else {
      // ---------- Category summary ----------
      const summaryHeading = () => drawCells(summaryWidths, ["CATEGORY", "UNASSIGNED"], true, SECTION_FILL);
      ensureSpace(60, summaryHeading);
      summaryHeading();
      for (const category of report.categories) {
        const values = [category.name, String(category.total)];
        ensureSpace(rowHeight(summaryWidths, values, false), summaryHeading);
        drawCells(summaryWidths, values, false);
      }
      y += 24;

      // ---------- One section per category ----------
      for (const category of report.categories) {
        const heading = (continued: boolean) => {
          const label = `${category.name}  (${category.total})${continued ? " (continued)" : ""}`;
          drawCells([width], [label], true, GREEN);
          drawCells(rowWidths, COLUMNS, true, SECTION_FILL);
        };

        ensureSpace(90);
        heading(false);

        for (const row of category.rows) {
          const values = [row.asset, shown(row.unitCode), shown(row.serialNumber), String(row.quantity)];
          ensureSpace(rowHeight(rowWidths, values, false), () => heading(true));
          drawCells(rowWidths, values, false);
        }
        y += 18;
      }
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
//   Sheet 1 "By Category"    - summary, then one block per category
//   Sheet 2 "All Unassigned" - one filterable row per item
// ============================================================

export async function createInventoryExcel(report: InventoryReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CM Asset Management";
  workbook.created = new Date();

  addByCategorySheet(workbook, report);
  addAllSheet(workbook, report);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function addByCategorySheet(workbook: ExcelJS.Workbook, report: InventoryReport) {
  const sheet = workbook.addWorksheet("By Category", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });
  sheet.columns = [{ width: 34 }, { width: 24 }, { width: 24 }, { width: 14 }];
  sheet.headerFooter.oddFooter = "&L CM Asset Management&R Page &P of &N";

  const merged = (text: string, size: number, green = false) => {
    const row = sheet.addRow([text]);
    sheet.mergeCells(row.number, 1, row.number, 4);
    row.height = green ? 28 : 22;
    row.font = { name: "Calibri", size, bold: green, color: { argb: green ? "FFFFFFFF" : "FF111111" } };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    if (green) row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF084D1B" } };
    return row;
  };

  const edge: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FF111111" } };
  const box = (from: number, to: number) => {
    for (let n = from; n <= to; n++) {
      sheet.getRow(n).eachCell((cell) => {
        cell.border = { top: edge, bottom: edge, left: edge, right: edge };
      });
    }
  };
  const columnHeader = (values: string[]) => {
    const row = sheet.addRow(values);
    row.font = { name: "Calibri", size: 11, bold: true };
    row.alignment = { horizontal: "center", vertical: "middle" };
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EADF" } };
    });
    return row;
  };

  merged("UNASSIGNED INVENTORY", 16);
  merged(`Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}`, 10);
  merged(summaryText(report), 10);
  sheet.addRow([]);

  if (!report.categories.length) {
    merged("No unassigned items match the selected filters.", 11);
  } else {
    // Category summary
    const summaryStart = columnHeader(["Category", "Unassigned"]).number;
    for (const category of report.categories) {
      const row = sheet.addRow([category.name, category.total]);
      row.font = { name: "Calibri", size: 11 };
      row.alignment = { horizontal: "center", vertical: "middle" };
    }
    box(summaryStart, sheet.rowCount);
    sheet.addRow([]);

    // One block per category
    for (const category of report.categories) {
      const heading = merged(`${category.name}  (${category.total})`, 13, true);
      const start = heading.number;
      columnHeader(COLUMNS);
      for (const row of category.rows) {
        const excelRow = sheet.addRow([
          row.asset,
          shown(row.unitCode),
          shown(row.serialNumber),
          row.quantity,
        ]);
        excelRow.font = { name: "Calibri", size: 11 };
        excelRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      }
      box(start, sheet.rowCount);
      sheet.addRow([]);
    }
  }

  sheet.pageSetup.printArea = `A1:D${sheet.rowCount}`;
}

function addAllSheet(workbook: ExcelJS.Workbook, report: InventoryReport) {
  const sheet = workbook.addWorksheet("All Unassigned");

  sheet.addRow(["Category", ...COLUMNS]);
  for (const category of report.categories) {
    for (const row of category.rows) {
      sheet.addRow([
        category.name,
        row.asset,
        shown(row.unitCode),
        shown(row.serialNumber),
        row.quantity,
      ]);
    }
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 5 } };

  sheet.columns.forEach((column) => {
    let max = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      max = Math.max(max, Math.min(String(cell.value ?? "").length + 2, 45));
    });
    column.width = max;
  });
}
