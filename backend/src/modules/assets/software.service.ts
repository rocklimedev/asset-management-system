import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/sequelize";
import { col, fn, Op, Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { AssetKind } from "@/common/enums/assets.enums";
import { Asset } from "@/modules/assets/models/asset.model";
import { System } from "@/modules/assets/models/system.model";
import { SoftwareLicense } from "@/modules/assets/models/software-license.model";
import {
  SoftwareAssignmentStatus,
  SoftwareInstallationStatus,
  SoftwareLicenseAssignment,
} from "@/modules/assets/models/software-license-assignment.model";
import {
  Employee,
  EmployeeStatus,
} from "@/modules/organisation/models/employees.model";
import {
  SoftwareDetails,
  SoftwareSubscriptionType,
  SoftwareUsage,
} from "./models/software-details.model";
import {
  SoftwareAssignment,
  SoftwareAssignmentStatus as LegacyAssignmentStatus,
} from "./models/software-assignment.model";

// ============================================================
// DTOs
// ============================================================

export interface CreateSoftwareDto {
  assetId: string;
  parentSoftwareId?: string | null;
  usage?: SoftwareUsage;
  subscriptionType?: SoftwareSubscriptionType;
  warrantyApplicable?: boolean;
  version?: string | null;
  edition?: string | null;
  publisher?: string | null;
  notes?: string | null;
}

export type UpdateSoftwareDto = Partial<Omit<CreateSoftwareDto, "assetId">>;

export interface SoftwareListParams {
  search?: string;
  usage?: SoftwareUsage;
  subscriptionType?: SoftwareSubscriptionType;
  parentSoftwareId?: string;
  publisher?: string;
  /** true = only top-level software (no parent) */
  rootOnly?: boolean;
  sortBy?: "createdAt" | "name" | "publisher";
  sortDir?: "ASC" | "DESC";
  page?: number;
  limit?: number;
}

export interface CreateLicenseDto {
  assetId: string;
  vendor: string;
  licenseType: string;
  licenseReference?: string | null;
  totalSeats?: number;
  purchaseDate?: Date | string | null;
  expiryDate?: Date | string | null;
  renewalDate?: Date | string | null;
  cost?: number | null;
}

export type UpdateLicenseDto = Partial<Omit<CreateLicenseDto, "assetId">>;

export interface RenewLicenseDto {
  expiryDate: Date | string;
  renewalDate?: Date | string | null;
  cost?: number | null;
  totalSeats?: number;
}

export interface AssignSoftwareDto {
  softwareAssetId: string;
  systemId: string;
  softwareLicenseId?: string | null;
  /** Pick the best available license automatically when none is given */
  autoAllocateLicense?: boolean;
  version?: string | null;
  installationStatus?: SoftwareInstallationStatus;
  notes?: string | null;
}

export interface BulkAssignSoftwareDto {
  softwareAssetId: string;
  systemIds: string[];
  softwareLicenseId?: string | null;
  autoAllocateLicense?: boolean;
  version?: string | null;
  notes?: string | null;
}

export interface UpdateAssignmentDto {
  version?: string | null;
  installationStatus?: SoftwareInstallationStatus;
  /** null detaches the license, a string switches to another license */
  softwareLicenseId?: string | null;
  notes?: string | null;
}

export interface SoftwareTreeNode {
  softwareId: string;
  assetId: string;
  name: string | undefined;
  assetTag: string | null | undefined;
  version: string | null;
  edition: string | null;
  publisher: string | null;
  usage: SoftwareUsage;
  subscriptionType: SoftwareSubscriptionType;
  children: SoftwareTreeNode[];
}

// ============================================================
// CONSTANTS
// ============================================================

/** Subscription types that normally require a license record. */
const LICENSED_TYPES: SoftwareSubscriptionType[] = [
  SoftwareSubscriptionType.SUBSCRIPTION,
  SoftwareSubscriptionType.PERPETUAL,
  SoftwareSubscriptionType.COMPANY_LICENSE,
];

const MAX_HIERARCHY_DEPTH = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SoftwareService {
  constructor(
    @InjectConnection()
    private readonly sequelize: Sequelize,

    @InjectModel(Asset)
    private readonly assetModel: typeof Asset,

    @InjectModel(SoftwareDetails)
    private readonly softwareDetailsModel: typeof SoftwareDetails,

    @InjectModel(SoftwareLicenseAssignment)
    private readonly assignmentModel: typeof SoftwareLicenseAssignment,

    @InjectModel(SoftwareLicense)
    private readonly softwareLicenseModel: typeof SoftwareLicense,

    @InjectModel(System)
    private readonly systemModel: typeof System,

    @InjectModel(Employee)
    private readonly employeeModel: typeof Employee,

    @InjectModel(SoftwareAssignment)
    private readonly legacyAssignmentModel: typeof SoftwareAssignment,
  ) {}

  // ============================================================
  // INTERNAL HELPERS
  // ============================================================

  private async assertSoftwareAsset(
    assetId: string,
    t?: Transaction,
    label = "Software asset",
  ): Promise<Asset> {
    const asset = await this.assetModel.findByPk(assetId, { transaction: t });

    if (!asset) {
      throw new NotFoundException(`${label} not found`);
    }

    if (asset.kind !== AssetKind.SOFTWARE) {
      throw new BadRequestException(`${label} must be a software asset`);
    }

    return asset;
  }

  /** Returns [parent, grandparent, ...] of a software asset. */
  private async getAncestorIds(
    assetId: string,
    t?: Transaction,
  ): Promise<string[]> {
    const ids: string[] = [];
    const seen = new Set<string>([assetId]);
    let current = assetId;

    for (let i = 0; i < MAX_HIERARCHY_DEPTH; i++) {
      const details = await this.softwareDetailsModel.findOne({
        where: { assetId: current },
        attributes: ["parentSoftwareId"],
        transaction: t,
      });

      const parent = details?.parentSoftwareId;
      if (!parent || seen.has(parent)) break;

      ids.push(parent);
      seen.add(parent);
      current = parent;
    }

    return ids;
  }

  private async assertValidParent(
    assetId: string,
    parentAssetId: string,
    t?: Transaction,
  ) {
    if (parentAssetId === assetId) {
      throw new BadRequestException("Software cannot be its own parent");
    }

    await this.assertSoftwareAsset(parentAssetId, t, "Parent software asset");

    const ancestorsOfParent = await this.getAncestorIds(parentAssetId, t);
    if (ancestorsOfParent.includes(assetId)) {
      throw new BadRequestException(
        "Invalid parent: this would create a circular software hierarchy",
      );
    }
  }

  private assertLicenseDates(
    purchaseDate?: Date | string | null,
    expiryDate?: Date | string | null,
  ) {
    if (purchaseDate && expiryDate) {
      if (new Date(expiryDate) < new Date(purchaseDate)) {
        throw new BadRequestException(
          "License expiry date cannot be before the purchase date",
        );
      }
    }
  }

  private assertSeats(totalSeats?: number) {
    if (
      totalSeats !== undefined &&
      (!Number.isInteger(totalSeats) || totalSeats < 1)
    ) {
      throw new BadRequestException("Total seats must be a whole number >= 1");
    }
  }

  private isExpired(license: SoftwareLicense) {
    return Boolean(
      license.expiryDate && new Date(license.expiryDate) < new Date(),
    );
  }

  private async getUsedSeats(
    licenseId: string,
    t?: Transaction,
    excludeAssignmentId?: string,
  ) {
    return this.assignmentModel.count({
      where: {
        licenseId,
        assignmentStatus: SoftwareAssignmentStatus.ACTIVE,
        ...(excludeAssignmentId
          ? { id: { [Op.ne]: excludeAssignmentId } }
          : {}),
      },
      transaction: t,
    });
  }

  private async syncLicenseSeats(licenseId: string, t?: Transaction) {
    const used = await this.getUsedSeats(licenseId, t);

    await this.softwareLicenseModel.update(
      { assignedSeats: used },
      { where: { id: licenseId }, transaction: t },
    );

    return used;
  }

  private async validateLicenseForAssignment(
    license: SoftwareLicense,
    softwareAssetId: string,
    t: Transaction,
    excludeAssignmentId?: string,
  ) {
    const allowedAssetIds = [
      softwareAssetId,
      ...(await this.getAncestorIds(softwareAssetId, t)),
    ];

    if (!allowedAssetIds.includes(license.assetId)) {
      throw new BadRequestException(
        "License does not belong to this software or its parent suite",
      );
    }

    if (this.isExpired(license)) {
      throw new BadRequestException(
        "The selected software license has expired",
      );
    }

    const used = await this.getUsedSeats(license.id, t, excludeAssignmentId);

    if (used >= license.totalSeats) {
      throw new ConflictException("No available license seats");
    }
  }

  private async resolveLicense(
    dto: {
      softwareAssetId: string;
      softwareLicenseId?: string | null;
      autoAllocateLicense?: boolean;
    },
    t: Transaction,
  ): Promise<SoftwareLicense | null> {
    if (dto.softwareLicenseId) {
      const license = await this.softwareLicenseModel.findByPk(
        dto.softwareLicenseId,
        { transaction: t, lock: t.LOCK.UPDATE },
      );

      if (!license) {
        throw new NotFoundException("Software license not found");
      }

      await this.validateLicenseForAssignment(license, dto.softwareAssetId, t);
      return license;
    }

    if (dto.autoAllocateLicense) {
      const assetIds = [
        dto.softwareAssetId,
        ...(await this.getAncestorIds(dto.softwareAssetId, t)),
      ];

      const candidates = await this.softwareLicenseModel.findAll({
        where: {
          assetId: { [Op.in]: assetIds },
          [Op.or]: [
            { expiryDate: null },
            { expiryDate: { [Op.gt]: new Date() } },
          ],
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      candidates.sort((a, b) => {
        const ax = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
        const bx = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
        return ax - bx;
      });

      for (const candidate of candidates) {
        const used = await this.getUsedSeats(candidate.id, t);
        if (used < candidate.totalSeats) return candidate;
      }

      throw new ConflictException(
        "No license with free seats is available for this software",
      );
    }

    return null;
  }

  private paginate(page?: number, limit?: number) {
    const p = Math.max(Number(page ?? 1), 1);
    const l = Math.min(Math.max(Number(limit ?? 50), 1), 200);
    return { page: p, limit: l, offset: (p - 1) * l };
  }

  /**
   * Modern assignment includes.
   * Aliases must match SoftwareLicenseAssignment property names:
   *   asset, system, license
   * and System → employee.
   */
  private get assignmentIncludes() {
    return [
      { model: Asset, as: "asset" },
      {
        model: System,
        as: "system",
        include: [
          {
            model: Employee,
            as: "employee",
            required: false,
          },
        ],
      },
      { model: SoftwareLicense, as: "license", required: false },
    ];
  }

  /** Legacy assignment includes (software_assignments table). */
  private get legacyAssignmentIncludes() {
    return [
      { model: Asset, as: "softwareAsset" },
      {
        model: System,
        as: "system",
        include: [{ model: Employee, as: "employee", required: false }],
      },
    ];
  }

  // ============================================================
  // SOFTWARE CATALOG
  // ============================================================

  async create(dto: CreateSoftwareDto) {
    const asset = await this.assertSoftwareAsset(
      dto.assetId,
      undefined,
      "Asset",
    );

    const existing = await this.softwareDetailsModel.findOne({
      where: { assetId: dto.assetId },
    });

    if (existing) {
      throw new ConflictException(
        "Software details already exist for this asset",
      );
    }

    if (dto.parentSoftwareId) {
      await this.assertValidParent(dto.assetId, dto.parentSoftwareId);
    }

    const software = await this.softwareDetailsModel.create({
      assetId: dto.assetId,
      parentSoftwareId: dto.parentSoftwareId ?? null,
      usage: dto.usage ?? SoftwareUsage.UNKNOWN,
      subscriptionType:
        dto.subscriptionType ?? SoftwareSubscriptionType.UNKNOWN,
      warrantyApplicable: dto.warrantyApplicable ?? false,
      version: dto.version ?? null,
      edition: dto.edition ?? null,
      publisher: dto.publisher ?? asset.manufacturer ?? null,
      notes: dto.notes ?? null,
    });

    return this.findOne(software.id);
  }

  async findAll(params: SoftwareListParams = {}) {
    const { page, limit, offset } = this.paginate(params.page, params.limit);

    const where: any = {};

    if (params.usage) where.usage = params.usage;
    if (params.subscriptionType)
      where.subscriptionType = params.subscriptionType;
    if (params.publisher)
      where.publisher = { [Op.like]: `%${params.publisher}%` };

    if (params.parentSoftwareId) {
      where.parentSoftwareId = params.parentSoftwareId;
    } else if (params.rootOnly) {
      where.parentSoftwareId = null;
    }

    const search = params.search?.trim();
    if (search) {
      const like = `%${search}%`;
      where[Op.or] = [
        { "$asset.name$": { [Op.like]: like } },
        { "$asset.assetTag$": { [Op.like]: like } },
        { publisher: { [Op.like]: like } },
      ];
    }

    const dir = params.sortDir === "ASC" ? "ASC" : "DESC";
    const order: any[] =
      params.sortBy === "name"
        ? [[{ model: Asset, as: "asset" }, "name", dir]]
        : params.sortBy === "publisher"
          ? [["publisher", dir]]
          : [["createdAt", dir]];

    const { rows, count } = await this.softwareDetailsModel.findAndCountAll({
      where,
      include: [
        {
          model: Asset,
          as: "asset",
          required: true,
          where: { kind: AssetKind.SOFTWARE },
        },
        { model: Asset, as: "parentSoftware", required: false },
      ],
      order,
      limit,
      offset,
      distinct: true,
    });

    const assetIds = rows.map((r) => r.assetId);
    const counts = assetIds.length
      ? ((await this.assignmentModel.findAll({
          attributes: [
            [col("asset_id"), "assetId"],
            [fn("COUNT", col("id")), "count"],
          ],
          where: {
            assetId: { [Op.in]: assetIds },
            assignmentStatus: SoftwareAssignmentStatus.ACTIVE,
          },
          group: ["asset_id"],
          raw: true,
        })) as unknown as { assetId: string; count: string }[])
      : [];

    const countMap = new Map(counts.map((c) => [c.assetId, Number(c.count)]));

    return {
      data: rows.map((r) => ({
        ...r.toJSON(),
        activeInstallations: countMap.get(r.assetId) ?? 0,
      })),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async findOne(id: string) {
    const software = await this.softwareDetailsModel.findByPk(id, {
      include: [
        {
          model: Asset,
          as: "asset",
          include: [
            { model: SoftwareLicense, as: "licenses", required: false },
          ],
        },
        { model: Asset, as: "parentSoftware", required: false },
      ],
    });

    if (!software) {
      throw new NotFoundException("Software not found");
    }

    return software;
  }

  async findByAssetId(assetId: string) {
    const software = await this.softwareDetailsModel.findOne({
      where: { assetId },
      include: [
        {
          model: Asset,
          as: "asset",
          include: [
            { model: SoftwareLicense, as: "licenses", required: false },
          ],
        },
        { model: Asset, as: "parentSoftware", required: false },
      ],
    });

    if (!software) {
      throw new NotFoundException("Software details not found for this asset");
    }

    return software;
  }

  async update(id: string, dto: UpdateSoftwareDto) {
    const software = await this.softwareDetailsModel.findByPk(id);

    if (!software) {
      throw new NotFoundException("Software not found");
    }

    if (dto.parentSoftwareId) {
      await this.assertValidParent(software.assetId, dto.parentSoftwareId);
    }

    const patch: Partial<SoftwareDetails> = {};
    if (dto.parentSoftwareId !== undefined)
      patch.parentSoftwareId = dto.parentSoftwareId;
    if (dto.usage !== undefined) patch.usage = dto.usage;
    if (dto.subscriptionType !== undefined)
      patch.subscriptionType = dto.subscriptionType;
    if (dto.warrantyApplicable !== undefined)
      patch.warrantyApplicable = dto.warrantyApplicable;
    if (dto.version !== undefined) patch.version = dto.version;
    if (dto.edition !== undefined) patch.edition = dto.edition;
    if (dto.publisher !== undefined) patch.publisher = dto.publisher;
    if (dto.notes !== undefined) patch.notes = dto.notes;

    await software.update(patch);

    return this.findOne(id);
  }

  async bulkUpdateUsage(ids: string[], usage: SoftwareUsage) {
    if (!ids?.length) {
      throw new BadRequestException("No software selected");
    }

    const [affected] = await this.softwareDetailsModel.update(
      { usage },
      { where: { id: { [Op.in]: ids } } },
    );

    return { success: true, affected };
  }

  async remove(id: string) {
    return this.sequelize.transaction(async (t) => {
      const software = await this.softwareDetailsModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!software) {
        throw new NotFoundException("Software not found");
      }

      const activeModern = await this.assignmentModel.count({
        where: {
          assetId: software.assetId,
          assignmentStatus: SoftwareAssignmentStatus.ACTIVE,
        },
        transaction: t,
      });

      const activeLegacy = await this.legacyAssignmentModel.count({
        where: {
          softwareAssetId: software.assetId,
          status: LegacyAssignmentStatus.ACTIVE,
        },
        transaction: t,
      });

      if (activeModern > 0 || activeLegacy > 0) {
        throw new ConflictException(
          "Software cannot be deleted while it has active system assignments",
        );
      }

      const children = await this.softwareDetailsModel.count({
        where: { parentSoftwareId: software.assetId },
        transaction: t,
      });

      if (children > 0) {
        throw new ConflictException(
          "Software cannot be deleted while other software is nested under it. Re-parent or delete the child software first",
        );
      }

      await software.destroy({ transaction: t });

      return { success: true, message: "Software deleted successfully" };
    });
  }

  // ============================================================
  // HIERARCHY
  // ============================================================

  async getChildren(assetId: string) {
    await this.assertSoftwareAsset(assetId);

    return this.softwareDetailsModel.findAll({
      where: { parentSoftwareId: assetId },
      include: [{ model: Asset, as: "asset", required: true }],
      order: [[{ model: Asset, as: "asset" }, "name", "ASC"]],
    });
  }

  async getHierarchy(rootAssetId?: string) {
    const all = await this.softwareDetailsModel.findAll({
      include: [
        {
          model: Asset,
          as: "asset",
          required: true,
          attributes: ["id", "name", "assetTag"],
        },
      ],
    });

    const nodes = new Map<string, SoftwareTreeNode>();

    for (const d of all) {
      nodes.set(d.assetId, {
        softwareId: d.id,
        assetId: d.assetId,
        name: d.asset?.name,
        assetTag: d.asset?.assetTag,
        version: d.version,
        edition: d.edition,
        publisher: d.publisher,
        usage: d.usage,
        subscriptionType: d.subscriptionType,
        children: [],
      });
    }

    const roots: SoftwareTreeNode[] = [];

    for (const d of all) {
      const node = nodes.get(d.assetId)!;
      const parent = d.parentSoftwareId
        ? nodes.get(d.parentSoftwareId)
        : undefined;

      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    if (rootAssetId) {
      const node = nodes.get(rootAssetId);
      if (!node) throw new NotFoundException("Software not found");
      return node;
    }

    return roots;
  }

  // ============================================================
  // LICENSES
  // ============================================================

  async createLicense(dto: CreateLicenseDto) {
    await this.assertSoftwareAsset(dto.assetId, undefined, "Asset");

    if (!dto.vendor?.trim() || !dto.licenseType?.trim()) {
      throw new BadRequestException("Vendor and license type are required");
    }

    this.assertSeats(dto.totalSeats);
    this.assertLicenseDates(dto.purchaseDate, dto.expiryDate);

    const license = await this.softwareLicenseModel.create({
      assetId: dto.assetId,
      vendor: dto.vendor.trim(),
      licenseType: dto.licenseType.trim(),
      licenseReference: dto.licenseReference ?? null,
      totalSeats: dto.totalSeats ?? 1,
      assignedSeats: 0,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : null,
      cost: dto.cost ?? null,
    });

    return this.getLicense(license.id);
  }

  async getLicense(id: string) {
    const license = await this.softwareLicenseModel.findByPk(id, {
      include: [{ model: Asset, as: "asset" }],
    });

    if (!license) {
      throw new NotFoundException("Software license not found");
    }

    return license;
  }

  async findLicenses(params?: {
    assetId?: string;
    expired?: boolean;
    expiringInDays?: number;
    hasFreeSeats?: boolean;
  }) {
    const where: any = {};

    if (params?.assetId) where.assetId = params.assetId;

    const now = new Date();

    if (params?.expired) {
      where.expiryDate = { [Op.lt]: now };
    } else if (params?.expiringInDays !== undefined) {
      where.expiryDate = {
        [Op.between]: [
          now,
          new Date(now.getTime() + params.expiringInDays * DAY_MS),
        ],
      };
    }

    const licenses = await this.softwareLicenseModel.findAll({
      where,
      include: [{ model: Asset, as: "asset" }],
      order: [["expiryDate", "ASC"]],
    });

    if (params?.hasFreeSeats) {
      return licenses.filter((l) => l.assignedSeats < l.totalSeats);
    }

    return licenses;
  }

  async updateLicense(id: string, dto: UpdateLicenseDto) {
    await this.sequelize.transaction(async (t) => {
      const license = await this.softwareLicenseModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!license) {
        throw new NotFoundException("Software license not found");
      }

      this.assertSeats(dto.totalSeats);
      this.assertLicenseDates(
        dto.purchaseDate ?? license.purchaseDate,
        dto.expiryDate ?? license.expiryDate,
      );

      if (dto.totalSeats !== undefined) {
        const used = await this.getUsedSeats(id, t);
        if (dto.totalSeats < used) {
          throw new ConflictException(
            `Cannot reduce seats below the ${used} seat(s) currently in use`,
          );
        }
      }

      const patch: any = {};
      if (dto.vendor !== undefined) patch.vendor = dto.vendor;
      if (dto.licenseType !== undefined) patch.licenseType = dto.licenseType;
      if (dto.licenseReference !== undefined)
        patch.licenseReference = dto.licenseReference;
      if (dto.totalSeats !== undefined) patch.totalSeats = dto.totalSeats;
      if (dto.cost !== undefined) patch.cost = dto.cost;
      if (dto.purchaseDate !== undefined)
        patch.purchaseDate = dto.purchaseDate
          ? new Date(dto.purchaseDate)
          : null;
      if (dto.expiryDate !== undefined)
        patch.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
      if (dto.renewalDate !== undefined)
        patch.renewalDate = dto.renewalDate ? new Date(dto.renewalDate) : null;

      await license.update(patch, { transaction: t });
    });

    return this.getLicense(id);
  }

  async renewLicense(id: string, dto: RenewLicenseDto) {
    const license = await this.softwareLicenseModel.findByPk(id);

    if (!license) {
      throw new NotFoundException("Software license not found");
    }

    if (
      license.expiryDate &&
      new Date(dto.expiryDate) <= new Date(license.expiryDate)
    ) {
      throw new BadRequestException(
        "New expiry date must be later than the current expiry date",
      );
    }

    return this.updateLicense(id, {
      expiryDate: dto.expiryDate,
      renewalDate: dto.renewalDate,
      cost: dto.cost,
      totalSeats: dto.totalSeats,
    });
  }

  async removeLicense(id: string) {
    return this.sequelize.transaction(async (t) => {
      const license = await this.softwareLicenseModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!license) {
        throw new NotFoundException("Software license not found");
      }

      const active = await this.getUsedSeats(id, t);

      if (active > 0) {
        throw new ConflictException(
          "License cannot be deleted while it has active assignments",
        );
      }

      await this.assignmentModel.update(
        { licenseId: null },
        { where: { licenseId: id }, transaction: t },
      );

      await license.destroy({ transaction: t });

      return { success: true, message: "License deleted successfully" };
    });
  }

  async getLicenseUsage(licenseId: string) {
    const license = await this.softwareLicenseModel.findByPk(licenseId, {
      include: [{ model: Asset, as: "asset" }],
    });

    if (!license) {
      throw new NotFoundException("Software license not found");
    }

    const assignments = await this.assignmentModel.findAll({
      where: {
        licenseId,
        assignmentStatus: SoftwareAssignmentStatus.ACTIVE,
      },
      include: [
        {
          model: System,
          as: "system",
          include: [{ model: Employee, as: "employee", required: false }],
        },
      ],
      order: [["installedAt", "DESC"]],
    });

    const assignedSeats = assignments.length;
    const availableSeats = Math.max(license.totalSeats - assignedSeats, 0);
    const daysToExpiry = license.expiryDate
      ? Math.ceil(
          (new Date(license.expiryDate).getTime() - Date.now()) / DAY_MS,
        )
      : null;

    return {
      license,
      totalSeats: license.totalSeats,
      assignedSeats,
      availableSeats,
      overAllocatedBy: Math.max(assignedSeats - license.totalSeats, 0),
      utilisationPercent: Math.round(
        (assignedSeats / license.totalSeats) * 100,
      ),
      isExpired: this.isExpired(license),
      daysToExpiry,
      assignments,
    };
  }

  async recalculateSeats(licenseId?: string) {
    const licenses = licenseId
      ? await this.softwareLicenseModel.findAll({ where: { id: licenseId } })
      : await this.softwareLicenseModel.findAll();

    if (licenseId && !licenses.length) {
      throw new NotFoundException("Software license not found");
    }

    const changes: { licenseId: string; before: number; after: number }[] = [];

    for (const license of licenses) {
      const after = await this.syncLicenseSeats(license.id);
      if (after !== license.assignedSeats) {
        changes.push({
          licenseId: license.id,
          before: license.assignedSeats,
          after,
        });
      }
    }

    return { checked: licenses.length, corrected: changes.length, changes };
  }

  // ============================================================
  // ASSIGNMENT: Software -> System -> Employee
  // ============================================================

  private async assignInTx(
    dto: AssignSoftwareDto,
    t: Transaction,
  ): Promise<string> {
    await this.assertSoftwareAsset(dto.softwareAssetId, t);

    const details = await this.softwareDetailsModel.findOne({
      where: { assetId: dto.softwareAssetId },
      transaction: t,
    });

    if (!details) {
      throw new BadRequestException(
        "Software details have not been configured for this asset",
      );
    }

    if (details.usage === SoftwareUsage.BLOCKED) {
      throw new BadRequestException(
        "This software is blocked and cannot be assigned",
      );
    }

    const system = await this.systemModel.findByPk(dto.systemId, {
      transaction: t,
    });

    if (!system) {
      throw new NotFoundException("System not found");
    }

    if (!system.employeeId) {
      throw new BadRequestException(
        "Software cannot be assigned to a system that is not assigned to an employee",
      );
    }

    // Duplicate check on both tables
    const dupModern = await this.assignmentModel.findOne({
      where: {
        assetId: dto.softwareAssetId,
        systemId: dto.systemId,
        assignmentStatus: SoftwareAssignmentStatus.ACTIVE,
      },
      transaction: t,
    });
    if (dupModern) {
      throw new ConflictException(
        "This software is already assigned to this system",
      );
    }

    const dupLegacy = await this.legacyAssignmentModel.findOne({
      where: {
        softwareAssetId: dto.softwareAssetId,
        systemId: dto.systemId,
        status: LegacyAssignmentStatus.ACTIVE,
      },
      transaction: t,
    });
    if (dupLegacy) {
      throw new ConflictException(
        "This software is already assigned to this system",
      );
    }

    const license = await this.resolveLicense(dto, t);

    // Write to modern table (primary)
    const assignment = await this.assignmentModel.create(
      {
        assetId: dto.softwareAssetId,
        systemId: dto.systemId,
        licenseId: license?.id ?? null,
        installationStatus:
          dto.installationStatus ?? SoftwareInstallationStatus.INSTALLED,
        assignmentStatus: SoftwareAssignmentStatus.ACTIVE,
        version: dto.version ?? details.version ?? null,
        installedAt: new Date(),
        notes: dto.notes ?? null,
      },
      { transaction: t },
    );

    if (license) {
      await this.syncLicenseSeats(license.id, t);
    }

    return assignment.id;
  }

  async assign(dto: AssignSoftwareDto) {
    const id = await this.sequelize.transaction((t) => this.assignInTx(dto, t));
    return this.getAssignment(id);
  }

  async bulkAssign(dto: BulkAssignSoftwareDto) {
    if (!dto.systemIds?.length) {
      throw new BadRequestException("No systems selected");
    }

    const succeeded: string[] = [];
    const failed: { systemId: string; reason: string }[] = [];

    for (const systemId of [...new Set(dto.systemIds)]) {
      try {
        const id = await this.sequelize.transaction((t) =>
          this.assignInTx(
            {
              softwareAssetId: dto.softwareAssetId,
              systemId,
              softwareLicenseId: dto.softwareLicenseId,
              autoAllocateLicense: dto.autoAllocateLicense,
              version: dto.version,
              notes: dto.notes,
            },
            t,
          ),
        );
        succeeded.push(id);
      } catch (e: any) {
        failed.push({ systemId, reason: e?.message ?? "Unknown error" });
      }
    }

    return {
      requested: new Set(dto.systemIds).size,
      succeeded: succeeded.length,
      failed: failed.length,
      assignmentIds: succeeded,
      errors: failed,
    };
  }

  async assignWithChildren(dto: AssignSoftwareDto) {
    const ids = await this.sequelize.transaction(async (t) => {
      const children = await this.softwareDetailsModel.findAll({
        where: { parentSoftwareId: dto.softwareAssetId },
        transaction: t,
      });

      const created: string[] = [];
      created.push(await this.assignInTx(dto, t));

      for (const child of children) {
        const existsModern = await this.assignmentModel.count({
          where: {
            assetId: child.assetId,
            systemId: dto.systemId,
            assignmentStatus: SoftwareAssignmentStatus.ACTIVE,
          },
          transaction: t,
        });
        const existsLegacy = await this.legacyAssignmentModel.count({
          where: {
            softwareAssetId: child.assetId,
            systemId: dto.systemId,
            status: LegacyAssignmentStatus.ACTIVE,
          },
          transaction: t,
        });

        if (
          existsModern ||
          existsLegacy ||
          child.usage === SoftwareUsage.BLOCKED
        ) {
          continue;
        }

        created.push(
          await this.assignInTx(
            {
              softwareAssetId: child.assetId,
              systemId: dto.systemId,
              softwareLicenseId: dto.softwareLicenseId,
              autoAllocateLicense: dto.autoAllocateLicense,
            },
            t,
          ),
        );
      }

      return created;
    });

    return Promise.all(ids.map((id) => this.getAssignment(id)));
  }

  private async unassignInTx(
    assignment: SoftwareLicenseAssignment,
    notes: string | undefined,
    t: Transaction,
  ) {
    if (assignment.assignmentStatus !== SoftwareAssignmentStatus.ACTIVE) {
      throw new ConflictException("Software assignment is already inactive");
    }

    await assignment.update(
      {
        assignmentStatus: SoftwareAssignmentStatus.REMOVED,
        installationStatus: SoftwareInstallationStatus.UNINSTALLED,
        removedAt: new Date(),
        notes: notes !== undefined ? notes : assignment.notes,
      },
      { transaction: t },
    );

    if (assignment.licenseId) {
      await this.syncLicenseSeats(assignment.licenseId, t);
    }
  }

  private async unassignLegacyInTx(
    assignment: SoftwareAssignment,
    notes: string | undefined,
    t: Transaction,
  ) {
    if (assignment.status !== LegacyAssignmentStatus.ACTIVE) {
      throw new ConflictException("Software assignment is already inactive");
    }

    await assignment.update(
      {
        status: LegacyAssignmentStatus.RETURNED,
        endedAt: new Date(),
        notes: notes !== undefined ? notes : assignment.notes,
      },
      { transaction: t },
    );
  }

  /**
   * Unassign by id — works for both modern and legacy tables.
   * POST /software/assignments/:id/remove
   */
  async unassign(assignmentId: string, notes?: string) {
    // Modern table first
    const modern = await this.assignmentModel.findByPk(assignmentId);
    if (modern) {
      await this.sequelize.transaction(async (t) => {
        const locked = await this.assignmentModel.findByPk(assignmentId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!locked) {
          throw new NotFoundException("Software assignment not found");
        }
        await this.unassignInTx(locked, notes, t);
      });
      return this.getAssignment(assignmentId);
    }

    // Legacy table
    const legacy = await this.legacyAssignmentModel.findByPk(assignmentId);
    if (!legacy) {
      throw new NotFoundException("Software assignment not found");
    }

    await this.sequelize.transaction(async (t) => {
      const locked = await this.legacyAssignmentModel.findByPk(assignmentId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!locked) {
        throw new NotFoundException("Software assignment not found");
      }
      await this.unassignLegacyInTx(locked, notes, t);
    });

    return this.legacyAssignmentModel.findByPk(assignmentId, {
      include: this.legacyAssignmentIncludes,
    });
  }

  /**
   * Remove every active assignment from a system (both tables).
   */
  async unassignAllFromSystem(systemId: string, notes?: string) {
    const system = await this.systemModel.findByPk(systemId);

    if (!system) {
      throw new NotFoundException("System not found");
    }

    const removed = await this.sequelize.transaction(async (t) => {
      const activeModern = await this.assignmentModel.findAll({
        where: {
          systemId,
          assignmentStatus: SoftwareAssignmentStatus.ACTIVE,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      for (const a of activeModern) {
        await this.unassignInTx(a, notes, t);
      }

      const activeLegacy = await this.legacyAssignmentModel.findAll({
        where: { systemId, status: LegacyAssignmentStatus.ACTIVE },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      for (const a of activeLegacy) {
        await this.unassignLegacyInTx(a, notes, t);
      }

      return activeModern.length + activeLegacy.length;
    });

    return { success: true, removed };
  }

  /**
   * Transfer — supports both modern and legacy rows.
   */
  async transfer(assignmentId: string, toSystemId: string, notes?: string) {
    const modern = await this.assignmentModel.findByPk(assignmentId);

    if (modern) {
      const newId = await this.sequelize.transaction(async (t) => {
        const current = await this.assignmentModel.findByPk(assignmentId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!current) {
          throw new NotFoundException("Software assignment not found");
        }

        if (current.systemId === toSystemId) {
          throw new BadRequestException("Software is already on this system");
        }

        const { assetId, licenseId, version } = current;

        await this.unassignInTx(
          current,
          notes ?? `Transferred to system ${toSystemId}`,
          t,
        );

        return this.assignInTx(
          {
            softwareAssetId: assetId,
            systemId: toSystemId,
            softwareLicenseId: licenseId,
            version,
            notes,
          },
          t,
        );
      });

      return this.getAssignment(newId);
    }

    // Legacy path
    const legacy = await this.legacyAssignmentModel.findByPk(assignmentId);
    if (!legacy) {
      throw new NotFoundException("Software assignment not found");
    }

    if (legacy.systemId === toSystemId) {
      throw new BadRequestException("Software is already on this system");
    }

    if (legacy.status !== LegacyAssignmentStatus.ACTIVE) {
      throw new ConflictException("Inactive assignments cannot be transferred");
    }

    const toSystem = await this.systemModel.findByPk(toSystemId);
    if (!toSystem) {
      throw new NotFoundException("System not found");
    }

    if (!toSystem.employeeId) {
      throw new BadRequestException(
        "Software cannot be assigned to a system that is not assigned to an employee",
      );
    }

    await this.sequelize.transaction(async (t) => {
      await this.unassignLegacyInTx(
        legacy,
        notes ?? `Transferred to system ${toSystemId}`,
        t,
      );

      await this.legacyAssignmentModel.create(
        {
          softwareAssetId: legacy.softwareAssetId,
          systemId: toSystemId,
          status: LegacyAssignmentStatus.ACTIVE,
          assignedAt: new Date(),
          notes: notes ?? null,
        },
        { transaction: t },
      );
    });

    return this.legacyAssignmentModel.findOne({
      where: {
        softwareAssetId: legacy.softwareAssetId,
        systemId: toSystemId,
        status: LegacyAssignmentStatus.ACTIVE,
      },
      include: this.legacyAssignmentIncludes,
      order: [["assignedAt", "DESC"]],
    });
  }

  async updateAssignment(assignmentId: string, dto: UpdateAssignmentDto) {
    // Modern path
    const modern = await this.assignmentModel.findByPk(assignmentId);
    if (!modern) {
      // Notes-only update on legacy
      const legacy = await this.legacyAssignmentModel.findByPk(assignmentId);
      if (!legacy) {
        throw new NotFoundException("Software assignment not found");
      }
      if (legacy.status !== LegacyAssignmentStatus.ACTIVE) {
        throw new ConflictException("Inactive assignments cannot be modified");
      }
      if (dto.notes !== undefined) {
        await legacy.update({ notes: dto.notes });
      }
      return this.legacyAssignmentModel.findByPk(assignmentId, {
        include: this.legacyAssignmentIncludes,
      });
    }

    await this.sequelize.transaction(async (t) => {
      const assignment = await this.assignmentModel.findByPk(assignmentId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!assignment) {
        throw new NotFoundException("Software assignment not found");
      }

      if (assignment.assignmentStatus !== SoftwareAssignmentStatus.ACTIVE) {
        throw new ConflictException("Inactive assignments cannot be modified");
      }

      const previousLicenseId = assignment.licenseId;
      const patch: any = {};

      if (dto.version !== undefined) patch.version = dto.version;
      if (dto.installationStatus !== undefined)
        patch.installationStatus = dto.installationStatus;
      if (dto.notes !== undefined) patch.notes = dto.notes;

      if (dto.softwareLicenseId !== undefined) {
        if (dto.softwareLicenseId === null) {
          patch.licenseId = null;
        } else if (dto.softwareLicenseId !== previousLicenseId) {
          const license = await this.softwareLicenseModel.findByPk(
            dto.softwareLicenseId,
            { transaction: t, lock: t.LOCK.UPDATE },
          );

          if (!license) {
            throw new NotFoundException("Software license not found");
          }

          await this.validateLicenseForAssignment(
            license,
            assignment.assetId,
            t,
            assignment.id,
          );

          patch.licenseId = license.id;
        }
      }

      await assignment.update(patch, { transaction: t });

      const touched = new Set<string>();
      if (previousLicenseId) touched.add(previousLicenseId);
      if (patch.licenseId) touched.add(patch.licenseId);

      for (const id of touched) {
        await this.syncLicenseSeats(id, t);
      }
    });

    return this.getAssignment(assignmentId);
  }

  // ============================================================
  // ASSIGNMENT QUERIES
  // ============================================================

  /**
   * Get one assignment by id (modern first, then legacy).
   */
  async getAssignment(id: string) {
    const modern = await this.assignmentModel.findByPk(id, {
      include: this.assignmentIncludes,
    });
    if (modern) return modern;

    const legacy = await this.legacyAssignmentModel.findByPk(id, {
      include: this.legacyAssignmentIncludes,
    });
    if (!legacy) {
      throw new NotFoundException("Software assignment not found");
    }
    return legacy;
  }

  /**
   * List modern assignments (software_license_assignments).
   * For system-scoped lists prefer getSystemSoftware which merges both tables.
   */
  async getAssignments(params?: {
    softwareAssetId?: string;
    systemId?: string;
    employeeId?: string;
    licenseId?: string;
    status?: SoftwareAssignmentStatus;
    installationStatus?: SoftwareInstallationStatus;
  }) {
    const where: any = {};

    if (params?.softwareAssetId) where.assetId = params.softwareAssetId;
    if (params?.systemId) where.systemId = params.systemId;
    if (params?.licenseId) where.licenseId = params.licenseId;
    if (params?.status) where.assignmentStatus = params.status;
    if (params?.installationStatus)
      where.installationStatus = params.installationStatus;

    return this.assignmentModel.findAll({
      where,
      include: [
        { model: Asset, as: "asset" },
        {
          model: System,
          as: "system",
          required: Boolean(params?.employeeId),
          where: params?.employeeId
            ? { employeeId: params.employeeId }
            : undefined,
          include: [{ model: Employee, as: "employee", required: false }],
        },
        { model: SoftwareLicense, as: "license", required: false },
      ],
      order: [["installedAt", "DESC"]],
    });
  }

  /**
   * Active software on a system — merges modern + legacy rows.
   * GET /software/systems/:systemId
   */
  async getSystemSoftware(systemId: string) {
    const system = await this.systemModel.findByPk(systemId);
    if (!system) {
      throw new NotFoundException("System not found");
    }

    const [modern, legacy] = await Promise.all([
      this.assignmentModel.findAll({
        where: {
          systemId,
          assignmentStatus: SoftwareAssignmentStatus.ACTIVE,
        },
        include: this.assignmentIncludes,
        order: [["installedAt", "DESC"]],
      }),
      this.legacyAssignmentModel.findAll({
        where: {
          systemId,
          status: LegacyAssignmentStatus.ACTIVE,
        },
        include: this.legacyAssignmentIncludes,
        order: [["assignedAt", "DESC"]],
      }),
    ]);

    return [
      ...modern.map((m) => m.toJSON()),
      ...legacy.map((l) => {
        const j = l.toJSON() as any;
        return {
          id: j.id,
          assetId: j.softwareAssetId,
          systemId: j.systemId,
          assignmentStatus:
            j.status === LegacyAssignmentStatus.ACTIVE ? "ACTIVE" : "REMOVED",
          installationStatus: "INSTALLED",
          installedAt: j.assignedAt,
          removedAt: j.endedAt,
          notes: j.notes,
          licenseId: null,
          version: null,
          asset: j.softwareAsset ?? null,
          softwareAsset: j.softwareAsset ?? null,
          system: j.system ?? null,
          _source: "legacy",
        };
      }),
    ];
  }

  async getEmployeeSoftware(employeeId: string) {
    const employee = await this.employeeModel.findByPk(employeeId);

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const systems = await this.systemModel.findAll({
      where: { employeeId },
      attributes: ["id"],
    });
    const systemIds = systems.map((s) => s.id);
    if (!systemIds.length) return [];

    const results: any[] = [];
    for (const sid of systemIds) {
      const rows = await this.getSystemSoftware(sid);
      results.push(...rows);
    }
    return results;
  }

  async getSoftwareUsers(softwareAssetId: string) {
    await this.assertSoftwareAsset(softwareAssetId);

    const modern = await this.getAssignments({
      softwareAssetId,
      status: SoftwareAssignmentStatus.ACTIVE,
    });

    const legacy = await this.legacyAssignmentModel.findAll({
      where: {
        softwareAssetId,
        status: LegacyAssignmentStatus.ACTIVE,
      },
      include: this.legacyAssignmentIncludes,
    });

    const users = new Map<string, { employee: Employee; systems: System[] }>();

    const consider = (system?: System | null) => {
      const employee = system?.employee;
      if (!system || !employee) return;
      const entry = users.get(employee.id) ?? { employee, systems: [] };
      if (!entry.systems.find((s) => s.id === system.id)) {
        entry.systems.push(system);
      }
      users.set(employee.id, entry);
    };

    for (const a of modern) consider(a.system);
    for (const a of legacy) consider(a.system);

    return {
      softwareAssetId,
      totalInstallations: modern.length + legacy.length,
      totalUsers: users.size,
      users: [...users.values()],
    };
  }

  // ============================================================
  // REPORTING
  // ============================================================

  async getSummary(expiringInDays = 30) {
    const now = new Date();
    const horizon = new Date(now.getTime() + expiringInDays * DAY_MS);

    const [
      byUsageRaw,
      byTypeRaw,
      licenses,
      activeRaw,
      allDetails,
      legacyActive,
    ] = await Promise.all([
      this.softwareDetailsModel.findAll({
        attributes: ["usage", [fn("COUNT", col("id")), "count"]],
        group: ["usage"],
        raw: true,
      }) as unknown as Promise<{ usage: string; count: string }[]>,
      this.softwareDetailsModel.findAll({
        attributes: [
          [col("subscription_type"), "subscriptionType"],
          [fn("COUNT", col("id")), "count"],
        ],
        group: ["subscription_type"],
        raw: true,
      }) as unknown as Promise<{ subscriptionType: string; count: string }[]>,
      this.softwareLicenseModel.findAll(),
      this.assignmentModel.findAll({
        attributes: [[col("asset_id"), "assetId"]],
        where: { assignmentStatus: SoftwareAssignmentStatus.ACTIVE },
        raw: true,
      }) as unknown as Promise<{ assetId: string }[]>,
      this.softwareDetailsModel.findAll({ attributes: ["assetId"] }),
      this.legacyAssignmentModel.findAll({
        attributes: [[col("software_asset_id"), "softwareAssetId"]],
        where: { status: LegacyAssignmentStatus.ACTIVE },
        raw: true,
      }) as unknown as Promise<{ softwareAssetId: string }[]>,
    ]);

    const installedAssetIds = new Set([
      ...activeRaw.map((r) => r.assetId),
      ...legacyActive.map((r) => r.softwareAssetId),
    ]);
    const unused = allDetails.filter((d) => !installedAssetIds.has(d.assetId));

    const toMap = (rows: any[], key: string) =>
      Object.fromEntries(rows.map((r) => [r[key], Number(r.count)]));

    return {
      software: {
        total: allDetails.length,
        byUsage: toMap(byUsageRaw, "usage"),
        bySubscriptionType: toMap(byTypeRaw, "subscriptionType"),
        withoutActiveInstallations: unused.length,
      },
      installations: {
        active: activeRaw.length + legacyActive.length,
        distinctSoftware: installedAssetIds.size,
      },
      licenses: {
        total: licenses.length,
        totalSeats: licenses.reduce((s, l) => s + l.totalSeats, 0),
        assignedSeats: licenses.reduce((s, l) => s + l.assignedSeats, 0),
        expired: licenses.filter((l) => this.isExpired(l)).length,
        expiringSoon: licenses.filter(
          (l) =>
            l.expiryDate &&
            new Date(l.expiryDate) >= now &&
            new Date(l.expiryDate) <= horizon,
        ).length,
        fullyUtilised: licenses.filter((l) => l.assignedSeats >= l.totalSeats)
          .length,
      },
    };
  }

  async getUnusedSoftware() {
    const [activeModern, activeLegacy] = await Promise.all([
      this.assignmentModel.findAll({
        attributes: [[col("asset_id"), "assetId"]],
        where: { assignmentStatus: SoftwareAssignmentStatus.ACTIVE },
        group: ["asset_id"],
        raw: true,
      }) as unknown as Promise<{ assetId: string }[]>,
      this.legacyAssignmentModel.findAll({
        attributes: [[col("software_asset_id"), "softwareAssetId"]],
        where: { status: LegacyAssignmentStatus.ACTIVE },
        group: ["software_asset_id"],
        raw: true,
      }) as unknown as Promise<{ softwareAssetId: string }[]>,
    ]);

    const ids = [
      ...activeModern.map((a) => a.assetId),
      ...activeLegacy.map((a) => a.softwareAssetId),
    ];

    return this.softwareDetailsModel.findAll({
      where: ids.length ? { assetId: { [Op.notIn]: ids } } : {},
      include: [
        {
          model: Asset,
          as: "asset",
          required: true,
        },
      ],
    });
  }

  async getComplianceReport() {
    const active = await this.assignmentModel.findAll({
      where: { assignmentStatus: SoftwareAssignmentStatus.ACTIVE },
      include: this.assignmentIncludes,
    });

    const detailsList = await this.softwareDetailsModel.findAll({
      where: {
        assetId: { [Op.in]: [...new Set(active.map((a) => a.assetId))] },
      },
    });
    const detailsByAsset = new Map(detailsList.map((d) => [d.assetId, d]));

    const expiredLicenseInstalls = active.filter(
      (a) => a.license && this.isExpired(a.license),
    );

    const unlicensedInstalls = active.filter((a) => {
      const d = detailsByAsset.get(a.assetId);
      return !a.licenseId && d && LICENSED_TYPES.includes(d.subscriptionType);
    });

    const blockedInstalls = active.filter(
      (a) => detailsByAsset.get(a.assetId)?.usage === SoftwareUsage.BLOCKED,
    );

    const orphanedInstalls = active.filter((a) => !a.system?.employeeId);

    const inactiveEmployeeInstalls = active.filter((a) => {
      const status = a.system?.employee?.status;
      return (
        status === EmployeeStatus.EXITED || status === EmployeeStatus.INACTIVE
      );
    });

    const licenses = await this.softwareLicenseModel.findAll();
    const usedByLicense = new Map<string, number>();
    for (const a of active) {
      if (a.licenseId) {
        usedByLicense.set(
          a.licenseId,
          (usedByLicense.get(a.licenseId) ?? 0) + 1,
        );
      }
    }

    const overAllocatedLicenses = licenses
      .filter((l) => (usedByLicense.get(l.id) ?? 0) > l.totalSeats)
      .map((l) => ({
        license: l,
        used: usedByLicense.get(l.id) ?? 0,
        total: l.totalSeats,
      }));

    const seatCountMismatches = licenses
      .filter((l) => (usedByLicense.get(l.id) ?? 0) !== l.assignedSeats)
      .map((l) => ({
        licenseId: l.id,
        stored: l.assignedSeats,
        actual: usedByLicense.get(l.id) ?? 0,
      }));

    return {
      generatedAt: new Date(),
      totals: {
        expiredLicenseInstalls: expiredLicenseInstalls.length,
        unlicensedInstalls: unlicensedInstalls.length,
        blockedInstalls: blockedInstalls.length,
        orphanedInstalls: orphanedInstalls.length,
        inactiveEmployeeInstalls: inactiveEmployeeInstalls.length,
        overAllocatedLicenses: overAllocatedLicenses.length,
        seatCountMismatches: seatCountMismatches.length,
      },
      expiredLicenseInstalls,
      unlicensedInstalls,
      blockedInstalls,
      orphanedInstalls,
      inactiveEmployeeInstalls,
      overAllocatedLicenses,
      seatCountMismatches,
    };
  }
}
