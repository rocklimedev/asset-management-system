import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

type Field = { label: string; value: string | number; bold?: boolean };
type Card = { title: string; fields: Field[] };
const GREEN = "#084D1B";
const value = (input: unknown): string => input == null || input === "" ? "-" : String(input);

export function reportCards(type: "assets" | "inventory", report: any): Card[] {
  return report.items.map((item: any) => ({
    title: value(item.name),
    fields: type === "assets" ? [
      { label: "ASSET TAG", value: value(item.assetTag), bold: true },
      { label: "Category", value: value(item.category?.name) },
      { label: "Kind", value: value(item.kind) },
      { label: "Status", value: value(item.status) },
      { label: "Condition", value: value(item.condition) },
      { label: "Manufacturer", value: value(item.manufacturer) },
      { label: "Model", value: value(item.model) },
      { label: "Serial Number", value: value(item.serialNumber) },
      { label: "Purchase Value (INR)", value: Number(item.purchasePrice ?? 0) },
      { label: "Purchase Date", value: item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString("en-IN") : "-" },
      { label: "Vendor", value: value(item.vendor?.name) },
      { label: "Location", value: value(item.location?.name) },
    ] : [
      { label: "ASSET TAG", value: value(item.assetTag), bold: true },
      { label: "Category", value: value(item.category) },
      { label: "Total Quantity", value: item.quantity },
      { label: "Assigned", value: item.quantityAssigned },
      { label: "Available", value: item.quantityAvailable },
      { label: "STOCK STATUS", value: item.belowReorderLevel ? "LOW STOCK" : "HEALTHY", bold: true },
    ],
  }));
}

export function reportSummary(type: "assets" | "inventory", report: any): string {
  return type === "assets"
    ? `Total Assets: ${report.totalAssets}    |    Total Value: INR ${Number(report.totalValue ?? 0).toLocaleString("en-IN")}    |    Asset Types: ${Object.keys(report.byKind ?? {}).length}`
    : `SKUs: ${report.totalSkus}    |    Quantity: ${report.totalQuantity}    |    Assigned: ${report.totalAssigned}    |    Available: ${report.totalAvailable}    |    Low Stock: ${report.lowStockCount}`;
}

/** Reference-style detail cards; the original tabular worksheet remains available. */
export function addReportCardsSheet(workbook: ExcelJS.Workbook, type: "assets" | "inventory", report: any) {
  const sheet = workbook.addWorksheet("Detail Cards", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
  });
  sheet.columns = [{ width: 28 }, { width: 56 }];
  sheet.headerFooter.oddFooter = "&L CM Asset Management&R Page &P of &N";
  const merged = (text: string, size: number, green = false) => {
    const row = sheet.addRow([text]);
    sheet.mergeCells(row.number, 1, row.number, 2);
    row.height = Math.max(green ? 32 : 24, Math.ceil(text.length / 65) * (size + 4) + 12);
    row.font = { name: "Calibri", size, bold: green, color: { argb: green ? "FFFFFFFF" : "FF111111" } };
    row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    if (green) row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF084D1B" } };
    return row;
  };
  merged(type === "assets" ? "ASSET REGISTER" : "INVENTORY REPORT", 16);
  merged(`Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}`, 10);
  merged(reportSummary(type, report), 10);
  sheet.addRow([]);
  let pageHeight = 100;
  for (const card of reportCards(type, report)) {
    const heights = card.fields.map(field => Math.max(22, Math.ceil(String(field.value).length / 48) * 15 + 8));
    const headingHeight = Math.max(32, Math.ceil(card.title.length / 65) * 22 + 12);
    const cardHeight = headingHeight + heights.reduce((a, b) => a + b, 0) + 16;
    if (pageHeight + cardHeight > 690) {
      sheet.getRow(sheet.rowCount).addPageBreak();
      pageHeight = 0;
    }
    const start = merged(card.title, 18, true).number;
    card.fields.forEach((field, index) => {
      const row = sheet.addRow([field.label, field.value]);
      row.height = heights[index];
      row.font = { name: "Calibri", size: 11, bold: field.bold ?? false };
      row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      if (field.label === "Purchase Value (INR)") row.getCell(2).numFmt = '#,##0.00';
    });
    for (let n = start; n <= sheet.rowCount; n++) {
      sheet.getRow(n).eachCell(cell => {
        const edge: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FF111111" } };
        cell.border = { top: edge, bottom: edge, left: edge, right: edge };
      });
    }
    sheet.addRow([]).height = 16;
    pageHeight += cardHeight;
  }
  if (!report.items.length) merged("No records match the selected filters.", 11);
  sheet.pageSetup.printArea = `A1:B${sheet.rowCount}`;
}

