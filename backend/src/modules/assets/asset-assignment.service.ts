import { Injectable, NotFoundException } from "@nestjs/common";
import { Op } from "sequelize";

import {
  AssetAssignment,
  AssignmentStatus,
} from "./models/asset-assignment.model";
import { Asset } from "./models/asset.model";
import { AssetUnit } from "./models/asset-unit.model";
import { Employee } from "@/modules/organisation/models/employees.model";

import { System } from "./models/system.model";
import { AssetCategory } from "./models/asset-category.model";

@Injectable()
export class AssetAssignmentService {
  // ============================================================
  // GET ALL ASSIGNMENTS
  // ============================================================

  async findAll(params?: {
    status?: AssignmentStatus;
    employeeId?: string;
    assetId?: string;
    assetUnitId?: string;
    systemId?: string;
    search?: string;
  }) {
    const where: Record<string, any> = {};

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.employeeId) {
      where.employeeId = params.employeeId;
    }

    if (params?.assetId) {
      where.assetId = params.assetId;
    }

    if (params?.assetUnitId) {
      where.assetUnitId = params.assetUnitId;
    }

    if (params?.systemId) {
      where.systemId = params.systemId;
    }

    const assignments = await AssetAssignment.findAll({
      where,
      include: [
        {
          model: Asset,
          as: "asset",
          include: [
            {
              model: AssetCategory,
              as: "category",
              required: false,
            },
          ],
          required: false,
        },
        {
          model: AssetUnit,
          as: "assetUnit",
          required: false,
        },
        {
          model: Employee,
          as: "employee",
          required: false,
        },
        {
          model: System,
          as: "system",
          required: false,
        },
      ],
      order: [["assignedAt", "DESC"]],
    });

