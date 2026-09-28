import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import {
  SoftwareAssignmentStatus,
  SoftwareInstallationStatus,
} from "@/modules/assets/models/software-license-assignment.model";
import {
  SoftwareSubscriptionType,
  SoftwareUsage,
} from "./models/software-details.model";
import {
  AssignSoftwareDto,
  BulkAssignSoftwareDto,
  CreateLicenseDto,
  CreateSoftwareDto,
  RenewLicenseDto,
  SoftwareService,
  UpdateAssignmentDto,
  UpdateLicenseDto,
  UpdateSoftwareDto,
} from "./software.service";

// ============================================================
// QUERY PARSING HELPERS
// (query params always arrive as strings)
// ============================================================

function optInt(value: string | undefined, name: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new BadRequestException(`${name} must be a whole number`);
  }
  return n;
}

function optBool(value: string | undefined, name: string): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  throw new BadRequestException(`${name} must be true or false`);
}

function optEnum<T extends Record<string, string>>(
  enumObj: T,
  value: string | undefined,
  name: string,
): T[keyof T] | undefined {
  if (value === undefined || value === "") return undefined;
  const allowed = Object.values(enumObj);
  if (!allowed.includes(value)) {
    throw new BadRequestException(
      `${name} must be one of: ${allowed.join(", ")}`,
    );
  }
  return value as T[keyof T];
}

/**
 * NOTE ON ROUTE ORDER
 *
 * Nest matches routes in declaration order, so every static route
 * (reports/*, hierarchy, licenses/*, assignments/*, ...) is declared
 * BEFORE the catch-all `GET :id` at the bottom of this file.
 */
@Controller("software")
export class SoftwareController {
  constructor(private readonly softwareService: SoftwareService) {}

  // ============================================================
  // REPORTS
  // ============================================================

  /** GET /software/reports/summary?days=30 */
  @Get("reports/summary")
  getSummary(@Query("days") days?: string) {
    return this.softwareService.getSummary(optInt(days, "days"));
  }

  /** GET /software/reports/unused  — catalogued but installed nowhere */
  @Get("reports/unused")
  getUnusedSoftware() {
    return this.softwareService.getUnusedSoftware();
  }

  /** GET /software/reports/compliance */
  @Get("reports/compliance")
  getComplianceReport() {
    return this.softwareService.getComplianceReport();
  }

  // ============================================================
  // HIERARCHY
  // ============================================================

  /** GET /software/hierarchy  — full software forest */
  @Get("hierarchy")
  getHierarchy() {
    return this.softwareService.getHierarchy();
  }

  /** GET /software/hierarchy/:assetId  — subtree of one software */
  @Get("hierarchy/:assetId")
  getSubtree(@Param("assetId") assetId: string) {
    return this.softwareService.getHierarchy(assetId);
  }

  // ============================================================
  // LICENSES
  // ============================================================

  /**
   * GET /software/licenses
   *
   * /software/licenses?assetId=<id>
   * /software/licenses?expired=true
   * /software/licenses?expiringInDays=30
   * /software/licenses?hasFreeSeats=true
   */
  @Get("licenses")
  findLicenses(
    @Query("assetId") assetId?: string,
    @Query("expired") expired?: string,
    @Query("expiringInDays") expiringInDays?: string,
    @Query("hasFreeSeats") hasFreeSeats?: string,
  ) {
    return this.softwareService.findLicenses({
      assetId,
      expired: optBool(expired, "expired"),
      expiringInDays: optInt(expiringInDays, "expiringInDays"),
      hasFreeSeats: optBool(hasFreeSeats, "hasFreeSeats"),
    });
  }

  /** POST /software/licenses */
  @Post("licenses")
  createLicense(@Body() dto: CreateLicenseDto) {
    return this.softwareService.createLicense(dto);
  }

  /** POST /software/licenses/recalculate-seats  (body: { licenseId? }) */
  @Post("licenses/recalculate-seats")
  recalculateSeats(@Body() body?: { licenseId?: string }) {
    return this.softwareService.recalculateSeats(body?.licenseId);
  }

  /** GET /software/licenses/:licenseId/usage */
  @Get("licenses/:licenseId/usage")
  getLicenseUsage(@Param("licenseId") licenseId: string) {
    return this.softwareService.getLicenseUsage(licenseId);
  }

