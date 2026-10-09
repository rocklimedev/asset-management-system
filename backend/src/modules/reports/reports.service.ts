import { System } from "../assets/models/system.model";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, WhereOptions } from "sequelize";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { addReportCardsSheet, createCardsPdf } from "./report-cards";
import {
  createInventoryExcel,
  createInventoryPdf,
  InventoryCategory,
  InventoryReport,
  InventoryRow,
  UNCATEGORISED_LABEL,
} from "./inventory-report";
import {
  buildSystemRecord,
  companyName,
  createSystemsExcel,
  createSystemsPdf,
  SystemsReport,
} from "./system-report";
import { SystemSpecs } from "../assets/models/system-specs.model";
import { Organisation } from "@/modules/organisation/models/organisation.model";

import {
  Asset,
  AssetCondition,
  AssetStatus,
} from "../assets/models/asset.model";
import { AssetUnit, AssetUnitStatus } from "../assets/models/asset-unit.model";
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
  | "by-status"
  | "systems";

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

  async inventoryReport(filters: ReportFilters): Promise<InventoryReport> {
    const assets = await this.assetModel.findAll({
      where: this.buildWhere(filters),
      include: [{ model: AssetCategory, as: "category" }],
      order: [["name", "ASC"]],
    });

    // Units of individually tracked assets. An asset with no units is pooled.
    const units = assets.length
      ? await AssetUnit.findAll({
          where: { assetId: { [Op.in]: assets.map((asset) => asset.id) } },
          attributes: ["id", "assetId", "unitCode", "serialNumber", "status"],
        })
      : [];

    const unitsByAsset = new Map<string, AssetUnit[]>();
    for (const unit of units) {
      unitsByAsset.set(unit.assetId, [...(unitsByAsset.get(unit.assetId) ?? []), unit]);
    }

    // Only what is NOT assigned: available units, or free quantity of pooled assets.
    const rows: Array<InventoryRow & { category: string }> = [];
    for (const asset of assets) {
      const category = asset.category?.name || UNCATEGORISED_LABEL;
      const assetUnits = unitsByAsset.get(asset.id);

      if (assetUnits?.length) {
        for (const unit of assetUnits) {
          if (unit.status !== AssetUnitStatus.AVAILABLE) continue;
          rows.push({
            category,
            asset: asset.name,
            unitCode: unit.unitCode ?? "",
            serialNumber: unit.serialNumber ?? "",
            quantity: 1,
          });
        }
      } else {
        const free = Math.max((asset.quantity ?? 0) - (asset.quantityAssigned ?? 0), 0);
        if (free > 0) {
          rows.push({ category, asset: asset.name, unitCode: "", serialNumber: "", quantity: free });
        }
      }
    }

    const byCategory = new Map<string, InventoryRow[]>();
    for (const { category, ...row } of rows) {
      byCategory.set(category, [...(byCategory.get(category) ?? []), row]);
    }

    const categories: InventoryCategory[] = [...byCategory.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, list]) => ({
        name,
        total: list.reduce((sum, row) => sum + row.quantity, 0),
        rows: list.sort(
          (a, b) =>
            a.asset.localeCompare(b.asset, undefined, { numeric: true, sensitivity: "base" }) ||
            a.unitCode.localeCompare(b.unitCode, undefined, { numeric: true, sensitivity: "base" }),
        ),
      }));

    return {
      generatedAt: new Date(),
      totalUnassigned: categories.reduce((sum, category) => sum + category.total, 0),
      totalCategories: categories.length,
      categories,
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
            { model: System, include: [Employee] },
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
        assignedTo: asset.assignments?.[0]?.system
          ? `System: ${asset.assignments[0].system!.systemTag} (${asset.assignments[0].system!.employee?.name ?? "Unassigned"})`
          : (asset.assignments?.[0]?.employee?.name ?? null),
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
  // 6. SYSTEMS REPORT (IT data sheet)
  //
  // One record per system: company, PC name, holder, specs and
  // the monitor / keyboard / mouse / phone etc. that go with it.
  // Only the organisation filter applies to systems.
  // ============================================================

  async systemsReport(filters: ReportFilters): Promise<SystemsReport> {
    const systems = await System.findAll({
      include: [
        { model: Organisation, required: false },
        {
          model: Employee,
          required: false,
          include: [{ model: Organisation, required: false }],
        },
        { model: SystemSpecs, as: "specs", required: false },
        {
          model: AssetAssignment,
          where: { status: AssignmentStatus.ACTIVE },
          required: false,
          include: [
            {
              model: Asset,
              include: [AssetCategory],
            },
            { model: AssetUnit, required: false },
          ],
        },
      ],
    });

    const rows = systems
      .map((system) => ({
        system,
        company: companyName(
          system.organisation?.name,
          system.employee?.organisation?.name,
        ),
      }))
      .filter(
        ({ system }) =>
          !filters.organisationId ||
          (system.organisationId ?? system.employee?.organisationId) ===
            filters.organisationId,
      )
      .sort(
        (a, b) =>
          a.company.localeCompare(b.company) ||
          a.system.name.localeCompare(b.system.name, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
      );

    // Things given straight to the holder (e.g. a mobile phone) rather than
    // to a system. They are listed once, on the holder's first system.
    const employeeIds = [
      ...new Set(
        rows.map(({ system }) => system.employeeId).filter(Boolean),
      ),
    ] as string[];

    const direct = employeeIds.length
      ? await this.assetAssignmentModel.findAll({
          where: {
            status: AssignmentStatus.ACTIVE,
            systemId: null,
            employeeId: { [Op.in]: employeeIds },
          } as WhereOptions<AssetAssignment>,
          include: [
            { model: Asset, include: [AssetCategory] },
            { model: AssetUnit, required: false },
          ],
        })
      : [];

    // A unit assignment (one physical laptop, monitor, ...) is shown with
    // its unit code and serial, so two units of the same model stay separate.
    const toComponent = (assignment: AssetAssignment) => {
      const unit = assignment.assetUnit;
      const base = assignment.asset?.name ?? "";
      const details = [
        unit?.unitCode,
        unit?.serialNumber ? `S/N ${unit.serialNumber}` : null,
      ].filter(Boolean);
      return {
        name: details.length && base ? `${base} (${details.join(", ")})` : base,
        category: assignment.asset?.category?.name ?? "",
      };
    };

    const claimed = new Set<string>();
    const byCompany: Record<string, number> = {};

    const items = rows.map(({ system, company }) => {
      const extra: ReturnType<typeof toComponent>[] = [];

      if (system.employeeId && !claimed.has(system.employeeId)) {
        claimed.add(system.employeeId);
        direct
          .filter((a) => a.employeeId === system.employeeId)
          .forEach((a) => extra.push(toComponent(a)));
      }

      byCompany[company] = (byCompany[company] ?? 0) + 1;

      return buildSystemRecord({
        id: system.id,
        systemName: system.name,
        systemTag: system.systemTag,
        company,
        holder: system.employee?.name,
        specs: system.specs,
        components: [
          ...(system.assignments ?? []).map(toComponent),
          ...extra,
        ].filter((component) => component.name),
      });
    });

    return {
      generatedAt: new Date(),
      totalSystems: items.length,
      byCompany,
      items,
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

    if (type === "inventory") {
      const date = this.fileDate();
      const inventory = report as InventoryReport;

      return format === "excel"
        ? {
            buffer: await createInventoryExcel(inventory),
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename: `unassigned-inventory-${date}.xlsx`,
          }
        : {
            buffer: await createInventoryPdf(inventory),
            contentType: "application/pdf",
            filename: `unassigned-inventory-${date}.pdf`,
          };
    }

    if (type === "systems") {
      const date = this.fileDate();

      return format === "excel"
        ? {
            buffer: await createSystemsExcel(report),
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename: `system-it-data-${date}.xlsx`,
          }
        : {
            buffer: await createSystemsPdf(report),
            contentType: "application/pdf",
            filename: `system-it-data-${date}.pdf`,
          };
    }

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

      case "systems":
        return this.systemsReport(filters);

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

    if (type === "assets" || type === "inventory") {
      addReportCardsSheet(workbook, type, report);
    }

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
    if (type === "assets" || type === "inventory") {
      return createCardsPdf(type, report);
    }
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

      case "systems":
        return "System IT Data";
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
