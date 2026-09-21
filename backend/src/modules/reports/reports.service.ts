import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, WhereOptions } from "sequelize";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

import {
  Asset,
  AssetCondition,
  AssetStatus,
} from "../assets/models/asset.model";
import { AssetCategory } from "../assets/models/asset-category.model";
import { Vendor } from "../assets/models/vendor.model";
import {
  AssetAssignment,
  AssignmentStatus,
} from "../assets/models/asset-assignment.model";

import { Location } from "@/modules/organisation/models/location.model";
import { Employee } from "@/modules/organisation/models/employees.model";

export interface ReportFilters {
  organisationId?: string;
  kind?: string;
  categoryId?: string;
  locationId?: string;
  from?: string;
  to?: string;
}

export type ReportExportType =
  | "assets"
  | "inventory"
  | "assigned"
  | "damaged"
  | "by-status";

export type ReportExportFormat = "pdf" | "excel";

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Asset)
    private readonly assetModel: typeof Asset,

    @InjectModel(AssetAssignment)
    private readonly assetAssignmentModel: typeof AssetAssignment,
  ) {}

  // ============================================================
  // SHARED FILTER BUILDER
  // ============================================================

  private buildWhere(filters: ReportFilters): WhereOptions<Asset> {
    const and: WhereOptions<Asset>[] = [];

    if (filters.organisationId) {
      and.push({
        organisationId: filters.organisationId,
      });
    }

    if (filters.kind) {
      and.push({
        kind: filters.kind as Asset["kind"],
      });
    }

    if (filters.categoryId) {
      and.push({
        categoryId: filters.categoryId,
      });
    }

    if (filters.locationId) {
      and.push({
        locationId: filters.locationId,
      });
    }

    if (filters.from || filters.to) {
      const range: Record<symbol, Date> = {};

      if (filters.from) {
        range[Op.gte] = new Date(filters.from);
      }

      if (filters.to) {
        const to = new Date(filters.to);

        // Include the complete "to" day.
        to.setHours(23, 59, 59, 999);

        range[Op.lte] = to;
      }

      and.push({
        purchaseDate: range,
      } as WhereOptions<Asset>);
    }

    return and.length > 0
      ? {
          [Op.and]: and,
        }
      : {};
  }

  // ============================================================
  // 1. ASSET REPORT
  // ============================================================

  async assetReport(filters: ReportFilters) {
    const where = this.buildWhere(filters);

    const assets = await this.assetModel.findAll({
      where,
      include: [
        {
          model: AssetCategory,
          as: "category",
        },
        {
          model: Vendor,
          as: "vendor",
        },
        {
          model: Location,
          as: "location",
        },
      ],
      order: [["assetTag", "ASC"]],
    });

    const totalValue = assets.reduce(
      (sum, asset) => sum + Number(asset.purchasePrice ?? 0),
      0,
    );

    const byKind = assets.reduce<Record<string, number>>((acc, asset) => {
      acc[asset.kind] = (acc[asset.kind] ?? 0) + 1;
      return acc;
    }, {});

    return {
      generatedAt: new Date(),
      totalAssets: assets.length,
      totalValue,
      byKind,
      items: assets,
    };
  }

  // ============================================================
  // 2. INVENTORY REPORT
  // ============================================================

  async inventoryReport(filters: ReportFilters) {
    const where = this.buildWhere(filters);

    const assets = await this.assetModel.findAll({
      where,
      include: [
        {
          model: AssetCategory,
          as: "category",
        },
      ],
      order: [["name", "ASC"]],
    });

    const items = assets.map((asset) => {
      const quantity = asset.quantity ?? 1;
      const assigned = asset.quantityAssigned ?? 0;
      const available = quantity - assigned;

      return {
        id: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        category: asset.category?.name ?? null,
        quantity,
        quantityAssigned: assigned,
        quantityAvailable: available,
        belowReorderLevel:
          asset.reorderLevel != null && available <= asset.reorderLevel,
      };
    });

    return {
      generatedAt: new Date(),
      totalSkus: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAssigned: items.reduce(
        (sum, item) => sum + item.quantityAssigned,
        0,
      ),
      totalAvailable: items.reduce(
        (sum, item) => sum + item.quantityAvailable,
        0,
      ),
      lowStockCount: items.filter((item) => item.belowReorderLevel).length,
      items,
    };
  }

  // ============================================================
  // 3. ASSIGNED REPORT
  // ============================================================

  async assignedReport(filters: ReportFilters) {
    const where: WhereOptions<Asset> = {
      [Op.and]: [
        this.buildWhere(filters),
        {
          status: AssetStatus.ASSIGNED,
        },
      ],
    } as WhereOptions<Asset>;

    const assets = await this.assetModel.findAll({
      where,
      include: [
        {
          model: AssetAssignment,
          as: "assignments",
          where: {
            status: AssignmentStatus.ACTIVE,
          },
          required: true,
          include: [
            {
              model: Employee,
              as: "employee",
            },
          ],
        },
        {
          model: AssetCategory,
          as: "category",
        },
      ],
      order: [["assetTag", "ASC"]],
    });

    return {
      generatedAt: new Date(),
      totalAssigned: assets.length,
      items: assets.map((asset) => ({
        id: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        category: asset.category?.name ?? null,
        assignedTo: asset.assignments?.[0]?.employee?.name ?? null,
        assignedAt: asset.assignments?.[0]?.assignedAt ?? null,
      })),
    };
  }

  // ============================================================
  // 4. DAMAGED REPORT
  // ============================================================

  async damagedReport(filters: ReportFilters) {
    const baseWhere = this.buildWhere(filters);

    const statusOrConditionClause: WhereOptions<Asset> = {
      [Op.or]: [
        {
          status: AssetStatus.DAMAGED,
        },
        {
          status: AssetStatus.REPAIR,
        },
        {
          condition: AssetCondition.POOR,
        },
      ],
    } as WhereOptions<Asset>;

    const where: WhereOptions<Asset> = {
      [Op.and]: [baseWhere, statusOrConditionClause],
    } as WhereOptions<Asset>;

    const assets = await this.assetModel.findAll({
      where,
      include: [
        {
          model: AssetCategory,
          as: "category",
        },
        {
          model: Location,
          as: "location",
        },
      ],
      order: [["status", "ASC"]],
    });

    return {
      generatedAt: new Date(),
      totalDamaged: assets.length,
      items: assets.map((asset) => ({
        id: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        status: asset.status,
        condition: asset.condition,
        location: asset.location?.name ?? null,
        notes: asset.notes ?? null,
      })),
    };
  }

  // ============================================================
  // 5. STATUS REPORT
  // ============================================================

  async reportByStatus(filters: ReportFilters) {
    const where = this.buildWhere(filters);

    const rows = (await this.assetModel.findAll({
      where,
      attributes: [
        "status",
        [
          this.assetModel.sequelize!.fn(
            "COUNT",
            this.assetModel.sequelize!.col("Asset.id"),
          ),
          "count",
        ],
      ],
      group: ["status"],
      raw: true,
    })) as unknown as {
      status: AssetStatus;
      count: string;
    }[];

    const breakdown = Object.values(AssetStatus).map((status) => {
      const match = rows.find((row) => row.status === status);

      return {
        status,
        count: match ? Number(match.count) : 0,
      };
    });

    return {
      generatedAt: new Date(),
      total: breakdown.reduce((sum, entry) => sum + entry.count, 0),
      breakdown,
    };
  }

  // ============================================================
  // EXPORT
  // ============================================================

  async exportReport(
    type: ReportExportType,
    format: ReportExportFormat,
    filters: ReportFilters,
  ): Promise<{
    buffer: Buffer;
    contentType: string;
    filename: string;
  }> {
    const report = await this.getReportData(type, filters);

    if (format === "excel") {
      const buffer = await this.createExcelReport(type, report);

      return {
        buffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: `asset-report-${type}-${this.fileDate()}.xlsx`,
      };
    }

    const buffer = await this.createPdfReport(type, report);

    return {
      buffer,
      contentType: "application/pdf",
      filename: `asset-report-${type}-${this.fileDate()}.pdf`,
    };
  }

  // ============================================================
  // GET REPORT DATA FOR EXPORT
  // ============================================================

  private async getReportData(
    type: ReportExportType,
    filters: ReportFilters,
  ): Promise<any> {
    switch (type) {
      case "assets":
        return this.assetReport(filters);

      case "inventory":
        return this.inventoryReport(filters);

      case "assigned":
        return this.assignedReport(filters);

      case "damaged":
        return this.damagedReport(filters);

      case "by-status":
        return this.reportByStatus(filters);

      default:
        throw new Error(`Unsupported report type: ${type}`);
    }
  }

  // ============================================================
  // EXCEL
  // ============================================================

  private async createExcelReport(
    type: ReportExportType,
    report: any,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "CM Asset Management";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(this.getReportTitle(type));

    worksheet.views = [
      {
        state: "frozen",
        ySplit: 1,
      },
    ];

    switch (type) {
      case "assets":
        this.buildAssetExcel(worksheet, report);
        break;

      case "inventory":
        this.buildInventoryExcel(worksheet, report);
        break;

      case "assigned":
        this.buildAssignedExcel(worksheet, report);
        break;

      case "damaged":
        this.buildDamagedExcel(worksheet, report);
        break;

      case "by-status":
        this.buildStatusExcel(worksheet, report);
        break;
    }

    worksheet.getRow(1).font = {
      bold: true,
    };

    worksheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    worksheet.autoFilter = {
      from: "A1",
      to: `${this.columnLetter(worksheet.columnCount)}1`,
    };

    for (const column of worksheet.columns) {
      if (!column) {
        continue;
      }

      let maxLength = 12;

      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const value = cell.value;
        const length = value ? String(value).length : 0;

        maxLength = Math.max(maxLength, Math.min(length + 2, 45));
      });

      column.width = maxLength;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(buffer);
  }
  private buildAssetExcel(worksheet: ExcelJS.Worksheet, report: any) {
    worksheet.addRow([
      "Asset Tag",
      "Name",
      "Kind",
      "Category",
      "Status",
      "Condition",
      "Purchase Price",
      "Purchase Date",
      "Vendor",
      "Location",
    ]);

    for (const asset of report.items) {
      worksheet.addRow([
        asset.assetTag ?? "",
        asset.name ?? "",
        asset.kind ?? "",
        asset.category?.name ?? "",
        asset.status ?? "",
        asset.condition ?? "",
        Number(asset.purchasePrice ?? 0),
        asset.purchaseDate ? new Date(asset.purchaseDate) : "",
        asset.vendor?.name ?? "",
        asset.location?.name ?? "",
      ]);
    }

    worksheet.getColumn(7).numFmt = "₹#,##0.00";

    worksheet.getColumn(8).numFmt = "dd-mmm-yyyy";
  }

  private buildInventoryExcel(worksheet: ExcelJS.Worksheet, report: any) {
    worksheet.addRow([
      "Asset Tag",
      "Name",
      "Category",
      "Quantity",
      "Assigned",
      "Available",
      "Stock Status",
    ]);

    for (const item of report.items) {
      worksheet.addRow([
        item.assetTag ?? "",
        item.name ?? "",
        item.category ?? "",
        item.quantity,
        item.quantityAssigned,
        item.quantityAvailable,
        item.belowReorderLevel ? "LOW STOCK" : "HEALTHY",
      ]);
    }
  }

  private buildAssignedExcel(worksheet: ExcelJS.Worksheet, report: any) {
    worksheet.addRow([
      "Asset Tag",
      "Asset",
      "Category",
      "Assigned To",
      "Assigned At",
    ]);

    for (const item of report.items) {
      worksheet.addRow([
        item.assetTag ?? "",
        item.name ?? "",
        item.category ?? "",
        item.assignedTo ?? "",
        item.assignedAt ? new Date(item.assignedAt) : "",
      ]);
    }

    worksheet.getColumn(5).numFmt = "dd-mmm-yyyy hh:mm";
  }

  private buildDamagedExcel(worksheet: ExcelJS.Worksheet, report: any) {
    worksheet.addRow([
      "Asset Tag",
      "Asset",
      "Status",
      "Condition",
      "Location",
      "Notes",
    ]);

    for (const item of report.items) {
      worksheet.addRow([
        item.assetTag ?? "",
        item.name ?? "",
        item.status ?? "",
        item.condition ?? "",
        item.location ?? "",
        item.notes ?? "",
      ]);
    }
  }

  private buildStatusExcel(worksheet: ExcelJS.Worksheet, report: any) {
    worksheet.addRow(["Status", "Count", "Share"]);

    for (const item of report.breakdown) {
      const percentage =
        report.total > 0 ? (item.count / report.total) * 100 : 0;

      worksheet.addRow([item.status, item.count, `${percentage.toFixed(1)}%`]);
    }
  }

  // ============================================================
  // PDF
  // ============================================================

  private async createPdfReport(
    type: ReportExportType,
    report: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 30,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];

      document.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      document.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      document.on("error", reject);

      document
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(this.getReportTitle(type), {
          align: "left",
        });

      document
        .moveDown(0.4)
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#666666")
        .text(`Generated: ${new Date().toLocaleString("en-IN")}`);

      document.moveDown(0.8).fillColor("#000000");

      switch (type) {
        case "assets":
          this.buildAssetPdf(document, report);
          break;

        case "inventory":
          this.buildInventoryPdf(document, report);
          break;

        case "assigned":
          this.buildAssignedPdf(document, report);
          break;

        case "damaged":
          this.buildDamagedPdf(document, report);
          break;

        case "by-status":
          this.buildStatusPdf(document, report);
          break;
      }

      document.end();
    });
  }

  private buildAssetPdf(document: PDFKit.PDFDocument, report: any) {
    this.pdfSummary(document, [
      ["Total Assets", report.totalAssets],
      ["Total Value", this.currency(report.totalValue)],
      ["Asset Types", Object.keys(report.byKind ?? {}).length],
    ]);

    this.pdfTable(
      document,
      ["Asset Tag", "Name", "Kind", "Category", "Status", "Condition", "Value"],
      report.items.map((asset: any) => [
        asset.assetTag,
        asset.name,
        asset.kind,
        asset.category?.name,
        asset.status,
        asset.condition,
        this.currency(asset.purchasePrice),
      ]),
    );
  }

  private buildInventoryPdf(document: PDFKit.PDFDocument, report: any) {
    this.pdfSummary(document, [
      ["SKUs", report.totalSkus],
      ["Quantity", report.totalQuantity],
      ["Assigned", report.totalAssigned],
      ["Available", report.totalAvailable],
      ["Low Stock", report.lowStockCount],
    ]);

    this.pdfTable(
      document,
      [
        "Asset Tag",
        "Name",
        "Category",
        "Qty",
        "Assigned",
        "Available",
        "Status",
      ],
      report.items.map((item: any) => [
        item.assetTag,
        item.name,
        item.category,
        item.quantity,
        item.quantityAssigned,
        item.quantityAvailable,
        item.belowReorderLevel ? "LOW STOCK" : "HEALTHY",
      ]),
    );
  }

  private buildAssignedPdf(document: PDFKit.PDFDocument, report: any) {
    this.pdfSummary(document, [["Currently Assigned", report.totalAssigned]]);

    this.pdfTable(
      document,
      ["Asset Tag", "Asset", "Category", "Assigned To", "Assigned At"],
      report.items.map((item: any) => [
        item.assetTag,
        item.name,
        item.category,
        item.assignedTo,
        item.assignedAt
          ? new Date(item.assignedAt).toLocaleString("en-IN")
          : "",
      ]),
    );
  }

  private buildDamagedPdf(document: PDFKit.PDFDocument, report: any) {
    this.pdfSummary(document, [["Damaged / Repair", report.totalDamaged]]);

    this.pdfTable(
      document,
      ["Asset Tag", "Asset", "Status", "Condition", "Location", "Notes"],
      report.items.map((item: any) => [
        item.assetTag,
        item.name,
        item.status,
        item.condition,
        item.location,
        item.notes,
      ]),
    );
  }

  private buildStatusPdf(document: PDFKit.PDFDocument, report: any) {
    this.pdfSummary(document, [["Total Assets", report.total]]);

    this.pdfTable(
      document,
      ["Status", "Count", "Share"],
      report.breakdown.map((item: any) => {
        const percentage =
          report.total > 0 ? (item.count / report.total) * 100 : 0;

        return [item.status, item.count, `${percentage.toFixed(1)}%`];
      }),
    );
  }

  // ============================================================
  // PDF HELPERS
  // ============================================================

  private pdfSummary(
    document: PDFKit.PDFDocument,
    values: Array<[string, string | number]>,
  ) {
    document.fontSize(9).font("Helvetica-Bold").fillColor("#000000");

    document.text(
      values.map(([label, value]) => `${label}: ${value}`).join("    |    "),
    );

    document.moveDown(0.8);
  }

  private pdfTable(
    document: PDFKit.PDFDocument,
    headers: string[],
    rows: any[][],
  ) {
    const pageWidth =
      document.page.width -
      document.page.margins.left -
      document.page.margins.right;

    const columnWidth = pageWidth / headers.length;

    let y = document.y;

    const drawHeader = () => {
      if (y > document.page.height - document.page.margins.bottom - 40) {
        document.addPage();
        y = document.page.margins.top;
      }

      document.fontSize(8).font("Helvetica-Bold").fillColor("#111111");

      headers.forEach((header, index) => {
        document.text(
          this.truncatePdfText(header, 22),
          document.page.margins.left + index * columnWidth,
          y,
          {
            width: columnWidth - 6,
            height: 20,
            lineBreak: false,
          },
        );
      });

      y += 20;

      document
        .moveTo(document.page.margins.left, y)
        .lineTo(document.page.width - document.page.margins.right, y)
        .strokeColor("#999999")
        .stroke();

      y += 7;
    };

    drawHeader();

    document.fontSize(7.5).font("Helvetica").fillColor("#222222");

    for (const row of rows) {
      const rowHeight = 20;

      if (y + rowHeight > document.page.height - document.page.margins.bottom) {
        document.addPage();

        y = document.page.margins.top;

        drawHeader();

        document.fontSize(7.5).font("Helvetica").fillColor("#222222");
      }

      row.forEach((value, index) => {
        document.text(
          this.truncatePdfText(value == null ? "" : String(value), 32),
          document.page.margins.left + index * columnWidth,
          y,
          {
            width: columnWidth - 6,
            height: rowHeight,
            lineBreak: false,
          },
        );
      });

      y += rowHeight;
    }
  }

  private truncatePdfText(value: string, maxLength: number) {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.substring(0, maxLength - 3)}...`;
  }

  private currency(value: unknown) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value ?? 0));
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getReportTitle(type: ReportExportType) {
    switch (type) {
      case "assets":
        return "Asset Register";

      case "inventory":
        return "Inventory Report";

      case "assigned":
        return "Assigned Assets Report";

      case "damaged":
        return "Damaged & Repair Report";

      case "by-status":
        return "Asset Status Report";
    }
  }

  private fileDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  private columnLetter(column: number) {
    let result = "";
    let current = column;

    while (current > 0) {
      const remainder = (current - 1) % 26;

      result = String.fromCharCode(65 + remainder) + result;

      current = Math.floor((current - 1) / 26);
    }

    return result;
  }
}