    return assignments;
  }

  // ============================================================
  // GET SINGLE ASSIGNMENT
  // ============================================================

  async findOne(id: string) {
    const assignment = await AssetAssignment.findByPk(id, {
      include: [
        {
          model: Asset,
          as: "asset",
          include: [
            {
              model: AssetCategory,
              as: "category",
              required: false,
            },
          ],
          required: false,
        },
        {
          model: AssetUnit,
          as: "assetUnit",
          required: false,
        },
        {
          model: Employee,
          as: "employee",
          required: false,
        },
        {
          model: System,
          as: "system",
          required: false,
        },
      ],
    });

    if (!assignment) {
      throw new NotFoundException("Asset assignment not found.");
    }

    return assignment;
  }

  // ============================================================
  // EMPLOYEE ASSIGNMENTS
  //
  // All assets / units ever assigned to an employee.
  //
  // Example:
  //
  // Rahul
  //   Dell Laptop
  //     LAPTOP-001
  //     assignedAt
  //     returnedAt
  //
  //   Monitor
  //     MON-004
  // ============================================================

  async findByEmployee(
    employeeId: string,
    params?: {
      status?: AssignmentStatus;
      activeOnly?: boolean;
    },
  ) {
    const employee = await Employee.findByPk(employeeId);

    if (!employee) {
      throw new NotFoundException("Employee not found.");
    }

    const where: Record<string, any> = {
      employeeId,
    };

    if (params?.activeOnly) {
      where.status = AssignmentStatus.ACTIVE;
    } else if (params?.status) {
      where.status = params.status;
    }

    const assignments = await AssetAssignment.findAll({
      where,
      include: [
        {
          model: Asset,
          as: "asset",
          include: [
            {
              model: AssetCategory,
              as: "category",
              required: false,
            },
          ],
          required: false,
        },
        {
          model: AssetUnit,
          as: "assetUnit",
          required: false,
        },
        {
          model: Employee,
          as: "employee",
          required: false,
        },
        {
          model: System,
          as: "system",
          required: false,
        },
      ],
      order: [["assignedAt", "DESC"]],
    });

    return assignments;
  }

  // ============================================================
  // CURRENT EMPLOYEE ASSIGNMENTS
  //
  // Shortcut for:
  // GET /assignments/employees/:employeeId?activeOnly=true
  // ============================================================

  async findActiveByEmployee(employeeId: string) {
    return this.findByEmployee(employeeId, {
      activeOnly: true,
    });
  }

  // ============================================================
  // ASSET ASSIGNMENT HISTORY
  //
  // IMPORTANT:
  //
  // When user opens an Asset, this is the method the frontend
  // should call.
  //
  // It returns EVERY employee that has received this asset,
  // including individual AssetUnit information.
  //
  // Example:
  //
  // Dell Latitude 5420
  //
  // Employee: Rahul
  // Unit: LAPTOP-001
  // Assigned: Jan 10
  // Returned: Feb 20
  //
  // Employee: Amit
  // Unit: LAPTOP-001
  // Assigned: Feb 21
  // Returned: null
  //
  // Employee: Priya
  // Unit: LAPTOP-002
  // Assigned: Mar 01
  // Returned: null
  // ============================================================

  async findByAsset(
    assetId: string,
    params?: {
      status?: AssignmentStatus;
      employeeId?: string;
      assetUnitId?: string;
      activeOnly?: boolean;
    },
  ) {
    const asset = await Asset.findByPk(assetId, {
      include: [
        {
          model: AssetCategory,
          as: "category",
          required: false,
        },
      ],
    });

    if (!asset) {
      throw new NotFoundException("Asset not found.");
    }

    const where: Record<string, any> = {
      assetId,
    };

    if (params?.employeeId) {
      where.employeeId = params.employeeId;
    }

    if (params?.assetUnitId) {
      where.assetUnitId = params.assetUnitId;
    }

    if (params?.activeOnly) {
      where.status = AssignmentStatus.ACTIVE;
    } else if (params?.status) {
      where.status = params.status;
    }

    const assignments = await AssetAssignment.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "employee",
          required: false,
        },
        {
          model: AssetUnit,
          as: "assetUnit",
          required: false,
        },
        {
          model: System,
          as: "system",
          required: false,
        },
        {
          model: Asset,
          as: "asset",
          include: [
            {
              model: AssetCategory,
              as: "category",
              required: false,
            },
          ],
          required: false,
        },
      ],
      order: [["assignedAt", "DESC"]],
    });

    return {
      asset,
      assignments,
    };
  }

  // ============================================================
  // ASSET UNIT ASSIGNMENT HISTORY
  //
  // Useful when opening:
  //
  // Asset
  //   -> Unit LAPTOP-001
  //      -> Rahul
  //      -> Amit
  //      -> etc.
  // ============================================================

  async findByAssetUnit(assetUnitId: string) {
    const assetUnit = await AssetUnit.findByPk(assetUnitId, {
      include: [
        {
          model: Asset,
          as: "asset",
          include: [
            {
              model: AssetCategory,
              as: "category",
              required: false,
            },
          ],
          required: false,
        },
      ],
    });

    if (!assetUnit) {
      throw new NotFoundException("Asset unit not found.");
    }

    const assignments = await AssetAssignment.findAll({
      where: {
        assetUnitId,
      },
      include: [
        {
          model: Employee,
          as: "employee",
          required: false,
        },
        {
          model: Asset,
          as: "asset",
          include: [
            {
              model: AssetCategory,
              as: "category",
              required: false,
            },
          ],
          required: false,
        },
        {
          model: AssetUnit,
          as: "assetUnit",
          required: false,
        },
        {
          model: System,
          as: "system",
          required: false,
        },
      ],
      order: [["assignedAt", "DESC"]],
    });

    return {
      assetUnit,
      assignments,
    };
  }

  // ============================================================
  // ACTIVE ASSIGNMENT FOR AN ASSET UNIT
  //
  // Useful for determining:
  //
  // LAPTOP-001
  //   currently assigned to Rahul
  // ============================================================

  async findActiveByAssetUnit(assetUnitId: string) {
    return AssetAssignment.findOne({
      where: {
        assetUnitId,
        status: AssignmentStatus.ACTIVE,
      },
      include: [
        {
          model: Employee,
          as: "employee",
          required: false,
        },
        {
          model: Asset,
          as: "asset",
          required: false,
        },
        {
          model: AssetUnit,
          as: "assetUnit",
          required: false,
        },
        {
          model: System,
          as: "system",
          required: false,
        },
      ],
      order: [["assignedAt", "DESC"]],
    });
  }

  // ============================================================
  // ACTIVE ASSIGNMENTS FOR AN ASSET
  //
  // Returns all currently assigned units/employees for an asset.
  //
  // Example:
  //
  // Dell Latitude
  //
  // LAPTOP-001 -> Rahul
  // LAPTOP-002 -> Amit
  // LAPTOP-003 -> Priya
  // ============================================================

  async findActiveByAsset(assetId: string) {
    const asset = await Asset.findByPk(assetId);

    if (!asset) {
      throw new NotFoundException("Asset not found.");
    }

    const assignments = await AssetAssignment.findAll({
      where: {
        assetId,
        status: AssignmentStatus.ACTIVE,
      },
      include: [
        {
          model: Employee,
          as: "employee",
          required: false,
        },
        {
          model: AssetUnit,
          as: "assetUnit",
          required: false,
        },
        {
          model: System,
          as: "system",
          required: false,
        },
      ],
      order: [["assignedAt", "DESC"]],
    });

    return assignments;
  }

  // ============================================================
  // ASSIGNMENT SUMMARY FOR AN ASSET
  //
  // Useful for the Asset Detail page.
  //
  // Returns:
  //
  // {
  //   asset,
  //   totalAssignments,
  //   activeAssignments,
  //   returnedAssignments,
  //   assignments
  // }
  // ============================================================

  async getAssetAssignmentSummary(assetId: string) {
    const asset = await Asset.findByPk(assetId, {
      include: [
        {
          model: AssetCategory,
          as: "category",
          required: false,
        },
      ],
    });

    if (!asset) {
      throw new NotFoundException("Asset not found.");
    }

    const assignments = await AssetAssignment.findAll({
      where: {
        assetId,
      },
      include: [
        {
          model: Employee,
          as: "employee",
          required: false,
        },
        {
          model: AssetUnit,
          as: "assetUnit",
          required: false,
        },
        {
          model: System,
          as: "system",
          required: false,
        },
      ],
      order: [["assignedAt", "DESC"]],
    });

    const activeAssignments = assignments.filter(
      (assignment) => assignment.status === AssignmentStatus.ACTIVE,
    );

    const returnedAssignments = assignments.filter(
      (assignment) => assignment.status === AssignmentStatus.RETURNED,
    );

    return {
      asset,
      totalAssignments: assignments.length,
      activeAssignments: activeAssignments.length,
      returnedAssignments: returnedAssignments.length,
      assignments,
    };
  }
}
