import { Controller, Get, Query } from "@nestjs/common";

import { ReportsService, ReportFilters } from "./reports.service";
import { RequirePermissions } from "@/common/decorator/roles.decorator";

@Controller("reports")
@RequirePermissions("reports:read")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // GET /reports/assets
  @Get("assets")
  assetReport(@Query() query: ReportFilters) {
    return this.reports.assetReport(query);
  }

  // GET /reports/inventory
  @Get("inventory")
  inventoryReport(@Query() query: ReportFilters) {
    return this.reports.inventoryReport(query);
  }

  // GET /reports/assigned
  @Get("assigned")
  assignedReport(@Query() query: ReportFilters) {
    return this.reports.assignedReport(query);
  }

  // GET /reports/damaged
  @Get("damaged")
  damagedReport(@Query() query: ReportFilters) {
    return this.reports.damagedReport(query);
  }

  // GET /reports/by-status
  @Get("by-status")
  reportByStatus(@Query() query: ReportFilters) {
    return this.reports.reportByStatus(query);
  }
}