export function createCardsPdf(type: "assets" | "inventory", report: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const x = 42, width = doc.page.width - 84, split = width * 0.37;
    const bottom = doc.page.height - 55;
    const title = type === "assets" ? "ASSET REGISTER" : "INVENTORY REPORT";
    const header = () => {
      doc.font("Helvetica-Bold").fontSize(15).fillColor(GREEN).text(title, x, 36, { width, align: "center" });
      doc.font("Helvetica").fontSize(8).fillColor("#555555").text(
        `Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}`, x, 57, { width, align: "center" });
      return 82;
    };
    let y = header();
    doc.fontSize(8).fillColor("#111111").text(reportSummary(type, report), x, y, { width, align: "center" });
    y = doc.y + 18;
    for (const card of reportCards(type, report)) {
      doc.font("Helvetica-Bold").fontSize(17);
      const headingHeight = Math.max(34, doc.heightOfString(card.title, { width: width - 20 }) + 14);
      const rows = card.fields.map(field => {
        doc.font(field.bold ? "Helvetica-Bold" : "Helvetica").fontSize(10);
        return { ...field, height: Math.max(23, doc.heightOfString(String(field.value), { width: width - split - 16 }) + 12,
          doc.heightOfString(field.label, { width: split - 16 }) + 12) };
      });
      const total = headingHeight + rows.reduce((sum, row) => sum + row.height, 0);
      if (y + total > bottom && y > 82) { doc.addPage(); y = header(); }
      const drawHeading = (continued = false) => {
        doc.rect(x, y, width, headingHeight).fillAndStroke(GREEN, "#111111");
        doc.font("Helvetica-Bold").fontSize(17).fillColor("white").text(card.title + (continued ? " (continued)" : ""), x + 10, y + 8, { width: width - 20, align: "center" });
        y += headingHeight;
      };
      drawHeading();
      for (const row of rows) {
        // Extremely long values continue in bounded segments without clipping data.
        const font = row.bold ? "Helvetica-Bold" : "Helvetica";
        doc.font(font).fontSize(10);
        let remaining = String(row.value);
        do {
          if (bottom - y < 30) { doc.addPage(); y = header(); drawHeading(true); }
          doc.font(font).fontSize(10);
          const available = bottom - y;
          let end = remaining.length;
          if (doc.heightOfString(remaining, { width: width - split - 16 }) + 12 > available) {
            let low = 1, high = end;
            while (low < high) {
              const mid = Math.ceil((low + high) / 2);
              if (doc.heightOfString(remaining.slice(0, mid), { width: width - split - 16 }) + 12 <= available) low = mid;
              else high = mid - 1;
            }
            end = low;
          }
          const text = remaining.slice(0, end);
          const height = Math.max(23, doc.heightOfString(text, { width: width - split - 16 }) + 12,
            doc.heightOfString(row.label, { width: split - 16 }) + 12);
          doc.lineWidth(0.65).rect(x, y, split, height).stroke("#111111");
          doc.rect(x + split, y, width - split, height).stroke("#111111");
          doc.font(font).fontSize(10).fillColor("#111111");
          doc.text(row.label, x + 8, y + 6, { width: split - 16, align: "center" });
          doc.text(text, x + split + 8, y + 6, { width: width - split - 16, align: "center" });
          y += height;
          remaining = remaining.slice(end);
        } while (remaining.length);
      }
      y += 18;
    }
    if (!report.items.length) doc.fontSize(11).fillColor("#111111").text("No records match the selected filters.", x, y, { width, align: "center" });
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc.font("Helvetica").fontSize(8).fillColor("#666666").text(
        `CM Asset Management    |    Page ${i + 1} of ${range.count}`, x, doc.page.height - 35,
        { width, align: "center", lineBreak: false });
    }
    doc.end();
  });
}
