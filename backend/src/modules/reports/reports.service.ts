import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, WhereOptions } from "sequelize";

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
      and.push({ organisationId: filters.organisationId });
    }

    if (filters.kind) {
      and.push({ kind: filters.kind as Asset["kind"] });
    }

    if (filters.categoryId) {
      and.push({ categoryId: filters.categoryId });
    }

    if (filters.locationId) {
      and.push({ locationId: filters.locationId });
    }

    if (filters.from || filters.to) {
      const range: Record<symbol, Date> = {};

      if (filters.from) {
        range[Op.gte] = new Date(filters.from);
      }

      if (filters.to) {
        range[Op.lte] = new Date(filters.to);
      }

      and.push({ purchaseDate: range } as WhereOptions<Asset>);
    }

    return and.length > 0 ? { [Op.and]: and } : {};
  }

  // ============================================================
  // 1. ASSET REPORT — full inventory snapshot with valuation
  // ============================================================

  async assetReport(filters: ReportFilters) {
    const where = this.buildWhere(filters);

    const assets = await this.assetModel.findAll({
      where,
      include: [
        { model: AssetCategory, as: "category" },
        { model: Vendor, as: "vendor" },
        { model: Location, as: "location" },
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
  // 2. INVENTORY REPORT — quantity / stock levels
  // ============================================================

  async inventoryReport(filters: ReportFilters) {
    const where = this.buildWhere(filters);

    const assets = await this.assetModel.findAll({
      where,
      include: [{ model: AssetCategory, as: "category" }],
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
  // 3. ASSIGNED REPORT — who has what, right now
  // ============================================================

  async assignedReport(filters: ReportFilters) {
    const where: WhereOptions<Asset> = {
      ...this.buildWhere(filters),
      status: AssetStatus.ASSIGNED,
    } as WhereOptions<Asset>;

    const assets = await this.assetModel.findAll({
      where,
      include: [
        {
          model: AssetAssignment,
          as: "assignments",
          where: { status: AssignmentStatus.ACTIVE },
          required: true,
          include: [{ model: Employee, as: "employee" }],
        },
        { model: AssetCategory, as: "category" },
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
  // 4. DAMAGED REPORT — damaged / in-repair / poor condition
  // ============================================================

  async damagedReport(filters: ReportFilters) {
    const baseWhere = this.buildWhere(filters);

    const statusOrConditionClause: WhereOptions<Asset> = {
      [Op.or]: [
        { status: AssetStatus.DAMAGED },
        { status: AssetStatus.REPAIR },
        { condition: AssetCondition.POOR },
      ],
    } as WhereOptions<Asset>;

    const where: WhereOptions<Asset> = {
      [Op.and]: [baseWhere, statusOrConditionClause],
    } as WhereOptions<Asset>;

    const assets = await this.assetModel.findAll({
      where,
      include: [
        { model: AssetCategory, as: "category" },
        { model: Location, as: "location" },
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
  // 5. REPORT BY STATUS — count breakdown across all statuses
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
    })) as unknown as { status: AssetStatus; count: string }[];

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
}
