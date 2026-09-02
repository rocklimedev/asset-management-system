import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../auth/current-user.decorator";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { AssignAssetDto } from "./dto/assign-asset.dto";
import { TransferAssetDto } from "./dto/transfer-asset.dto";

const NON_TRANSFERABLE_STATUSES = ["RETIRED", "LOST", "DISPOSED"];

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private assetInclude = {
    category: true,
    vendor: true,
    location: true,
    license: true,
    assignments: {
      where: { status: "ACTIVE" as const },
      include: { employee: true },
    },
  } satisfies Prisma.AssetInclude;

  // ---------------- Inventory listing (search/filter/sort/paginate) ----------------
  async findAll(params: {
    search?: string;
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
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 25, 100);

    const where: Prisma.AssetWhereInput = {
      AND: [
        params.search
          ? {
              OR: [
                { assetTag: { contains: params.search } },
                { name: { contains: params.search } },
                { serialNumber: { contains: params.search } },
                { manufacturer: { contains: params.search } },
                {
                  assignments: {
                    some: {
                      status: "ACTIVE",
                      employee: { name: { contains: params.search } },
                    },
                  },
                },
              ],
            }
          : {},
        params.kind ? { kind: params.kind as any } : {},
        params.status ? { status: params.status as any } : {},
        params.condition ? { condition: params.condition as any } : {},
        params.categoryId ? { categoryId: params.categoryId } : {},
        params.locationId ? { locationId: params.locationId } : {},
        params.assigned === "assigned" ? { status: "ASSIGNED" } : {},
        params.assigned === "unassigned" ? { status: { not: "ASSIGNED" } } : {},
      ],
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        include: this.assetInclude,
        orderBy: { [params.sortBy ?? "assetTag"]: params.sortDir ?? "asc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: number) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: this.assetInclude,
    });
    if (!asset) throw new NotFoundException("Asset not found.");
    return asset;
  }

  async history(id: number) {
    await this.findOne(id);
    return this.prisma.assetHistory.findMany({
      where: { assetId: id },
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------------- Create / Update ----------------
  async create(dto: CreateAssetDto, actor: AuthUser) {
    const existingTag = await this.prisma.asset.findUnique({
      where: { assetTag: dto.assetTag },
    });
    if (existingTag)
      throw new ConflictException(
        "An asset with this asset tag already exists.",
      );

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          name: dto.name,
          assetTag: dto.assetTag,
          kind: dto.kind,
          categoryId: dto.categoryId,
          manufacturer: dto.manufacturer,
          model: dto.model,
          serialNumber: dto.serialNumber,
          purchaseDate: dto.purchaseDate
            ? new Date(dto.purchaseDate)
            : undefined,
          purchasePrice: dto.purchasePrice,
          vendorId: dto.vendorId,
          invoiceNumber: dto.invoiceNumber,
          warrantyStart: dto.warrantyStart
            ? new Date(dto.warrantyStart)
            : undefined,
          warrantyExpiry: dto.warrantyExpiry
            ? new Date(dto.warrantyExpiry)
            : undefined,
          status: dto.assignEmployeeId
            ? "ASSIGNED"
            : (dto.status ?? "AVAILABLE"),
          condition: dto.condition ?? "GOOD",
          locationId: dto.locationId,
          notes: dto.notes,
        },
      });

      if (dto.kind === "SOFTWARE" && dto.licenseVendor) {
        await tx.softwareLicense.create({
          data: {
            assetId: asset.id,
            vendor: dto.licenseVendor,
            licenseType: dto.licenseType ?? "Subscription",
            licenseReference: dto.licenseReference ?? "",
            totalSeats: dto.totalSeats ?? 1,
            assignedSeats: dto.assignEmployeeId ? 1 : 0,
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
            renewalDate: dto.renewalDate
              ? new Date(dto.renewalDate)
              : undefined,
          },
        });
      }

      await tx.assetHistory.create({
        data: {
          assetId: asset.id,
          action: "CREATED",
          performedBy: actor.name,
          toValue: asset.status,
        },
      });

      if (dto.assignEmployeeId) {
        await tx.assetAssignment.create({
          data: {
            assetId: asset.id,
            employeeId: dto.assignEmployeeId,
            assignedBy: actor.id,
          },
        });
        await tx.assetHistory.create({
          data: {
            assetId: asset.id,
            action: "ASSIGNED",
            performedBy: actor.name,
            toValue: `Employee #${dto.assignEmployeeId}`,
          },
        });
      }

      await this.audit.log(
        {
          userId: actor.id,
          action: "ASSET_CREATED",
          entity: "Asset",
          entityId: asset.id,
        },
        tx,
      );

      return asset;
    });
  }

  async update(id: number, dto: UpdateAssetDto, actor: AuthUser) {
    const existing = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id },
        data: {
          ...dto,
          purchaseDate: dto.purchaseDate
            ? new Date(dto.purchaseDate)
            : undefined,
          warrantyStart: dto.warrantyStart
            ? new Date(dto.warrantyStart)
            : undefined,
          warrantyExpiry: dto.warrantyExpiry
            ? new Date(dto.warrantyExpiry)
            : undefined,
          expiryDate: undefined,
        } as any,
      });

      if (dto.status && dto.status !== existing.status) {
        await tx.assetHistory.create({
          data: {
            assetId: id,
            action: "STATUS_CHANGED",
            performedBy: actor.name,
            fromValue: existing.status,
            toValue: dto.status,
          },
        });
      }

      await this.audit.log(
        {
          userId: actor.id,
          action: "ASSET_EDITED",
          entity: "Asset",
          entityId: id,
          metadata: dto as any,
        },
        tx,
      );

      return asset;
    });
  }

  // ---------------- Assign (asset currently unowned -> employee) ----------------
  async assign(id: number, dto: AssignAssetDto, actor: AuthUser) {
    const asset = await this.findOne(id);
    if (asset.status === "ASSIGNED") {
      throw new BadRequestException(
        "This asset is already assigned. Use transfer instead.",
      );
    }
    if (NON_TRANSFERABLE_STATUSES.includes(asset.status)) {
      throw new BadRequestException(
        `Assets with status ${asset.status} cannot be assigned.`,
      );
    }
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) throw new NotFoundException("Employee not found.");

    return this.prisma.$transaction(async (tx) => {
      await tx.assetAssignment.create({
        data: {
          assetId: id,
          employeeId: dto.employeeId,
          assignedBy: actor.id,
          notes: dto.notes,
        },
      });
      const updated = await tx.asset.update({
        where: { id },
        data: { status: "ASSIGNED" },
      });
      await tx.assetHistory.create({
        data: {
          assetId: id,
          action: "ASSIGNED",
          performedBy: actor.name,
          toValue: employee.name,
          notes: dto.notes,
        },
      });
      await this.audit.log(
        {
          userId: actor.id,
          action: "ASSET_ASSIGNED",
          entity: "Asset",
          entityId: id,
          metadata: { employeeId: dto.employeeId },
        },
        tx,
      );
      return updated;
    });
  }

  // ---------------- Transfer (the hero workflow — drag & drop lands here) ----------------
  // Rules enforced server-side regardless of what the frontend already checked:
  //  - asset must currently be assigned
  //  - destination employee must exist and differ from the source
  //  - retired / lost / disposed assets can never be transferred
  //  - assets under repair require an explicit allowUnderRepair flag (not exposed in UI by default)
  async transfer(id: number, dto: TransferAssetDto, actor: AuthUser) {
    const asset = await this.findOne(id);

    if (NON_TRANSFERABLE_STATUSES.includes(asset.status)) {
      throw new BadRequestException(
        `${asset.status.charAt(0) + asset.status.slice(1).toLowerCase()} assets cannot be transferred.`,
      );
    }
    if (asset.status === "REPAIR") {
      throw new BadRequestException(
        "Assets currently under repair cannot be transferred.",
      );
    }
    if (asset.status !== "ASSIGNED" || asset.assignments.length === 0) {
      throw new BadRequestException(
        "This asset is not currently assigned to anyone.",
      );
    }

    const currentAssignment = asset.assignments[0];
    const fromEmployeeId = currentAssignment.employeeId;

    if (fromEmployeeId === dto.toEmployeeId) {
      throw new BadRequestException(
        "Cannot transfer an asset to its current owner.",
      );
    }

    const toEmployee = await this.prisma.employee.findUnique({
      where: { id: dto.toEmployeeId },
    });
    if (!toEmployee)
      throw new NotFoundException("Destination employee not found.");
    if (toEmployee.status === "EXITED") {
      throw new BadRequestException(
        "Cannot transfer an asset to an employee who has exited.",
      );
    }

    const fromEmployee = await this.prisma.employee.findUnique({
      where: { id: fromEmployeeId },
    });

    return this.prisma.$transaction(async (tx) => {
      // 1. close current assignment
      await tx.assetAssignment.update({
        where: { id: currentAssignment.id },
        data: { status: "RETURNED", returnedAt: new Date() },
      });

      // 2. open new assignment
      await tx.assetAssignment.create({
        data: {
          assetId: id,
          employeeId: dto.toEmployeeId,
          assignedBy: actor.id,
          notes: dto.notes,
        },
      });

      // 3. transfer record
      const transfer = await tx.assetTransfer.create({
        data: {
          assetId: id,
          fromEmployeeId,
          toEmployeeId: dto.toEmployeeId,
          requestedById: actor.id,
          approvedById: actor.id,
          status: "COMPLETED",
          reason: dto.reason ?? "Employee transfer",
          notes: dto.notes,
          approvedAt: new Date(),
        },
      });

      // 4. asset status stays ASSIGNED, but touch updatedAt
      const updatedAsset = await tx.asset.update({
        where: { id },
        data: { status: "ASSIGNED" },
      });

      // 5. history record
      await tx.assetHistory.create({
        data: {
          assetId: id,
          action: "TRANSFERRED",
          performedBy: actor.name,
          fromValue: fromEmployee?.name ?? "Unassigned",
          toValue: toEmployee.name,
          notes: dto.notes,
        },
      });

      // 6. audit log
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
          },
        },
        tx,
      );

      // 7. (notification hook — see NotificationsService extension point)

      return {
        asset: updatedAsset,
        transfer,
        message: `Asset successfully transferred from ${fromEmployee?.name ?? "Unassigned"} to ${toEmployee.name}.`,
      };
    });
  }

  async returnAsset(id: number, actor: AuthUser, notes?: string) {
    const asset = await this.findOne(id);
    if (asset.status !== "ASSIGNED" || asset.assignments.length === 0) {
      throw new BadRequestException("This asset is not currently assigned.");
    }
    const assignment = asset.assignments[0];

    return this.prisma.$transaction(async (tx) => {
      await tx.assetAssignment.update({
        where: { id: assignment.id },
        data: { status: "RETURNED", returnedAt: new Date(), notes },
      });
      const updated = await tx.asset.update({
        where: { id },
        data: { status: "AVAILABLE" },
      });
      await tx.assetHistory.create({
        data: {
          assetId: id,
          action: "RETURNED",
          performedBy: actor.name,
          notes,
        },
      });
      await this.audit.log(
        {
          userId: actor.id,
          action: "ASSET_RETURNED",
          entity: "Asset",
          entityId: id,
        },
        tx,
      );
      return updated;
    });
  }
}
