import { Controller, Get, Param, Query } from "@nestjs/common";

import { AssetAssignmentService } from "./asset-assignment.service";

import { AssignmentStatus } from "./models/asset-assignment.model";

@Controller("asset-assignments")
export class AssetAssignmentController {
  constructor(private readonly service: AssetAssignmentService) {}

  // ============================================================
  // GET ALL ASSIGNMENTS
  //
  // GET /asset-assignments
  //
  // Optional:
  // ?status=ACTIVE
  // ?employeeId=...
  // ?assetId=...
  // ?assetUnitId=...
  // ?systemId=...
  // ============================================================

  @Get()
  findAll(
    @Query("status") status?: AssignmentStatus,
    @Query("employeeId") employeeId?: string,
    @Query("assetId") assetId?: string,
    @Query("assetUnitId") assetUnitId?: string,
    @Query("systemId") systemId?: string,
    @Query("search") search?: string,
  ) {
    return this.service.findAll({
      status,
      employeeId,
      assetId,
      assetUnitId,
      systemId,
      search,
    });
  }

  // ============================================================
  // EMPLOYEE ASSIGNMENTS
  //
  // GET /asset-assignments/employees/:employeeId
  //
  // Returns all assets / units ever assigned to the employee.
  //
  // Optional:
  // ?status=ACTIVE
  // ?activeOnly=true
  // ============================================================

  @Get("employees/:employeeId")
  findByEmployee(
    @Param("employeeId") employeeId: string,
    @Query("status") status?: AssignmentStatus,
    @Query("activeOnly") activeOnly?: string,
  ) {
    return this.service.findByEmployee(employeeId, {
      status,
      activeOnly: activeOnly === "true",
    });
  }

  // ============================================================
  // CURRENT EMPLOYEE ASSIGNMENTS
  //
  // GET /asset-assignments/employees/:employeeId/active
  //
  // IMPORTANT:
  // This route must be declared BEFORE the generic employee
  // route if your Nest routing setup can otherwise match it.
  // ============================================================

  @Get("employees/:employeeId/active")
  findActiveByEmployee(@Param("employeeId") employeeId: string) {
    return this.service.findActiveByEmployee(employeeId);
  }

  // ============================================================
  // ASSET ASSIGNMENT HISTORY
  //
  // GET /asset-assignments/assets/:assetId
  //
  // THIS IS THE MAIN ENDPOINT FOR ASSET DETAIL.
  //
  // Returns:
  //
  // Asset
  //   ├── Rahul
  //   │    └── LAPTOP-001
  //   │
  //   ├── Amit
  //   │    └── LAPTOP-001
  //   │
  //   └── Priya
  //        └── LAPTOP-002
  //
  // Optional:
  // ?status=ACTIVE
  // ?employeeId=...
  // ?assetUnitId=...
  // ?activeOnly=true
  // ============================================================

  @Get("assets/:assetId")
  findByAsset(
    @Param("assetId") assetId: string,
    @Query("status") status?: AssignmentStatus,
    @Query("employeeId") employeeId?: string,
    @Query("assetUnitId") assetUnitId?: string,
    @Query("activeOnly") activeOnly?: string,
  ) {
    return this.service.findByAsset(assetId, {
      status,
      employeeId,
      assetUnitId,
      activeOnly: activeOnly === "true",
    });
  }

  // ============================================================
  // ACTIVE ASSET ASSIGNMENTS
  //
  // GET /asset-assignments/assets/:assetId/active
  //
  // Shows who currently has the asset / its units.
  // ============================================================

  @Get("assets/:assetId/active")
  findActiveByAsset(@Param("assetId") assetId: string) {
    return this.service.findActiveByAsset(assetId);
  }

  // ============================================================
  // ASSET ASSIGNMENT SUMMARY
  //
  // GET /asset-assignments/assets/:assetId/summary
  //
  // Useful for Asset Detail dashboard/cards.
  //
  // Returns:
  // - totalAssignments
  // - activeAssignments
  // - returnedAssignments
  // - assignments
  // ============================================================

  @Get("assets/:assetId/summary")
  getAssetAssignmentSummary(@Param("assetId") assetId: string) {
    return this.service.getAssetAssignmentSummary(assetId);
  }

  // ============================================================
  // ASSET UNIT ASSIGNMENT HISTORY
  //
  // GET /asset-assignments/units/:assetUnitId
  //
  // Example:
  //
  // LAPTOP-001
  //   ├── Rahul
  //   └── Amit
  // ============================================================

  @Get("units/:assetUnitId")
  findByAssetUnit(@Param("assetUnitId") assetUnitId: string) {
    return this.service.findByAssetUnit(assetUnitId);
  }

  // ============================================================
  // ACTIVE ASSET UNIT ASSIGNMENT
  //
  // GET /asset-assignments/units/:assetUnitId/active
  //
  // Returns the employee currently holding this physical unit.
  // ============================================================

  @Get("units/:assetUnitId/active")
  findActiveByAssetUnit(@Param("assetUnitId") assetUnitId: string) {
    return this.service.findActiveByAssetUnit(assetUnitId);
  }

  // ============================================================
  // SINGLE ASSIGNMENT
  //
  // GET /asset-assignments/:id
  //
  // Keep this LAST so "employees", "assets", and "units" don't
  // get interpreted as assignment IDs.
  // ============================================================

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }
}