  /** POST /software/licenses/:licenseId/renew */
  @Post("licenses/:licenseId/renew")
  renewLicense(
    @Param("licenseId") licenseId: string,
    @Body() dto: RenewLicenseDto,
  ) {
    return this.softwareService.renewLicense(licenseId, dto);
  }

  /** GET /software/licenses/:licenseId */
  @Get("licenses/:licenseId")
  getLicense(@Param("licenseId") licenseId: string) {
    return this.softwareService.getLicense(licenseId);
  }

  /** PATCH /software/licenses/:licenseId */
  @Patch("licenses/:licenseId")
  updateLicense(
    @Param("licenseId") licenseId: string,
    @Body() dto: UpdateLicenseDto,
  ) {
    return this.softwareService.updateLicense(licenseId, dto);
  }

  /** DELETE /software/licenses/:licenseId */
  @Delete("licenses/:licenseId")
  removeLicense(@Param("licenseId") licenseId: string) {
    return this.softwareService.removeLicense(licenseId);
  }

  // ============================================================
  // SOFTWARE ASSIGNMENT  (Software -> System -> Employee)
  // ============================================================

  /** POST /software/assign */
  @Post("assign")
  assign(@Body() dto: AssignSoftwareDto) {
    return this.softwareService.assign(dto);
  }

  /** POST /software/assign/bulk  — one software, many systems */
  @Post("assign/bulk")
  bulkAssign(@Body() dto: BulkAssignSoftwareDto) {
    return this.softwareService.bulkAssign(dto);
  }

  /** POST /software/assign/with-children  — suite + all child software */
  @Post("assign/with-children")
  assignWithChildren(@Body() dto: AssignSoftwareDto) {
    return this.softwareService.assignWithChildren(dto);
  }

  /**
   * GET /software/assignments
   *
   * /software/assignments?softwareAssetId=<id>
   * /software/assignments?systemId=<id>
   * /software/assignments?employeeId=<id>
   * /software/assignments?licenseId=<id>
   * /software/assignments?status=ACTIVE
   * /software/assignments?installationStatus=INSTALLED
   */
  @Get("assignments")
  getAssignments(
    @Query("softwareAssetId") softwareAssetId?: string,
    @Query("systemId") systemId?: string,
    @Query("employeeId") employeeId?: string,
    @Query("licenseId") licenseId?: string,
    @Query("status") status?: string,
    @Query("installationStatus") installationStatus?: string,
  ) {
    return this.softwareService.getAssignments({
      softwareAssetId,
      systemId,
      employeeId,
      licenseId,
      status: optEnum(SoftwareAssignmentStatus, status, "status"),
      installationStatus: optEnum(
        SoftwareInstallationStatus,
        installationStatus,
        "installationStatus",
      ),
    });
  }

  /** GET /software/assignments/:id */
  @Get("assignments/:id")
  getAssignment(@Param("id") id: string) {
    return this.softwareService.getAssignment(id);
  }

  /** PATCH /software/assignments/:id  — version, status, license, notes */
  @Patch("assignments/:id")
  updateAssignment(@Param("id") id: string, @Body() dto: UpdateAssignmentDto) {
    return this.softwareService.updateAssignment(id, dto);
  }

  /** POST /software/assignments/:id/remove */
  @Post("assignments/:id/remove")
  unassign(@Param("id") id: string, @Body() body?: { notes?: string }) {
    return this.softwareService.unassign(id, body?.notes);
  }

  /** POST /software/assignments/:id/transfer  (body: { toSystemId, notes? }) */
  @Post("assignments/:id/transfer")
  transfer(
    @Param("id") id: string,
    @Body() body: { toSystemId: string; notes?: string },
  ) {
    if (!body?.toSystemId) {
      throw new BadRequestException("toSystemId is required");
    }
    return this.softwareService.transfer(id, body.toSystemId, body.notes);
  }

  // ============================================================
  // SYSTEM SOFTWARE
  // ============================================================

  /** GET /software/systems/:systemId  — active software on a system */
  @Get("systems/:systemId")
  getSystemSoftware(@Param("systemId") systemId: string) {
    return this.softwareService.getSystemSoftware(systemId);
  }

