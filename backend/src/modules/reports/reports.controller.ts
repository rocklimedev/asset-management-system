import { Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";

import {
  ReportsService,
  ReportExportFormat,
  ReportExportType,
  ReportFilters,
} from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // ============================================================
  // JSON REPORTS
  // ============================================================

  @Get("assets")
  assetReport(@Query() query: ReportFilters) {
    return this.reports.assetReport(query);
  }

  @Get("inventory")
  inventoryReport(@Query() query: ReportFilters) {
    return this.reports.inventoryReport(query);
  }

  @Get("assigned")
  assignedReport(@Query() query: ReportFilters) {
    return this.reports.assignedReport(query);
  }

  @Get("damaged")
  damagedReport(@Query() query: ReportFilters) {
    return this.reports.damagedReport(query);
  }

  @Get("by-status")
  reportByStatus(@Query() query: ReportFilters) {
    return this.reports.reportByStatus(query);
  }

  // ============================================================
  // EXPORTS
  //
  // Examples:
  //
  // GET /reports/assets/export?format=pdf
  // GET /reports/assets/export?format=excel
  //
  // GET /reports/inventory/export?format=pdf
  // GET /reports/inventory/export?format=excel
  //
  // ============================================================

  @Get("assets/export")
  exportAssets(
    @Query() query: ReportFilters & { format?: string },
    @Res() response: Response,
  ) {
    return this.exportReport("assets", query, response);
  }

  @Get("inventory/export")
  exportInventory(
    @Query() query: ReportFilters & { format?: string },
    @Res() response: Response,
  ) {
    return this.exportReport("inventory", query, response);
  }

  @Get("assigned/export")
  exportAssigned(
    @Query() query: ReportFilters & { format?: string },
    @Res() response: Response,
  ) {
    return this.exportReport("assigned", query, response);
  }

  @Get("damaged/export")
  exportDamaged(
    @Query() query: ReportFilters & { format?: string },
    @Res() response: Response,
  ) {
    return this.exportReport("damaged", query, response);
  }

  @Get("by-status/export")
  exportByStatus(
    @Query() query: ReportFilters & { format?: string },
    @Res() response: Response,
  ) {
    return this.exportReport("by-status", query, response);
  }

  // ============================================================
  // SHARED EXPORT HANDLER
  // ============================================================

  private async exportReport(
    type: ReportExportType,
    query: ReportFilters & {
      format?: string;
    },
    response: Response,
  ) {
    const format = query.format?.toLowerCase() === "excel" ? "excel" : "pdf";

    const { format: _format, ...filters } = query;

    const result = await this.reports.exportReport(
      type,
      format as ReportExportFormat,
      filters,
    );

    response.setHeader("Content-Type", result.contentType);

    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );

    response.setHeader("Content-Length", result.buffer.length.toString());

    response.end(result.buffer);
  }
}
