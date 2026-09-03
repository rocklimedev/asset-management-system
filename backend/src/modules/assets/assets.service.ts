import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/sequelize";
import { Sequelize } from "sequelize-typescript";
import { Op, Transaction, WhereOptions } from "sequelize";

import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../../common/decorator/current-user.decorator";

import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { AssignAssetDto } from "./dto/assign-asset.dto";
import { TransferAssetDto } from "./dto/transfer-asset.dto";

import { Asset, AssetStatus, AssetCondition } from "./models/asset.model";
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
import { Location } from "../organisation/models/location.model";
import {
  Employee,
  EmployeeStatus,
} from "../organisation/models/employees.model";

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

    @InjectModel(Organisation)
    private readonly organisationModel: typeof Organisation,

    @InjectModel(Employee)
    private readonly employeeModel: typeof Employee,

    @InjectConnection()
    private readonly sequelize: Sequelize,

    private readonly audit: AuditService,
  ) {}

  // ============================================================
  // COMMON INCLUDE
  // ============================================================

  private get assetInclude() {
    return [
      { model: Organisation, as: "organisation" },
      { model: AssetCategory, as: "category" },
      { model: Vendor, as: "vendor" },
      { model: Location, as: "location" },
      { model: SoftwareLicense, as: "license" },
      {
        model: AssetAssignment,
        as: "assignments",
        where: { status: AssignmentStatus.ACTIVE },
        required: false,
        include: [{ model: Employee, as: "employee" }],
      },
    ];
  }

  // ============================================================
  // INVENTORY LISTING
  // ============================================================

  async findAll(params: {
    search?: string;
    organisationId?: number;
    kind?: string;
    status?: string;
    condition?: string;
    categoryId?: number;
    locationId?: number;
    assigned?: "assigned" | "unassigned";
    sortBy?: "assetTag" | "name" | "purchaseDate" | "warrantyExpiry" | "status";
    sortDir?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);

    const andConditions: WhereOptions<Asset>[] = [];

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (params.search) {
      const like = { [Op.like]: `%${params.search}%` };

      andConditions.push({
        [Op.or]: [
          { assetTag: like },
          { name: like },
          { serialNumber: like },
          { manufacturer: like },
          { model: like },
          // Nested-association filters rely on the include below and
          // `$association.column$` dot-notation supported by Sequelize.
          { "$organisation.name$": like },
          { "$category.name$": like },
          { "$assignments.employee.name$": like },
        ],
      } as WhereOptions<Asset>);
    }

    // --------------------------------------------------------
    // ORGANISATION
    // --------------------------------------------------------

    if (params.organisationId) {
      andConditions.push({ organisationId: params.organisationId });
    }

    // --------------------------------------------------------
    // FILTERS
    // --------------------------------------------------------

    if (params.kind) {
      andConditions.push({ kind: params.kind as Asset["kind"] });
    }

    if (params.status) {
      andConditions.push({ status: params.status as AssetStatus });
    }

    if (params.condition) {
      andConditions.push({ condition: params.condition as AssetCondition });
    }

    if (params.categoryId) {
      andConditions.push({ categoryId: params.categoryId });
    }

    if (params.locationId) {
      andConditions.push({ locationId: params.locationId });
    }

    // --------------------------------------------------------
    // ASSIGNMENT FILTER
    // --------------------------------------------------------

    if (params.assigned === "assigned") {
      andConditions.push({ status: AssetStatus.ASSIGNED });
    }

    if (params.assigned === "unassigned") {
      andConditions.push({ status: { [Op.ne]: AssetStatus.ASSIGNED } });
    }

    const where: WhereOptions<Asset> = andConditions.length
      ? { [Op.and]: andConditions }
      : {};

    const { rows: items, count: total } = await this.assetModel.findAndCountAll(
      {
        where,
        include: this.assetInclude,
        order: [[params.sortBy ?? "assetTag", params.sortDir ?? "asc"]],
        limit: pageSize,
        offset: (page - 1) * pageSize,
        // Required with hasMany includes + limit/offset so pagination counts
        // top-level Assets rather than joined rows.
        distinct: true,
        subQuery: false,
      },
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

  async findOne(id: number) {
    const asset = await this.assetModel.findByPk(id, {
      include: this.assetInclude,
    });

    if (!asset) {
      throw new NotFoundException("Asset not found.");
    }

    return asset;
  }

  // ============================================================
  // HISTORY
  // ============================================================

  async history(id: number) {
    await this.findOne(id);

    return this.assetHistoryModel.findAll({
      where: { assetId: id },
      order: [["createdAt", "DESC"]],
    });
  }

  // ============================================================
  // CREATE
  // ============================================================

  async create(dto: CreateAssetDto, actor: AuthUser) {
    // ----------------------------------------------------------
    // ASSET TAG
    // ----------------------------------------------------------

    const existingTag = await this.assetModel.findOne({
      where: { assetTag: dto.assetTag },
    });

    if (existingTag) {
      throw new ConflictException(
        "An asset with this asset tag already exists.",
      );
    }

    // ----------------------------------------------------------
    // ORGANISATION
    // ----------------------------------------------------------

    const organisation = await this.organisationModel.findByPk(
      dto.organisationId,
    );

    if (!organisation) {
      throw new NotFoundException("Organisation not found.");
    }

    if (!organisation.isActive) {
      throw new BadRequestException(
        "Cannot create an asset for an inactive organisation.",
      );
    }

    // ----------------------------------------------------------
    // CATEGORY
    // ----------------------------------------------------------

    const category = await this.assetCategoryModel.findByPk(dto.categoryId);

    if (!category) {
      throw new NotFoundException("Asset category not found.");
    }

    if (category.organisationId !== dto.organisationId) {
      throw new BadRequestException(
        "The selected category does not belong to the selected organisation.",
      );
    }

    if (!category.isActive) {
      throw new BadRequestException(
        "Cannot create an asset using an inactive category.",
      );
    }

    // ----------------------------------------------------------
    // EMPLOYEE IF ASSIGNED DURING CREATION
    // ----------------------------------------------------------

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

      if (employee.organisationId !== dto.organisationId) {
        throw new BadRequestException(
          "Asset and employee must belong to the same organisation.",
        );
      }
    }

    // ==========================================================
    // TRANSACTION
    // ==========================================================

    return this.sequelize.transaction(async (t: Transaction) => {
      const asset = await this.assetModel.create(
        {
          name: dto.name,
          assetTag: dto.assetTag,
          kind: dto.kind,
          organisationId: dto.organisationId,
          categoryId: dto.categoryId,
          manufacturer: dto.manufacturer,
          model: dto.model,
          serialNumber: dto.serialNumber,
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
          purchasePrice: dto.purchasePrice,
          vendorId: dto.vendorId,
          invoiceNumber: dto.invoiceNumber,
          warrantyStart: dto.warrantyStart ? new Date(dto.warrantyStart) : null,
          warrantyExpiry: dto.warrantyExpiry
            ? new Date(dto.warrantyExpiry)
            : null,
          status: dto.assignEmployeeId
            ? AssetStatus.ASSIGNED
            : (dto.status ?? AssetStatus.AVAILABLE),
          condition: dto.condition ?? AssetCondition.GOOD,
          locationId: dto.locationId,
          notes: dto.notes,
        } as Asset,
        { transaction: t },
      );

      // --------------------------------------------------------
      // SOFTWARE LICENSE
      // --------------------------------------------------------

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
            cost: dto.purchasePrice,
          } as SoftwareLicense,
          { transaction: t },
        );
      }

      // --------------------------------------------------------
      // CREATED HISTORY
      // --------------------------------------------------------

      await this.assetHistoryModel.create(
        {
          assetId: asset.id,
          action: "CREATED",
          performedBy: actor.name,
          toValue: asset.status,
        } as AssetHistory,
        { transaction: t },
      );

      // --------------------------------------------------------
      // INITIAL ASSIGNMENT
      // --------------------------------------------------------

      if (dto.assignEmployeeId && employee) {
        await this.assetAssignmentModel.create(
          {
            assetId: asset.id,
            employeeId: dto.assignEmployeeId,
            assignedBy: actor.id,
          } as AssetAssignment,
          { transaction: t },
        );

        await this.assetHistoryModel.create(
          {
            assetId: asset.id,
            action: "ASSIGNED",
            performedBy: actor.name,
            toValue: employee.name,
          } as AssetHistory,
          { transaction: t },
        );
      }

      // --------------------------------------------------------
      // AUDIT
      // --------------------------------------------------------

      await this.audit.log(
        {
          userId: actor.id,
          action: "ASSET_CREATED",
          entity: "Asset",
          entityId: asset.id.toString(),
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

  async update(id: number, dto: UpdateAssetDto, actor: AuthUser) {
    const existing = await this.findOne(id);

    // ----------------------------------------------------------
    // ORGANISATION VALIDATION
    // ----------------------------------------------------------

    const organisationId = dto.organisationId ?? existing.organisationId;

    if (dto.organisationId && dto.organisationId !== existing.organisationId) {
      const organisation = await this.organisationModel.findByPk(
        dto.organisationId,
      );

      if (!organisation) {
        throw new NotFoundException("Organisation not found.");
      }

      if (!organisation.isActive) {
        throw new BadRequestException(
          "Cannot move an asset to an inactive organisation.",
        );
      }
    }

    // ----------------------------------------------------------
    // CATEGORY VALIDATION
    // ----------------------------------------------------------

    if (dto.categoryId !== undefined || dto.organisationId !== undefined) {
      const categoryId = dto.categoryId ?? existing.categoryId;

      const category = await this.assetCategoryModel.findByPk(categoryId);

      if (!category) {
        throw new NotFoundException("Asset category not found.");
      }

      if (category.organisationId !== organisationId) {
        throw new BadRequestException(
          "The selected category does not belong to the selected organisation.",
        );
      }

      if (!category.isActive) {
        throw new BadRequestException("Cannot use an inactive category.");
      }
    }

    // ----------------------------------------------------------
    // SERIAL NUMBER
    // ----------------------------------------------------------

    if (dto.serialNumber && dto.serialNumber !== existing.serialNumber) {
      const duplicate = await this.assetModel.findOne({
        where: {
          serialNumber: dto.serialNumber,
          id: { [Op.ne]: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          "An asset with this serial number already exists.",
        );
      }
    }

    // ----------------------------------------------------------
    // ASSET TAG
    // ----------------------------------------------------------

    if (dto.assetTag && dto.assetTag !== existing.assetTag) {
      const duplicate = await this.assetModel.findOne({
        where: {
          assetTag: dto.assetTag,
          id: { [Op.ne]: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          "An asset with this asset tag already exists.",
        );
      }
    }

    // ==========================================================
    // TRANSACTION
    // ==========================================================

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
      if (dto.serialNumber !== undefined)
        updateData.serialNumber = dto.serialNumber;
      if (dto.purchaseDate !== undefined)
        updateData.purchaseDate = dto.purchaseDate
          ? new Date(dto.purchaseDate)
          : null;
      if (dto.purchasePrice !== undefined)
        updateData.purchasePrice = dto.purchasePrice;
      if (dto.vendorId !== undefined) updateData.vendorId = dto.vendorId;
      if (dto.invoiceNumber !== undefined)
        updateData.invoiceNumber = dto.invoiceNumber;
      if (dto.warrantyStart !== undefined)
        updateData.warrantyStart = dto.warrantyStart
          ? new Date(dto.warrantyStart)
          : null;
      if (dto.warrantyExpiry !== undefined)
        updateData.warrantyExpiry = dto.warrantyExpiry
          ? new Date(dto.warrantyExpiry)
          : null;
      if (dto.status !== undefined) updateData.status = dto.status;
      if (dto.condition !== undefined) updateData.condition = dto.condition;
      if (dto.locationId !== undefined) updateData.locationId = dto.locationId;
      if (dto.notes !== undefined) updateData.notes = dto.notes;

      await this.assetModel.update(updateData, {
        where: { id },
        transaction: t,
      });

      // --------------------------------------------------------
      // STATUS HISTORY
      // --------------------------------------------------------

      if (dto.status && dto.status !== existing.status) {
        await this.assetHistoryModel.create(
          {
            assetId: id,
            action: "STATUS_CHANGED",
            performedBy: actor.name,
            fromValue: existing.status,
            toValue: dto.status,
          } as AssetHistory,
          { transaction: t },
        );
      }

      // --------------------------------------------------------
      // AUDIT
      // --------------------------------------------------------

      await this.audit.log(
        {
          userId: actor.id,
          action: "ASSET_EDITED",
          entity: "Asset",
          entityId: id.toString(),
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

  async assign(id: number, dto: AssignAssetDto, actor: AuthUser) {
    const asset = await this.findOne(id);

    // ----------------------------------------------------------
    // STATUS VALIDATION
    // ----------------------------------------------------------

    if (asset.status === AssetStatus.ASSIGNED) {
      throw new BadRequestException(
        "This asset is already assigned. Use transfer instead.",
      );
    }

    if (NON_TRANSFERABLE_STATUSES.includes(asset.status)) {
      throw new BadRequestException(
        `Assets with status ${asset.status} cannot be assigned.`,
      );
    }

    // ----------------------------------------------------------
    // EMPLOYEE
    // ----------------------------------------------------------

    const employee = await this.employeeModel.findByPk(dto.employeeId);

    if (!employee) {
      throw new NotFoundException("Employee not found.");
    }

    if (employee.status === EmployeeStatus.EXITED) {
      throw new BadRequestException(
        "Cannot assign an asset to an employee who has exited.",
      );
    }

    // ----------------------------------------------------------
    // ORGANISATION MATCH
    // ----------------------------------------------------------

    if (asset.organisationId !== employee.organisationId) {
      throw new BadRequestException(
        "Asset and employee must belong to the same organisation.",
      );
    }

    // ==========================================================
    // TRANSACTION
    // ==========================================================

    return this.sequelize.transaction(async (t: Transaction) => {
      await this.assetAssignmentModel.create(
        {
          assetId: id,
          employeeId: dto.employeeId,
          assignedBy: actor.id,
          notes: dto.notes,
        } as AssetAssignment,
        { transaction: t },
      );

      await this.assetModel.update(
        { status: AssetStatus.ASSIGNED },
        { where: { id }, transaction: t },
      );

      await this.assetHistoryModel.create(
        {
          assetId: id,
          action: "ASSIGNED",
          performedBy: actor.name,
          toValue: employee.name,
          notes: dto.notes,
        } as AssetHistory,
        { transaction: t },
      );

      await this.audit.log(
        {
          userId: actor.id,
          action: "ASSET_ASSIGNED",
          entity: "Asset",
          entityId: id.toString(),
          metadata: { employeeId: dto.employeeId },
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

  async transfer(id: number, dto: TransferAssetDto, actor: AuthUser) {
    const asset = await this.findOne(id);

    // ----------------------------------------------------------
    // STATUS
    // ----------------------------------------------------------

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
      asset.assignments.length === 0
    ) {
      throw new BadRequestException(
        "This asset is not currently assigned to anyone.",
      );
    }

    // ----------------------------------------------------------
    // CURRENT ASSIGNMENT
    // ----------------------------------------------------------

    const currentAssignment = asset.assignments[0];
    const fromEmployeeId = currentAssignment.employeeId;

    if (fromEmployeeId === dto.toEmployeeId) {
      throw new BadRequestException(
        "Cannot transfer an asset to its current owner.",
      );
    }

    // ----------------------------------------------------------
    // DESTINATION EMPLOYEE
    // ----------------------------------------------------------

    const toEmployee = await this.employeeModel.findByPk(dto.toEmployeeId);

    if (!toEmployee) {
      throw new NotFoundException("Destination employee not found.");
    }

    if (toEmployee.status === EmployeeStatus.EXITED) {
      throw new BadRequestException(
        "Cannot transfer an asset to an employee who has exited.",
      );
    }

    // ----------------------------------------------------------
    // ORGANISATION MATCH
    // ----------------------------------------------------------

    if (toEmployee.organisationId !== asset.organisationId) {
      throw new BadRequestException(
        "Asset and destination employee must belong to the same organisation.",
      );
    }

    // ----------------------------------------------------------
    // CURRENT EMPLOYEE
    // ----------------------------------------------------------

    const fromEmployee = await this.employeeModel.findByPk(fromEmployeeId);

    // ==========================================================
    // TRANSACTION
    // ==========================================================

    return this.sequelize.transaction(async (t: Transaction) => {
      // ------------------------------------------------------
      // 1. CLOSE CURRENT ASSIGNMENT
      // ------------------------------------------------------

      await this.assetAssignmentModel.update(
        { status: AssignmentStatus.RETURNED, returnedAt: new Date() },
        { where: { id: currentAssignment.id }, transaction: t },
      );

      // ------------------------------------------------------
      // 2. CREATE NEW ASSIGNMENT
      // ------------------------------------------------------

      await this.assetAssignmentModel.create(
        {
          assetId: id,
          employeeId: dto.toEmployeeId,
          assignedBy: actor.id,
          notes: dto.notes,
        } as AssetAssignment,
        { transaction: t },
      );

      // ------------------------------------------------------
      // 3. TRANSFER RECORD
      // ------------------------------------------------------

      const transfer = await this.assetTransferModel.create(
        {
          assetId: id,
          fromEmployeeId,
          toEmployeeId: dto.toEmployeeId,
          requestedById: actor.id,
          approvedById: actor.id,
          status: TransferStatus.COMPLETED,
          reason: dto.reason ?? "Employee transfer",
          notes: dto.notes,
          approvedAt: new Date(),
        } as AssetTransfer,
        { transaction: t },
      );

      // ------------------------------------------------------
      // 4. KEEP ASSET ASSIGNED
      // ------------------------------------------------------

      await this.assetModel.update(
        { status: AssetStatus.ASSIGNED },
        { where: { id }, transaction: t },
      );

      const updatedAsset = await this.assetModel.findByPk(id, {
        transaction: t,
      });

      // ------------------------------------------------------
      // 5. HISTORY
      // ------------------------------------------------------

      await this.assetHistoryModel.create(
        {
          assetId: id,
          action: "TRANSFERRED",
          performedBy: actor.name,
          fromValue: fromEmployee?.name ?? "Unassigned",
          toValue: toEmployee.name,
          notes: dto.notes,
        } as AssetHistory,
        { transaction: t },
      );

      // ------------------------------------------------------
      // 6. AUDIT
      // ------------------------------------------------------

      await this.audit.log(
        {
          userId: actor.id,
          action: "ASSET_TRANSFERRED",
          entity: "Asset",
          entityId: id.toString(),
          metadata: {
            fromEmployeeId,
            toEmployeeId: dto.toEmployeeId,
            transferId: transfer.id,
          },
        },
        t,
      );

      return {
        asset: updatedAsset,
        transfer,
        message: `Asset successfully transferred from ${
          fromEmployee?.name ?? "Unassigned"
        } to ${toEmployee.name}.`,
      };
    });
  }

  // ============================================================
  // RETURN ASSET
  // ============================================================

  async returnAsset(id: number, actor: AuthUser, notes?: string) {
    const asset = await this.findOne(id);

    if (
      asset.status !== AssetStatus.ASSIGNED ||
      asset.assignments.length === 0
    ) {
      throw new BadRequestException("This asset is not currently assigned.");
    }

    const assignment = asset.assignments[0];

    return this.sequelize.transaction(async (t: Transaction) => {
      // ------------------------------------------------------
      // CLOSE ASSIGNMENT
      // ------------------------------------------------------

      await this.assetAssignmentModel.update(
        {
          status: AssignmentStatus.RETURNED,
          returnedAt: new Date(),
          notes,
        },
        { where: { id: assignment.id }, transaction: t },
      );

      // ------------------------------------------------------
      // MAKE AVAILABLE / UNASSIGNED
      // ------------------------------------------------------

      await this.assetModel.update(
        { status: AssetStatus.AVAILABLE },
        { where: { id }, transaction: t },
      );

      // ------------------------------------------------------
      // HISTORY
      // ------------------------------------------------------

      await this.assetHistoryModel.create(
        {
          assetId: id,
          action: "RETURNED",
          performedBy: actor.name,
          fromValue: assignment.employee.name,
          toValue: "Unassigned",
          notes,
        } as AssetHistory,
        { transaction: t },
      );

      // ------------------------------------------------------
      // AUDIT
      // ------------------------------------------------------

      await this.audit.log(
        {
          userId: actor.id,
          action: "ASSET_RETURNED",
          entity: "Asset",
          entityId: id.toString(),
        },
        t,
      );

      return this.assetModel.findByPk(id, {
        include: this.assetInclude,
        transaction: t,
      });
    });
  }
}