  /** POST /software/systems/:systemId/unassign-all  (body: { notes? }) */
  @Post("systems/:systemId/unassign-all")
  unassignAllFromSystem(
    @Param("systemId") systemId: string,
    @Body() body?: { notes?: string },
  ) {
    return this.softwareService.unassignAllFromSystem(systemId, body?.notes);
  }

  // ============================================================
  // EMPLOYEE SOFTWARE
  // ============================================================

  /** GET /software/employees/:employeeId  — software via the employee's systems */
  @Get("employees/:employeeId")
  getEmployeeSoftware(@Param("employeeId") employeeId: string) {
    return this.softwareService.getEmployeeSoftware(employeeId);
  }

  // ============================================================
  // PER-ASSET ROUTES
  // ============================================================

  /** GET /software/asset/:assetId  — details by asset id */
  @Get("asset/:assetId")
  findByAsset(@Param("assetId") assetId: string) {
    return this.softwareService.findByAssetId(assetId);
  }

  /** GET /software/asset/:assetId/children */
  @Get("asset/:assetId/children")
  getChildren(@Param("assetId") assetId: string) {
    return this.softwareService.getChildren(assetId);
  }

  /** GET /software/asset/:assetId/users  — employees using this software */
  @Get("asset/:assetId/users")
  getSoftwareUsers(@Param("assetId") assetId: string) {
    return this.softwareService.getSoftwareUsers(assetId);
  }

  // ============================================================
  // SOFTWARE CATALOG
  // ============================================================

  /**
   * GET /software
   *
   * /software?search=photoshop
   * /software?usage=IN_USE
   * /software?subscriptionType=SUBSCRIPTION
   * /software?parentSoftwareId=<assetId>
   * /software?publisher=adobe&rootOnly=true
   * /software?sortBy=name&sortDir=ASC&page=2&limit=25
   */
  @Get()
  findAll(
    @Query("search") search?: string,
    @Query("usage") usage?: string,
    @Query("subscriptionType") subscriptionType?: string,
    @Query("parentSoftwareId") parentSoftwareId?: string,
    @Query("publisher") publisher?: string,
    @Query("rootOnly") rootOnly?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortDir") sortDir?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const sortByValue = sortBy
      ? (["createdAt", "name", "publisher"] as const).find((s) => s === sortBy)
      : undefined;

    if (sortBy && !sortByValue) {
      throw new BadRequestException(
        "sortBy must be one of: createdAt, name, publisher",
      );
    }

    const dir = sortDir?.toUpperCase();
    if (dir && dir !== "ASC" && dir !== "DESC") {
      throw new BadRequestException("sortDir must be ASC or DESC");
    }

    return this.softwareService.findAll({
      search,
      usage: optEnum(SoftwareUsage, usage, "usage"),
      subscriptionType: optEnum(
        SoftwareSubscriptionType,
        subscriptionType,
        "subscriptionType",
      ),
      parentSoftwareId,
      publisher,
      rootOnly: optBool(rootOnly, "rootOnly"),
      sortBy: sortByValue,
      sortDir: dir as "ASC" | "DESC" | undefined,
      page: optInt(page, "page"),
      limit: optInt(limit, "limit"),
    });
  }

  /** POST /software */
  @Post()
  create(@Body() dto: CreateSoftwareDto) {
    return this.softwareService.create(dto);
  }

  /** PATCH /software/bulk/usage  (body: { ids: string[], usage }) */
  @Patch("bulk/usage")
  bulkUpdateUsage(@Body() body: { ids: string[]; usage: SoftwareUsage }) {
    const usage = optEnum(SoftwareUsage, body?.usage, "usage");
    if (!usage) throw new BadRequestException("usage is required");
    return this.softwareService.bulkUpdateUsage(body.ids, usage);
  }

  // ------------------------------------------------------------
  // Catch-all `:id` routes MUST stay last.
  // ------------------------------------------------------------

  /** GET /software/:id */
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.softwareService.findOne(id);
  }

  /** PATCH /software/:id */
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateSoftwareDto) {
    return this.softwareService.update(id, dto);
  }

  /** DELETE /software/:id */
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.softwareService.remove(id);
  }
}
