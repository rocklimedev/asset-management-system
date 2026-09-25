import { SystemsService } from "./systems.service";
import { System } from "./models/system.model";

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectConnection, InjectModel } from "@nestjs/sequelize";

import { Op, Transaction, WhereOptions } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { OnEvent } from "@nestjs/event-emitter";

import { AuditService } from "@/modules/audit/audit.service";
import { AuthUser } from "@/common/decorator/current-user.decorator";

import { CdnUploadFile } from "../cdn/cdn.service";
import { CdnService } from "../cdn/cdn.service";

import {
  CreateAssetDto,
  CreateAssetUnitInputDto,
} from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { AssignAssetDto } from "./dto/assign-asset.dto";
import { TransferAssetDto } from "./dto/transfer-asset.dto";
import { AssetPoolQueryDto } from "./dto/asset-pool-query.dto";
import { AdjustInventoryDto } from "./dto/adjust-inventory.dto";

import {
  InventoryHistory,
  InventoryChangeType,
} from "./models/inventory-history.model";

import { Asset, AssetStatus, AssetCondition } from "./models/asset.model";
import {
  AssetUnit,
  AssetUnitStatus,
  AssetUnitCondition,
} from "./models/asset-unit.model";

import { AssetCategory } from "./models/asset-category.model";
import { AssetHistory } from "./models/asset-history.model";

import {
  AssetAssignment,
  AssignmentStatus,
} from "./models/asset-assignment.model";

import { AssetTransfer, TransferStatus } from "./models/asset-transfer.model";

import { Vendor } from "./models/vendor.model";
import { SoftwareLicense } from "./models/software-license.model";

import { Organisation } from "../organisation/models/organisation.model";

import {
  Employee,
  EmployeeStatus,
} from "../organisation/models/employees.model";

import { Location } from "@/modules/organisation/models/location.model";

const NON_TRANSFERABLE_STATUSES: AssetStatus[] = [
  AssetStatus.RETIRED,
  AssetStatus.LOST,
  AssetStatus.DISPOSED,
];

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset)
    private readonly assetModel: typeof Asset,

    @InjectModel(AssetUnit)
    private readonly assetUnitModel: typeof AssetUnit,

    @InjectModel(AssetCategory)
    private readonly assetCategoryModel: typeof AssetCategory,

    @InjectModel(AssetHistory)
    private readonly assetHistoryModel: typeof AssetHistory,

    @InjectModel(AssetAssignment)
    private readonly assetAssignmentModel: typeof AssetAssignment,

    @InjectModel(AssetTransfer)
    private readonly assetTransferModel: typeof AssetTransfer,

    @InjectModel(SoftwareLicense)
    private readonly softwareLicenseModel: typeof SoftwareLicense,

    @InjectModel(Vendor)
    private readonly vendorModel: typeof Vendor,

    @InjectModel(Organisation)
    private readonly organisationModel: typeof Organisation,

    @InjectModel(Employee)
    private readonly employeeModel: typeof Employee,

    @InjectModel(Location)
    private readonly locationModel: typeof Location,

    @InjectConnection()
    private readonly sequelize: Sequelize,

    @InjectModel(InventoryHistory)
    private readonly inventoryHistoryModel: typeof InventoryHistory,

    private readonly cdn: CdnService,

    private readonly audit: AuditService,

    private readonly systemsService: SystemsService,
  ) {}

  // ============================================================
  // COMMON INCLUDE
  // ============================================================

  private get assetInclude() {
    return [
      {
        model: Organisation,
        as: "organisation",
      },

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

      {
        model: SoftwareLicense,
        as: "license",
      },

      // ----------------------------------------------------------
      // PHYSICAL ASSET UNITS
      // ----------------------------------------------------------

      {
        model: AssetUnit,
        as: "units",
      },

      // ----------------------------------------------------------
      // ACTIVE ASSIGNMENTS
      // ----------------------------------------------------------

      {
        model: AssetAssignment,
        as: "assignments",
        where: {
          status: AssignmentStatus.ACTIVE,
        },
        required: false,

        include: [
          {
            model: AssetUnit,
            as: "assetUnit",
          },

          {
            model: System,
            include: [Employee],
          },

          {
            model: Employee,
            as: "employee",
          },
        ],
      },
    ];
  }

  // ============================================================
  // UNIT CODE
  // ============================================================

  private generateUnitCode(assetTag: string | null, index: number) {
    const prefix =
      assetTag?.trim() || `AST-${Date.now().toString(36).toUpperCase()}`;

    return `${prefix}-${String(index + 1).padStart(3, "0")}`;
  }

  // ============================================================
  // CREATE ASSET UNITS
  // ============================================================

  private async createAssetUnits(
    asset: Asset,
    quantity: number,
    transaction: Transaction,
    options?: {
      assigned?: boolean;
      serialNumber?: string | null;
      initialUnits?: CreateAssetUnitInputDto[];
    },
  ) {
    const units: AssetUnit[] = [];

    const safeQuantity = Math.max(quantity || 1, 1);
    const initialUnits = options?.initialUnits ?? [];

    for (let index = 0; index < safeQuantity; index++) {
      const input = initialUnits[index];

      const unit = await this.assetUnitModel.create(
        {
          assetId: asset.id,

          unitCode:
            input?.unitCode?.trim() ||
            this.generateUnitCode(asset.assetTag ?? null, index),

          serialNumber:
            input?.serialNumber?.trim() ||
            (safeQuantity === 1 ? (options?.serialNumber ?? null) : null),

          status: options?.assigned
            ? AssetUnitStatus.ASSIGNED
            : ((input?.status as unknown as AssetUnitStatus) ??
              AssetUnitStatus.AVAILABLE),

          condition:
            (input?.condition as unknown as AssetUnitCondition) ??
            (asset.condition as unknown as AssetUnitCondition) ??
            AssetUnitCondition.GOOD,

          locationId: input?.locationId ?? asset.locationId ?? null,

          notes: input?.notes ?? null,
        },
        {
          transaction,
        },
      );

      units.push(unit);
    }

    return units;
  }

  // ============================================================
  // GET AVAILABLE UNIT
  // ============================================================

  private async getAvailableUnit(
    assetId: string,
    transaction: Transaction,
    unitId?: string,
  ) {
    if (unitId) {
      const unit = await this.assetUnitModel.findOne({
        where: {
          id: unitId,
          assetId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!unit) {
        throw new NotFoundException("The selected asset unit was not found.");
      }

      if (unit.status !== AssetUnitStatus.AVAILABLE) {
        throw new BadRequestException(
          `Asset unit ${unit.unitCode ?? unit.id} is not available.`,
        );
      }

      return unit;
    }

    const unit = await this.assetUnitModel.findOne({
      where: {
        assetId,
        status: AssetUnitStatus.AVAILABLE,
      },
      order: [["createdAt", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!unit) {
      throw new BadRequestException(
        "This asset has no physical unit available to assign.",
      );
    }

    return unit;
  }

  // ============================================================
  // REFRESH AGGREGATE ASSIGNMENT COUNTERS
  // ============================================================

  private async refreshAssetAssignmentState(
    assetId: string,
    transaction: Transaction,
  ) {
    const asset = await this.assetModel.findByPk(assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!asset) {
      throw new NotFoundException("Asset not found.");
    }

    const quantity = asset.quantity ?? 0;

    const assignedCount = await this.assetUnitModel.count({
      where: {
        assetId,
        status: AssetUnitStatus.ASSIGNED,
      },
      transaction,
    });

    const availableCount = await this.assetUnitModel.count({
      where: {
        assetId,
        status: AssetUnitStatus.AVAILABLE,
      },
      transaction,
    });

    let aggregateStatus = asset.status;

    if (assignedCount > 0) {
      aggregateStatus = AssetStatus.ASSIGNED;
    } else if (availableCount > 0) {
      aggregateStatus = AssetStatus.AVAILABLE;
    }

    await asset.update(
      {
        quantityAssigned: assignedCount,
        status: aggregateStatus,
      },
      {
        transaction,
      },
    );

    return {
      asset,
      quantity,
      quantityAssigned: assignedCount,
      quantityAvailable: availableCount,
    };
  }

  // ============================================================
  // INVENTORY LISTING
  // ============================================================

  // ============================================================
  // INVENTORY LISTING
  // ============================================================

  async findAll(params: {
    search?: string;
    organisationId?: string;
    kind?: string;
    status?: string;
    condition?: string;
    categoryId?: string;
    locationId?: string;
    assigned?: "assigned" | "unassigned";
    sortBy?: "assetTag" | "name" | "purchaseDate" | "warrantyExpiry" | "status";
    sortDir?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(params.page ?? 1, 1);

    const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);

    const andConditions: WhereOptions<Asset>[] = [];

    // ------------------------------------------------------------
    // SEARCH
    // ------------------------------------------------------------

    if (params.search?.trim()) {
      const like = {
        [Op.like]: `%${params.search.trim()}%`,
      };

      andConditions.push({
        [Op.or]: [
          { assetTag: like },
          { name: like },
          { serialNumber: like },
          { manufacturer: like },
          { model: like },

          { "$organisation.name$": like },
          { "$category.name$": like },

          { "$assignments.employee.name$": like },
          { "$assignments.system.name$": like },
          { "$assignments.system.systemTag$": like },
          { "$assignments.system.employee.name$": like },

          this.sequelize.where(this.sequelize.col("units.unit_code"), like),

          this.sequelize.where(this.sequelize.col("units.serial_number"), like),
        ],
      } as WhereOptions<Asset>);
    }

    // ------------------------------------------------------------
    // ORGANISATION
    // ------------------------------------------------------------

    if (params.organisationId) {
      andConditions.push({
        organisationId: params.organisationId,
      });
    }

    // ------------------------------------------------------------
    // KIND
    // ------------------------------------------------------------

    if (params.kind) {
      andConditions.push({
        kind: params.kind as Asset["kind"],
      });
    }

    // ------------------------------------------------------------
    // STATUS
    // ------------------------------------------------------------

    if (params.status) {
      andConditions.push({
        status: params.status as AssetStatus,
      });
    }

    // ------------------------------------------------------------
    // CONDITION
    // ------------------------------------------------------------

    if (params.condition) {
      andConditions.push({
        condition: params.condition as AssetCondition,
      });
    }

    // ------------------------------------------------------------
    // CATEGORY
    // ------------------------------------------------------------

    if (params.categoryId) {
      andConditions.push({
        categoryId: params.categoryId,
      });
    }

    // ------------------------------------------------------------
    // LOCATION
    // ------------------------------------------------------------

    if (params.locationId) {
      andConditions.push({
        locationId: params.locationId,
      });
    }

    // ------------------------------------------------------------
    // ASSIGNMENT FILTER
    // ------------------------------------------------------------

    if (params.assigned === "assigned") {
      andConditions.push({
        [Op.or]: [
          {
            status: AssetStatus.ASSIGNED,
          },
          this.sequelize.where(
            this.sequelize.col("units.status"),
            AssetUnitStatus.ASSIGNED,
          ),
        ],
      } as WhereOptions<Asset>);
    }

    if (params.assigned === "unassigned") {
      andConditions.push({
        [Op.and]: [
          {
            status: {
              [Op.ne]: AssetStatus.ASSIGNED,
            },
          },
          this.sequelize.where(this.sequelize.col("units.status"), {
            [Op.ne]: AssetUnitStatus.ASSIGNED,
          }),
        ],
      } as WhereOptions<Asset>);
    }

    const where: WhereOptions<Asset> =
      andConditions.length > 0
        ? {
            [Op.and]: andConditions,
          }
        : {};

    // ------------------------------------------------------------
    // SORT
    // ------------------------------------------------------------

    const sortBy = params.sortBy ?? "assetTag";
    const sortDir = params.sortDir ?? "asc";

    // ------------------------------------------------------------
    // TOTAL ASSETS
    //
    // Count DISTINCT ASSETS, not units.
    // ------------------------------------------------------------

    const countRows = await this.assetModel.findAll({
      attributes: ["id"],
      where,
      include: this.assetInclude,
      group: ["Asset.id"],
      raw: true,
      subQuery: false,
    });

    const total = countRows.length;

    // ------------------------------------------------------------
    // PAGINATE ASSET IDS
    //
    // IMPORTANT:
    // LIMIT/OFFSET is applied to Asset rows only.
    // Units are NOT allowed to consume the pagination.
    // ------------------------------------------------------------

    const pagedAssetRows = await this.assetModel.findAll({
      attributes: ["id"],
      where,

      include: this.assetInclude,

      order: [
        [sortBy, sortDir],
        ["id", "asc"],
      ],

      limit: pageSize,
      offset: (page - 1) * pageSize,

      group: ["Asset.id"],

      raw: true,

      subQuery: false,
    });

    const assetIds = pagedAssetRows.map((row: any) => row.id);

    // ------------------------------------------------------------
    // NO ASSETS ON THIS PAGE
    // ------------------------------------------------------------

    if (assetIds.length === 0) {
      return {
        items: [],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    // ------------------------------------------------------------
    // FETCH COMPLETE ASSETS
    //
    // No limit/offset here.
    // Therefore ALL units belonging to each selected asset
    // are returned.
    // ------------------------------------------------------------

    const items = await this.assetModel.findAll({
      where: {
        id: {
          [Op.in]: assetIds,
        },
      },

      include: this.assetInclude,
    });

    // ------------------------------------------------------------
    // RESTORE PAGINATION/SORT ORDER
    //
    // IN (...) does not guarantee the same order as assetIds.
    // ------------------------------------------------------------

    const orderMap = new Map(assetIds.map((id, index) => [String(id), index]));

    items.sort(
      (a: Asset, b: Asset) =>
        (orderMap.get(String(a.id)) ?? 0) - (orderMap.get(String(b.id)) ?? 0),
    );

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
  // ============================================================
  // FIND ONE
  // ============================================================

  async findOne(id: string) {
    const asset = await this.assetModel.findByPk(id, {
      include: this.assetInclude,
    });

    if (!asset) {
      throw new NotFoundException("Asset not found.");
    }

    return asset;
  }

  // ============================================================
  // UNIT LIST
  // ============================================================

  async units(id: string) {
    await this.findOne(id);

    return this.assetUnitModel.findAll({
      where: {
        assetId: id,
      },

      include: [
        {
          model: AssetAssignment,
          as: "assignments",
          required: false,
          where: {
            status: AssignmentStatus.ACTIVE,
          },
        },
      ],

      order: [["createdAt", "ASC"]],
    });
  }

  // ============================================================
  // HISTORY
  // ============================================================

  async history(id: string) {
    await this.findOne(id);

    return this.assetHistoryModel.findAll({
      where: {
        assetId: id,
      },

      order: [["createdAt", "DESC"]],
    });
  }

  // ============================================================
  // CREATE
  // ============================================================

  async create(dto: CreateAssetDto, actor: AuthUser) {
    // ASSET TAG

    if (dto.assetTag) {
      const existingTag = await this.assetModel.findOne({
        where: {
          assetTag: dto.assetTag,
        },
      });

      if (existingTag) {
        throw new ConflictException(
          "An asset with this asset tag already exists.",
        );
      }
    }

    // ORGANISATION

    if (dto.organisationId) {
      const organisation = await this.organisationModel.findByPk(
        dto.organisationId,
      );

      if (!organisation) {
        throw new NotFoundException("Organisation not found.");
      }
    }

    // CATEGORY

    const category = await this.assetCategoryModel.findByPk(dto.categoryId);

    if (!category) {
      throw new NotFoundException("Asset category not found.");
    }

    if (
      category.organisationId !== null &&
      dto.organisationId !== undefined &&
      category.organisationId !== dto.organisationId
    ) {
      throw new BadRequestException(
        "The selected category does not belong to the selected organisation.",
      );
    }

    if (!category.isActive) {
      throw new BadRequestException(
        "Cannot create an asset using an inactive category.",
      );
    }

    // LOCATION

    if (dto.locationId) {
      const location = await this.locationModel.findByPk(dto.locationId);

      if (!location) {
        throw new NotFoundException("Location not found.");
      }

      if (
        location.organisationId !== null &&
        dto.organisationId !== undefined &&
        location.organisationId !== dto.organisationId
      ) {
        throw new BadRequestException(
          "The selected location does not belong to the selected organisation.",
        );
      }
    }

    // VENDOR

    if (dto.vendorId) {
      const vendor = await this.vendorModel.findByPk(dto.vendorId);

      if (!vendor) {
        throw new NotFoundException("Vendor not found.");
      }
    }

    // EMPLOYEE

    let employee: Employee | null = null;

    if (dto.assignEmployeeId) {
      employee = await this.employeeModel.findByPk(dto.assignEmployeeId);

      if (!employee) {
        throw new NotFoundException("Employee not found.");
      }

      if (employee.status === EmployeeStatus.EXITED) {
        throw new BadRequestException(
          "Cannot assign an asset to an employee who has exited.",
        );
      }
    }

    return this.sequelize.transaction(async (t: Transaction) => {
      const quantity = Math.max(dto.quantity ?? 1, 1);

      const asset = await this.assetModel.create(
        {
          name: dto.name,

          assetTag: dto.assetTag ?? null,

          kind: dto.kind,

          organisationId: dto.organisationId ?? null,

          categoryId: dto.categoryId,

          manufacturer: dto.manufacturer ?? null,

          model: dto.model ?? null,

          // Legacy field retained for compatibility.
          serialNumber: quantity === 1 ? (dto.serialNumber ?? null) : null,

          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,

          purchasePrice: dto.purchasePrice ?? null,

          vendorId: dto.vendorId ?? null,

          invoiceNumber: dto.invoiceNumber ?? null,

          warrantyStart: dto.warrantyStart ? new Date(dto.warrantyStart) : null,

          warrantyExpiry: dto.warrantyExpiry
            ? new Date(dto.warrantyExpiry)
            : null,

          quantity,

          quantityAssigned: dto.assignEmployeeId ? 1 : 0,

          status: dto.assignEmployeeId
            ? AssetStatus.ASSIGNED
            : (dto.status ?? AssetStatus.AVAILABLE),

          condition: dto.condition ?? AssetCondition.GOOD,

          locationId: dto.locationId ?? null,

          notes: dto.notes ?? null,
        } as Asset,
        {
          transaction: t,
        },
      );

      // ========================================================
      // CREATE PHYSICAL UNITS
      // ========================================================

      await this.createAssetUnits(asset, quantity, t, {
        assigned: Boolean(dto.assignEmployeeId),
        serialNumber: dto.serialNumber ?? null,
        initialUnits: dto.initialUnits,
      });

      // ========================================================
      // SOFTWARE LICENSE
      // ========================================================

      if (dto.kind === "SOFTWARE" && dto.licenseVendor) {
        await this.softwareLicenseModel.create(
          {
            assetId: asset.id,

            vendor: dto.licenseVendor,

            licenseType: dto.licenseType ?? "Subscription",

            licenseReference: dto.licenseReference ?? "",

            totalSeats: dto.totalSeats ?? 1,

            assignedSeats: dto.assignEmployeeId ? 1 : 0,

            purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,

            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,

            renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : null,

            cost: dto.purchasePrice ?? null,
          } as SoftwareLicense,
          {
            transaction: t,
          },
        );
      }

      // CREATED HISTORY

      await this.assetHistoryModel.create(
        {
          assetId: asset.id,

          action: "CREATED",

          performedBy: actor.name,

          toValue: asset.status,
        } as AssetHistory,
        {
          transaction: t,
        },
      );

      // ========================================================
      // INITIAL ASSIGNMENT
      // ========================================================

      if (dto.assignEmployeeId && employee) {
        const assignedUnit = await this.assetUnitModel.findOne({
          where: {
            assetId: asset.id,
            status: AssetUnitStatus.ASSIGNED,
          },
          order: [["createdAt", "ASC"]],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!assignedUnit) {
          throw new BadRequestException(
            "Unable to create the initial assigned asset unit.",
          );
        }

        await this.assetAssignmentModel.create(
          {
            assetId: asset.id,

            assetUnitId: assignedUnit.id,

            employeeId: dto.assignEmployeeId,

            assignedBy: actor.id,

            status: AssignmentStatus.ACTIVE,
          } as AssetAssignment,
          {
            transaction: t,
          },
        );

        await this.assetHistoryModel.create(
          {
            assetId: asset.id,

            action: "ASSIGNED",

            performedBy: actor.name,

            toValue: employee.name,
          } as AssetHistory,
          {
            transaction: t,
          },
        );
      }

      // AUDIT

      await this.audit.log(
        {
          userId: actor.id,

          action: "ASSET_CREATED",

          entity: "Asset",

          entityId: asset.id,
        },
        t,
      );

      return this.assetModel.findByPk(asset.id, {
        include: this.assetInclude,

        transaction: t,
      });
    });
  }
  // ============================================================
  // UPDATE
  // ============================================================

  async update(id: string, dto: UpdateAssetDto, actor: AuthUser) {
    const existing = await this.findOne(id);

    const organisationId = dto.organisationId ?? existing.organisationId;

    // ORGANISATION

    if (dto.organisationId && dto.organisationId !== existing.organisationId) {
      const organisation = await this.organisationModel.findByPk(
        dto.organisationId,
      );

      if (!organisation) {
        throw new NotFoundException("Organisation not found.");
      }
    }

    // CATEGORY

    if (dto.categoryId !== undefined || dto.organisationId !== undefined) {
      const categoryId = dto.categoryId ?? existing.categoryId;

      const category = await this.assetCategoryModel.findByPk(categoryId);

      if (!category) {
        throw new NotFoundException("Asset category not found.");
      }

      if (
        category.organisationId !== null &&
        category.organisationId !== organisationId
      ) {
        throw new BadRequestException(
          "The selected category does not belong to the selected organisation.",
        );
      }

      if (!category.isActive) {
        throw new BadRequestException("Cannot use an inactive category.");
      }
    }

    // LOCATION

    if (dto.locationId !== undefined || dto.organisationId !== undefined) {
      const locationId = dto.locationId ?? existing.locationId;

      if (locationId) {
        const location = await this.locationModel.findByPk(locationId);

        if (!location) {
          throw new NotFoundException("Location not found.");
        }

        if (
          location.organisationId !== null &&
          location.organisationId !== organisationId
        ) {
          throw new BadRequestException(
            "The selected location does not belong to the selected organisation.",
          );
        }
      }
    }

    // VENDOR

    if (dto.vendorId !== undefined && dto.vendorId) {
      const vendor = await this.vendorModel.findByPk(dto.vendorId);

      if (!vendor) {
        throw new NotFoundException("Vendor not found.");
      }
    }

    // SERIAL NUMBER

    if (dto.serialNumber && dto.serialNumber !== existing.serialNumber) {
      const duplicate = await this.assetModel.findOne({
        where: {
          serialNumber: dto.serialNumber,

          id: {
            [Op.ne]: id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          "An asset with this serial number already exists.",
        );
      }
    }

    // ASSET TAG

    if (dto.assetTag && dto.assetTag !== existing.assetTag) {
      const duplicate = await this.assetModel.findOne({
        where: {
          assetTag: dto.assetTag,

          id: {
            [Op.ne]: id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          "An asset with this asset tag already exists.",
        );
      }
    }

    return this.sequelize.transaction(async (t: Transaction) => {
      const updateData: Partial<Asset> = {};

      if (dto.name !== undefined) updateData.name = dto.name;

      if (dto.assetTag !== undefined) updateData.assetTag = dto.assetTag;

      if (dto.kind !== undefined) updateData.kind = dto.kind;

      if (dto.organisationId !== undefined)
        updateData.organisationId = dto.organisationId;

      if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;

      if (dto.manufacturer !== undefined)
        updateData.manufacturer = dto.manufacturer;

      if (dto.model !== undefined) updateData.model = dto.model;

      /*
       * Serial number is now primarily a UNIT property.
       *
       * Keep this for backwards compatibility only.
       * A multi-unit asset should not store one serial number
       * on the aggregate Asset record.
       */
      if (dto.serialNumber !== undefined)
        updateData.serialNumber = dto.serialNumber;

      if (dto.purchaseDate !== undefined) {
        updateData.purchaseDate = dto.purchaseDate
          ? new Date(dto.purchaseDate)
          : null;
      }

      if (dto.purchasePrice !== undefined)
        updateData.purchasePrice = dto.purchasePrice;

      if (dto.vendorId !== undefined) updateData.vendorId = dto.vendorId;

      if (dto.invoiceNumber !== undefined)
        updateData.invoiceNumber = dto.invoiceNumber;

      if (dto.warrantyStart !== undefined) {
        updateData.warrantyStart = dto.warrantyStart
          ? new Date(dto.warrantyStart)
          : null;
      }

      if (dto.warrantyExpiry !== undefined) {
        updateData.warrantyExpiry = dto.warrantyExpiry
          ? new Date(dto.warrantyExpiry)
          : null;
      }

      if (dto.status !== undefined) {
        const active = await this.assetAssignmentModel.count({
          where: {
            assetId: id,
            status: AssignmentStatus.ACTIVE,
          },
          transaction: t,
        });

        if (dto.status === AssetStatus.ASSIGNED && !active) {
          throw new BadRequestException(
            "Use assignment to mark an asset assigned.",
          );
        }

        if (dto.status === AssetStatus.AVAILABLE && active) {
          throw new BadRequestException(
            "Return the current assignment before marking this asset available.",
          );
        }

        updateData.status = dto.status;
      }

      /*
       * Aggregate condition remains for legacy compatibility.
       * Unit condition should be changed on AssetUnit.
       */
      if (dto.condition !== undefined) updateData.condition = dto.condition;

      if (dto.locationId !== undefined) updateData.locationId = dto.locationId;

      if (dto.notes !== undefined) updateData.notes = dto.notes;

      await this.assetModel.update(updateData, {
        where: {
          id,
        },

        transaction: t,
      });

      // STATUS HISTORY

      if (dto.status && dto.status !== existing.status) {
        await this.assetHistoryModel.create(
          {
            assetId: id,

            action: "STATUS_CHANGED",

            performedBy: actor.name,

            fromValue: existing.status,

            toValue: dto.status,
          } as AssetHistory,
          {
            transaction: t,
          },
        );
      }

      // AUDIT

      await this.audit.log(
        {
          userId: actor.id,

          action: "ASSET_EDITED",

          entity: "Asset",

          entityId: id,

          metadata: dto as unknown as Record<string, unknown>,
        },
        t,
      );

      return this.assetModel.findByPk(id, {
        include: this.assetInclude,

        transaction: t,
      });
    });
  }

  // ============================================================
  // ASSIGN
  // ============================================================

  async assign(id: string, dto: AssignAssetDto, actor: AuthUser) {
    if (Boolean(dto.employeeId) === Boolean(dto.systemId)) {
      throw new BadRequestException("Choose exactly one employee or system.");
    }

    return this.sequelize.transaction(async (t) => {
      // EMPLOYEE

      const employee = dto.employeeId
        ? await this.employeeModel.findByPk(dto.employeeId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
          })
        : null;

      if (dto.employeeId && !employee) {
        throw new NotFoundException("Employee not found.");
      }

      if (
        employee &&
        ![EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE].includes(
          employee.status,
        )
      ) {
        throw new BadRequestException(
          "Cannot assign to an inactive or exited employee.",
        );
      }

      // SYSTEM

      const system = dto.systemId
        ? await System.findByPk(dto.systemId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
          })
        : null;

      if (dto.systemId && !system) {
        throw new NotFoundException("System not found.");
      }

      // ASSET

      const asset = await this.assetModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!asset) {
        throw new NotFoundException("Asset not found.");
      }

      if (
        NON_TRANSFERABLE_STATUSES.includes(asset.status) ||
        asset.status === AssetStatus.REPAIR
      ) {
        throw new BadRequestException(
          `${asset.status.charAt(0) + asset.status.slice(1).toLowerCase()} assets cannot be assigned.`,
        );
      }

      // ======================================================
      // FIND PHYSICAL UNIT
      // ======================================================

      /*
       * Prefer the explicitly requested unit when provided.
       * Otherwise automatically pick the first AVAILABLE unit.
       */
      const unit = await this.getAvailableUnit(id, t, dto.assetUnitId);

      // ======================================================
      // DUPLICATE UNIT CHECK
      //
      // Each physical unit can only have one active assignment.
      // Multiple units of the same asset MAY be assigned to the
      // same employee/system (e.g. two monitors of the same model).
      // ======================================================

      const unitAlreadyAssigned = await this.assetAssignmentModel.findOne({
        where: {
          assetUnitId: unit.id,
          status: AssignmentStatus.ACTIVE,
        },
        transaction: t,
      });

      if (unitAlreadyAssigned) {
        throw new BadRequestException(
          "This physical unit is already assigned.",
        );
      }

      // ======================================================
      // MARK UNIT ASSIGNED
      // ======================================================

      await unit.update(
        {
          status: AssetUnitStatus.ASSIGNED,
        },
        {
          transaction: t,
        },
      );

      // ======================================================
      // CREATE ASSIGNMENT
      // ======================================================

      await this.assetAssignmentModel.create(
        {
          assetId: id,

          assetUnitId: unit.id,

          employeeId: dto.employeeId ?? null,

          systemId: dto.systemId ?? null,

          assignedBy: actor.id,

          status: AssignmentStatus.ACTIVE,

          notes: dto.notes ?? null,
        } as AssetAssignment,
        {
          transaction: t,
        },
      );

      // ======================================================
      // REFRESH AGGREGATE
      // ======================================================

      const state = await this.refreshAssetAssignmentState(id, t);

      // ======================================================
      // INVENTORY HISTORY (custody event — physical qty unchanged)
      // ======================================================

      await this.inventoryHistoryModel.create(
        {
          assetId: id,
          changeType: InventoryChangeType.ASSIGNED,
          quantityDelta: 0,
          quantityAfter: state.quantity,
          quantityAssignedAfter: state.quantityAssigned,
          performedBy: actor.name,
          reason: dto.notes ?? null,
        } as InventoryHistory,
        {
          transaction: t,
        },
      );

      // ======================================================
      // HISTORY
      // ======================================================

      await this.assetHistoryModel.create(
        {
          assetId: id,

          action: "ASSIGNED",

          performedBy: actor.name,

          toValue: system
            ? "System: " + system.systemTag + " (" + system.name + ")"
            : employee!.name,

          notes: dto.notes ?? null,
        } as AssetHistory,
        {
          transaction: t,
        },
      );

      // ======================================================
      // AUDIT
      // ======================================================

      await this.audit.log(
        {
          userId: actor.id,

          action: "ASSET_ASSIGNED",

          entity: "Asset",

          entityId: id,

          metadata: {
            employeeId: dto.employeeId ?? null,

            systemId: dto.systemId ?? null,

            assetUnitId: unit.id,

            unitCode: unit.unitCode ?? null,

            serialNumber: unit.serialNumber ?? null,
          },
        },
        t,
      );

      return this.assetModel.findByPk(id, {
        include: this.assetInclude,

        transaction: t,
      });
    });
  }

  // ============================================================
  // TRANSFER
  // ============================================================

  async transfer(id: string, dto: TransferAssetDto, actor: AuthUser) {
    const asset = await this.findOne(id);

    if (NON_TRANSFERABLE_STATUSES.includes(asset.status)) {
      throw new BadRequestException(
        `${asset.status.charAt(0) + asset.status.slice(1).toLowerCase()} assets cannot be transferred.`,
      );
    }

    if (asset.status === AssetStatus.REPAIR) {
      throw new BadRequestException(
        "Assets currently under repair cannot be transferred.",
      );
    }

    if (
      asset.status !== AssetStatus.ASSIGNED ||
      !asset.assignments ||
      asset.assignments.length === 0
    ) {
      throw new BadRequestException(
        "This asset is not currently assigned to anyone.",
      );
    }

    const currentAssignment = asset.assignments[0];

    if (currentAssignment.systemId) {
      throw new BadRequestException(
        "Remove this component from its system before assigning it directly to an employee.",
      );
    }

    const fromEmployeeId = currentAssignment.employeeId;

    if (fromEmployeeId === dto.toEmployeeId) {
      throw new BadRequestException(
        "Cannot transfer an asset to its current owner.",
      );
    }

    const toEmployee = await this.employeeModel.findByPk(dto.toEmployeeId);

    if (!toEmployee) {
      throw new NotFoundException("Destination employee not found.");
    }

    if (toEmployee.status === EmployeeStatus.EXITED) {
      throw new BadRequestException(
        "Cannot transfer an asset to an employee who has exited.",
      );
    }

    const fromEmployee = fromEmployeeId
      ? await this.employeeModel.findByPk(fromEmployeeId)
      : null;

    if (!actor?.id) {
      throw new BadRequestException(
        "Unable to determine the user performing this transfer.",
      );
    }

    return this.sequelize.transaction(async (t: Transaction) => {
      const destination = await this.employeeModel.findByPk(dto.toEmployeeId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (
        !destination ||
        ![EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE].includes(
          destination.status,
        )
      ) {
        throw new BadRequestException("Destination employee is not active.");
      }

      const lockedAsset = await this.assetModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (lockedAsset?.status !== AssetStatus.ASSIGNED) {
        throw new ConflictException(
          "Asset status changed. Refresh and try again.",
        );
      }

      const active = await this.assetAssignmentModel.findOne({
        where: {
          assetId: id,

          status: AssignmentStatus.ACTIVE,
        },

        transaction: t,

        lock: t.LOCK.UPDATE,
      });

      if (!active || active.id !== currentAssignment.id) {
        throw new ConflictException(
          "Assignment changed. Refresh and try again.",
        );
      }

      // ======================================================
      // UNIT
      // ======================================================

      let unit: AssetUnit | null = null;

      if (active.assetUnitId) {
        unit = await this.assetUnitModel.findByPk(active.assetUnitId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
      }

      if (!unit) {
        /*
         * Backwards compatibility for old assignments
         * which existed before AssetUnit migration.
         */
        unit = await this.assetUnitModel.findOne({
          where: {
            assetId: id,

            status: AssetUnitStatus.ASSIGNED,
          },

          transaction: t,

          lock: t.LOCK.UPDATE,
        });
      }

      if (!unit) {
        throw new ConflictException(
          "The assigned physical asset unit could not be found.",
        );
      }

      // ======================================================
      // CLOSE CURRENT ASSIGNMENT
      // ======================================================

      await this.assetAssignmentModel.update(
        {
          status: AssignmentStatus.RETURNED,

          returnedAt: new Date(),
        },
        {
          where: {
            id: active.id,

            status: AssignmentStatus.ACTIVE,
          },

          transaction: t,
        },
      );

      // ======================================================
      // CREATE NEW ASSIGNMENT
      // ======================================================

      const newAssignment = await this.assetAssignmentModel.create(
        {
          assetId: id,

          assetUnitId: unit.id,

          employeeId: dto.toEmployeeId,

          assignedAt: new Date(),

          assignedBy: actor.id,

          status: AssignmentStatus.ACTIVE,

          notes: dto.notes ?? null,
        } as AssetAssignment,
        {
          transaction: t,
        },
      );

      // ======================================================
      // UNIT REMAINS ASSIGNED
      // ======================================================

      await unit.update(
        {
          status: AssetUnitStatus.ASSIGNED,
        },
        {
          transaction: t,
        },
      );

      // ======================================================
      // TRANSFER RECORD
      // ======================================================

      const transfer = await this.assetTransferModel.create(
        {
          assetId: id,

          fromEmployeeId,

          toEmployeeId: dto.toEmployeeId,

          requestedById: actor.id,

          approvedById: actor.id,

          status: TransferStatus.COMPLETED,

          reason: dto.reason ?? "Employee transfer",

          notes: dto.notes ?? null,

          approvedAt: new Date(),
        } as AssetTransfer,
        {
          transaction: t,
        },
      );

      // ======================================================
      // REFRESH AGGREGATE
      // ======================================================

      await this.refreshAssetAssignmentState(id, t);

      // ======================================================
      // HISTORY
      // ======================================================

      await this.assetHistoryModel.create(
        {
          assetId: id,

          action: "TRANSFERRED",

          performedBy: actor.name,

          fromValue: fromEmployee?.name ?? "Unassigned",

          toValue: toEmployee.name,

          notes: dto.notes ?? null,
        } as AssetHistory,
        {
          transaction: t,
        },
      );

      // ======================================================
      // AUDIT
      // ======================================================

      await this.audit.log(
        {
          userId: actor.id,

          action: "ASSET_TRANSFERRED",

          entity: "Asset",

          entityId: id,

          metadata: {
            fromEmployeeId,

            toEmployeeId: dto.toEmployeeId,

            transferId: transfer.id,

            assignmentId: newAssignment.id,

            assetUnitId: unit.id,

            unitCode: unit.unitCode ?? null,

            serialNumber: unit.serialNumber ?? null,
          },
        },
        t,
      );

      const updatedAsset = await this.assetModel.findByPk(id, {
        include: this.assetInclude,

        transaction: t,
      });

      return {
        asset: updatedAsset,

        transfer,

        assignment: newAssignment,

        assetUnit: unit,

        message: `Asset successfully transferred from ${
          fromEmployee?.name ?? "Unassigned"
        } to ${toEmployee.name}.`,
      };
    });
  }

  // ============================================================
  // RETURN ASSET
  // ============================================================

  async returnAsset(id: string, actor: AuthUser, notes?: string) {
    return this.sequelize.transaction(async (t) => {
      const asset = await this.assetModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!asset) {
        throw new NotFoundException("Asset not found.");
      }

      const assignment = await this.assetAssignmentModel.findOne({
        where: {
          assetId: id,
          status: AssignmentStatus.ACTIVE,
        },
        include: [
          {
            model: Employee,
            as: "employee",
          },
          {
            model: System,
          },
          {
            model: AssetUnit,
            as: "assetUnit",
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!assignment) {
        throw new BadRequestException("This asset is not currently assigned.");
      }

      // ======================================================
      // GET UNIT
      // ======================================================

      let unit: AssetUnit | null | undefined = assignment.assetUnit;

      if (!unit && assignment.assetUnitId) {
        unit = await this.assetUnitModel.findByPk(assignment.assetUnitId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
      }

      /*
       * Backwards compatibility:
       * find the currently assigned physical unit
       * if this assignment was created before migration.
       */
      if (!unit) {
        unit = await this.assetUnitModel.findOne({
          where: {
            assetId: id,
            status: AssetUnitStatus.ASSIGNED,
          },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
      }

      if (!unit) {
        throw new ConflictException(
          "The assigned physical asset unit could not be found.",
        );
      }

      // ======================================================
      // CLOSE ASSIGNMENT
      // ======================================================

      await assignment.update(
        {
          status: AssignmentStatus.RETURNED,
          returnedAt: new Date(),
          notes: notes ?? assignment.notes,
        },
        {
          transaction: t,
        },
      );

      // ======================================================
      // UNIT AVAILABLE
      // ======================================================

      await unit.update(
        {
          status: AssetUnitStatus.AVAILABLE,
        },
        {
          transaction: t,
        },
      );

      // ======================================================
      // REFRESH AGGREGATE
      // ======================================================

      const state = await this.refreshAssetAssignmentState(id, t);

      // ======================================================
      // INVENTORY HISTORY (custody event — physical qty unchanged)
      // ======================================================

      await this.inventoryHistoryModel.create(
        {
          assetId: id,
          changeType: InventoryChangeType.RETURNED,
          quantityDelta: 0,
          quantityAfter: state.quantity,
          quantityAssignedAfter: state.quantityAssigned,
          performedBy: actor.name,
          reason: notes ?? null,
        } as InventoryHistory,
        {
          transaction: t,
        },
      );

      // ======================================================
      // HISTORY
      // ======================================================

      await this.assetHistoryModel.create(
        {
          assetId: id,
          action: "RETURNED",
          performedBy: actor.name,
          fromValue: assignment.system
            ? "System: " + assignment.system.systemTag
            : (assignment.employee?.name ?? "Assigned"),
          toValue:
            state.quantityAssigned === 0 ? "Unassigned" : "Partially assigned",
          notes: notes ?? null,
        } as AssetHistory,
        {
          transaction: t,
        },
      );

      // ======================================================
      // AUDIT
      // ======================================================

      await this.audit.log(
        {
          userId: actor.id,
          action: "ASSET_RETURNED",
          entity: "Asset",
          entityId: id,
          metadata: {
            employeeId: assignment.employeeId,
            systemId: assignment.systemId,
            assetUnitId: unit.id,
            unitCode: unit.unitCode ?? null,
            serialNumber: unit.serialNumber ?? null,
          },
        },
        t,
      );

      return this.assetModel.findByPk(id, {
        include: this.assetInclude,
        transaction: t,
      });
    });
  }
  // ============================================================
  // ASSET POOL
  //
  // The pool is now based on physical AssetUnit availability.
  // ============================================================

  async findPool(params: AssetPoolQueryDto) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);

    const search = params.search?.trim();
    const like = search ? { [Op.like]: `%${search}%` } : null;

    // ------------------------------------------------------------
    // STEP 1: resolve qualifying asset ids (no pagination yet)
    // ------------------------------------------------------------
    const idConditions: WhereOptions<Asset>[] = [
      { status: { [Op.notIn]: NON_TRANSFERABLE_STATUSES } },
    ];

    if (params.kind) idConditions.push({ kind: params.kind as Asset["kind"] });
    if (params.categoryId) idConditions.push({ categoryId: params.categoryId });
    if (params.locationId) idConditions.push({ locationId: params.locationId });

    if (like) {
      /*
       * NOTE: the "units" include below uses attributes: [] to keep
       * step 1 cheap (we only need asset ids). That means Sequelize
       * has no attribute metadata to resolve "$units.unitCode$" style
       * dot-notation against the model's `field` mapping (unitCode ->
       * unit_code, serialNumber -> serial_number). Referencing the
       * real DB column names directly via sequelize.col(...) sidesteps
       * that translation entirely and works regardless of what's in
       * the include's attributes list.
       */
      idConditions.push({
        [Op.or]: [
          { assetTag: like },
          { name: like },
          { serialNumber: like },
          { manufacturer: like },
          { model: like },
          this.sequelize.where(this.sequelize.col("units.unit_code"), like),
          this.sequelize.where(this.sequelize.col("units.serial_number"), like),
        ],
      } as WhereOptions<Asset>);
    }

    const qualifying = await this.assetModel.findAll({
      attributes: ["id"],
      where: { [Op.and]: idConditions },
      include: [
        {
          model: AssetUnit,
          as: "units",
          attributes: [],
          required: true,
          where: { status: AssetUnitStatus.AVAILABLE },
        },
      ],
      order: [["name", "ASC"]],
      subQuery: false,
      group: ["Asset.id", "Asset.name"], // group by anything in ORDER BY too
    });

    const total = qualifying.length;
    const pageIds = qualifying
      .slice((page - 1) * pageSize, page * pageSize)
      .map((a) => a.id);

    if (pageIds.length === 0) {
      return {
        items: [],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    // ------------------------------------------------------------
    // STEP 2: fetch the full, hydrated records for this page
    // ------------------------------------------------------------
    const rows = await this.assetModel.findAll({
      where: { id: { [Op.in]: pageIds } },
      include: [
        { model: AssetCategory, as: "category" },
        { model: Location, as: "location" },
        {
          model: AssetUnit,
          as: "units",
          required: true,
          where: { status: AssetUnitStatus.AVAILABLE },
        },
      ],
    });

    // IN (...) doesn't preserve order — restore the paginated order from step 1
    const byId = new Map(rows.map((a) => [a.id, a]));
    const items = pageIds.map((id) => byId.get(id)!).filter(Boolean);

    return {
      items: items.map((asset) => {
        const units = asset.units ?? [];
        const quantity = asset.quantity ?? 0;
        const quantityAssigned = units.filter(
          (u) => u.status === AssetUnitStatus.ASSIGNED,
        ).length;
        const quantityAvailable = units.filter(
          (u) => u.status === AssetUnitStatus.AVAILABLE,
        ).length;
        const quantityRepair = units.filter(
          (u) => u.status === AssetUnitStatus.REPAIR,
        ).length;
        const quantityDamaged = units.filter(
          (u) => u.status === AssetUnitStatus.DAMAGED,
        ).length;
        const quantityLost = units.filter(
          (u) => u.status === AssetUnitStatus.LOST,
        ).length;

        return {
          ...asset.toJSON(),
          quantity,
          quantityAssigned,
          quantityAvailable,
          quantityRepair,
          quantityDamaged,
          quantityLost,
          units,
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
  // ============================================================
  // RELEASE ASSETS FOR EXITED EMPLOYEE
  // ============================================================

  async releaseAssetsForExitedEmployee(employeeId: string, actor: AuthUser) {
    const activeAssignments = await this.assetAssignmentModel.findAll({
      where: {
        employeeId,

        status: AssignmentStatus.ACTIVE,
      },
    });

    const released: Awaited<ReturnType<typeof this.returnAsset>>[] = [];

    for (const assignment of activeAssignments) {
      const result = await this.returnAsset(
        assignment.assetId,
        actor,
        "Auto-returned: employee exited",
      );

      released.push(result);
    }

    const systems = await System.findAll({
      where: {
        employeeId,
      },
    });

    for (const system of systems) {
      await this.systemsService.setEmployee(system.id, null, actor);
    }

    return {
      employeeId,

      releasedSystems: systems.length,

      releasedCount: released.length,

      assets: released,
    };
  }

  @OnEvent("employee.exited")
  async handleEmployeeExited(payload: { employeeId: string; actor: AuthUser }) {
    return this.releaseAssetsForExitedEmployee(
      payload.employeeId,
      payload.actor,
    );
  }

  // ============================================================
  // SET / REPLACE ASSET IMAGE
  // ============================================================

  async setImage(id: string, file: CdnUploadFile | undefined, actor: AuthUser) {
    const asset = await this.findOne(id);

    const uploaded = await this.cdn.uploadAssetImage(file);

    if (asset.imageKey) {
      await this.cdn.deleteAssetImage(asset.imageKey);
    }

    await this.assetModel.update(
      {
        imageKey: uploaded.key,

        imageUrl: uploaded.url,
      },

      {
        where: {
          id,
        },
      },
    );

    await this.audit.log({
      userId: actor.id,

      action: "ASSET_IMAGE_UPDATED",

      entity: "Asset",

      entityId: id,
    });

    return this.findOne(id);
  }

  // ============================================================
  // REMOVE IMAGE
  // ============================================================

  async removeImage(id: string, actor: AuthUser) {
    const asset = await this.findOne(id);

    if (asset.imageKey) {
      await this.cdn.deleteAssetImage(asset.imageKey);
    }

    await this.assetModel.update(
      {
        imageKey: null,

        imageUrl: null,
      },

      {
        where: {
          id,
        },
      },
    );

    await this.audit.log({
      userId: actor.id,

      action: "ASSET_IMAGE_REMOVED",

      entity: "Asset",

      entityId: id,
    });

    return this.findOne(id);
  }

  // ============================================================
  // ADJUST INVENTORY QUANTITY
  //
  // This remains for pooled / consumable inventory.
  //
  // IMPORTANT:
  // Do not use this method to change the state of an
  // individually tracked physical unit.
  // ============================================================

  async adjustInventory(id: string, dto: AdjustInventoryDto, actor: AuthUser) {
    const asset = await this.findOne(id);

    const signedDelta = this.signedInventoryDelta(
      dto.changeType,
      dto.quantity,
      dto.direction,
    );

    const newQuantity = (asset.quantity ?? 1) + signedDelta;

    if (newQuantity < 0) {
      throw new BadRequestException(
        "This adjustment would take total quantity below zero.",
      );
    }

    const assignedUnits = await this.assetUnitModel.count({
      where: {
        assetId: id,
        status: AssetUnitStatus.ASSIGNED,
      },
    });

    if (newQuantity < assignedUnits) {
      throw new BadRequestException(
        "Cannot reduce quantity below the number of physical units currently assigned.",
      );
    }

    return this.sequelize.transaction(async (t: Transaction) => {
      await this.assetModel.update(
        {
          quantity: newQuantity,
        },
        {
          where: {
            id,
          },
          transaction: t,
        },
      );

      // ======================================================
      // CREATE UNITS FOR RESTOCK
      // ======================================================

      if (signedDelta > 0) {
        const currentUnitCount = await this.assetUnitModel.count({
          where: {
            assetId: id,
          },
          transaction: t,
        });

        /*
         * Inventory adjustments create physical units as well
         * so Asset.quantity and AssetUnit count stay in sync.
         */
        for (let i = 0; i < signedDelta; i++) {
          await this.assetUnitModel.create(
            {
              assetId: id,
              unitCode: this.generateUnitCode(
                asset.assetTag ?? null,
                currentUnitCount + i,
              ),
              serialNumber: null,
              status: AssetUnitStatus.AVAILABLE,
              condition:
                (asset.condition as unknown as AssetUnitCondition) ??
                AssetUnitCondition.GOOD,
              locationId: asset.locationId ?? null,
              notes: null,
            },
            {
              transaction: t,
            },
          );
        }
      }

      // ======================================================
      // REMOVE UNITS FOR DECREASE
      // ======================================================

      if (signedDelta < 0) {
        const unitsToRemove = Math.abs(signedDelta);

        /*
         * Never remove assigned units.
         * Remove AVAILABLE units first.
         */
        const availableUnits = await this.assetUnitModel.findAll({
          where: {
            assetId: id,
            status: AssetUnitStatus.AVAILABLE,
          },
          order: [["createdAt", "DESC"]],
          limit: unitsToRemove,
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (availableUnits.length < unitsToRemove) {
          throw new BadRequestException(
            "Not enough available physical units to reduce this inventory.",
          );
        }

        for (const unit of availableUnits) {
          await unit.destroy({
            transaction: t,
          });
        }
      }

      // ======================================================
      // INVENTORY HISTORY
      // ======================================================

      await this.inventoryHistoryModel.create(
        {
          assetId: id,
          changeType: dto.changeType,
          quantityDelta: signedDelta,
          quantityAfter: newQuantity,
          quantityAssignedAfter: assignedUnits,
          performedBy: actor.name,
          reason: dto.reason ?? null,
        } as InventoryHistory,
        {
          transaction: t,
        },
      );

      // ======================================================
      // AUDIT
      // ======================================================

      await this.audit.log(
        {
          userId: actor.id,
          action: "ASSET_INVENTORY_ADJUSTED",
          entity: "Asset",
          entityId: id,
          metadata: {
            changeType: dto.changeType,
            delta: signedDelta,
            newQuantity,
            assignedUnits,
          },
        },
        t,
      );

      return this.assetModel.findByPk(id, {
        include: this.assetInclude,
        transaction: t,
      });
    });
  }

  // ============================================================
  // INVENTORY HISTORY
  // ============================================================

  async inventoryHistory(id: string) {
    await this.findOne(id);

    return this.inventoryHistoryModel.findAll({
      where: {
        assetId: id,
      },

      order: [["createdAt", "DESC"]],
    });
  }

  // ============================================================
  // UNIT STATUS UPDATE
  //
  // This is the important new operation for:
  //
  // AVAILABLE
  // ASSIGNED
  // REPAIR
  // LOST
  // DAMAGED
  // RETIRED
  // DISPOSED
  //
  // These states belong to AssetUnit.
  // ============================================================

  async updateUnitStatus(
    assetId: string,
    unitId: string,
    status: AssetUnitStatus,
    actor: AuthUser,
    notes?: string,
  ) {
    return this.sequelize.transaction(async (t: Transaction) => {
      const unit = await this.assetUnitModel.findOne({
        where: {
          id: unitId,

          assetId,
        },

        transaction: t,

        lock: t.LOCK.UPDATE,
      });

      if (!unit) {
        throw new NotFoundException("Asset unit not found.");
      }

      const previousStatus = unit.status;

      if (previousStatus === status) {
        return unit;
      }

      // ======================================================
      // CANNOT MANUALLY MOVE ASSIGNED UNIT
      // ======================================================

      if (
        previousStatus === AssetUnitStatus.ASSIGNED &&
        status !== AssetUnitStatus.AVAILABLE
      ) {
        throw new BadRequestException(
          "An assigned asset unit must be returned before changing its status.",
        );
      }

      // ======================================================
      // TERMINAL STATES
      // ======================================================

      if (
        [AssetUnitStatus.RETIRED, AssetUnitStatus.DISPOSED].includes(status)
      ) {
        const activeAssignment = await this.assetAssignmentModel.findOne({
          where: {
            assetUnitId: unit.id,

            status: AssignmentStatus.ACTIVE,
          },

          transaction: t,
        });

        if (activeAssignment) {
          throw new BadRequestException(
            "Cannot retire or dispose an assigned asset unit. Return it first.",
          );
        }
      }

      await unit.update(
        {
          status,

          notes: notes ?? unit.notes,
        },

        {
          transaction: t,
        },
      );

      // Refresh aggregate compatibility fields.

      await this.refreshAssetAssignmentState(assetId, t);

      // History.

      await this.assetHistoryModel.create(
        {
          assetId,

          action: "UNIT_STATUS_CHANGED",

          performedBy: actor.name,

          fromValue: previousStatus,

          toValue: status,

          notes: notes ?? null,
        } as AssetHistory,

        {
          transaction: t,
        },
      );

      // Audit.

      await this.audit.log(
        {
          userId: actor.id,

          action: "ASSET_UNIT_STATUS_CHANGED",

          entity: "AssetUnit",

          entityId: unit.id,

          metadata: {
            assetId,

            unitCode: unit.unitCode ?? null,

            fromStatus: previousStatus,

            toStatus: status,
          },
        },

        t,
      );

      return unit;
    });
  }

  // ============================================================
  // UPDATE UNIT CONDITION
  // ============================================================

  async updateUnitCondition(
    assetId: string,
    unitId: string,
    condition: AssetUnitCondition,
    actor: AuthUser,
    notes?: string,
  ) {
    return this.sequelize.transaction(async (t: Transaction) => {
      const unit = await this.assetUnitModel.findOne({
        where: {
          id: unitId,
          assetId,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!unit) {
        throw new NotFoundException("Asset unit not found.");
      }

      const previousCondition = unit.condition;

      await unit.update(
        {
          condition,
          notes: notes ?? unit.notes,
        },
        {
          transaction: t,
        },
      );

      await this.assetHistoryModel.create(
        {
          assetId,
          action: "UNIT_CONDITION_CHANGED",
          performedBy: actor.name,
          fromValue: previousCondition,
          toValue: condition,
          notes: notes ?? null,
        } as AssetHistory,
        {
          transaction: t,
        },
      );

      await this.audit.log(
        {
          userId: actor.id,
          action: "ASSET_UNIT_CONDITION_CHANGED",
          entity: "AssetUnit",
          entityId: unit.id,
          metadata: {
            assetId,
            unitCode: unit.unitCode ?? null,
            fromCondition: previousCondition,
            toCondition: condition,
          },
        },
        t,
      );

      return unit;
    });
  }

  // ============================================================
  // SIGNED INVENTORY DELTA
  // ============================================================

  private signedInventoryDelta(
    changeType: InventoryChangeType,
    magnitude: number,
    direction?: "increase" | "decrease",
  ): number {
    switch (changeType) {
      case InventoryChangeType.RESTOCK:
      case InventoryChangeType.RETURNED:
        return magnitude;

      case InventoryChangeType.CONSUMED:
      case InventoryChangeType.WRITE_OFF:
        return -magnitude;

      case InventoryChangeType.ADJUSTMENT:
        return direction === "decrease" ? -magnitude : magnitude;

      case InventoryChangeType.ASSIGNED:
        /*
         * Assignment does not consume physical stock.
         * It changes custody only.
         */
        return 0;

      default:
        return 0;
    }
  }
}
