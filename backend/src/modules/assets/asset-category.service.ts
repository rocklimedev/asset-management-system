import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";

import { AssetCategory, AssetKind } from "./models/asset-category.model";

interface CreateAssetCategoryDto {
  name: string;
  description?: string | null;
  type: AssetKind;
  organisationId?: string | null;
  isActive?: boolean;
}

interface UpdateAssetCategoryDto {
  name?: string;
  description?: string | null;
  type?: AssetKind;
  isActive?: boolean;
}

@Injectable()
export class AssetCategoryService {
  constructor(
    @InjectModel(AssetCategory)
    private readonly assetCategoryModel: typeof AssetCategory,
  ) {}

  // ============================================================
  // CREATE
  // ============================================================

  async create(dto: CreateAssetCategoryDto): Promise<AssetCategory> {
    const name = dto.name?.trim();

    if (!name) {
      throw new BadRequestException("Category name is required");
    }

    if (!Object.values(AssetKind).includes(dto.type)) {
      throw new BadRequestException(
        `Invalid asset type. Allowed values: ${Object.values(AssetKind).join(
          ", ",
        )}`,
      );
    }

    const existing = await this.assetCategoryModel.findOne({
      where: {
        name,
        type: dto.type,
        organisationId: dto.organisationId ?? null,
      },
    });

    if (existing) {
      throw new ConflictException(
        "An asset category with this name and type already exists",
      );
    }

    return this.assetCategoryModel.create({
      name,
      description: dto.description?.trim() || null,
      type: dto.type,
      organisationId: dto.organisationId ?? null,
      isActive: dto.isActive ?? true,
    });
  }

  // ============================================================
  // FIND ALL
  // ============================================================

  async findAll(options?: {
    organisationId?: string;
    type?: AssetKind;
    isActive?: boolean;
  }): Promise<AssetCategory[]> {
    const where: Record<string, unknown> = {};

    if (options?.organisationId) {
      where.organisationId = options.organisationId;
    }

    if (options?.type) {
      if (!Object.values(AssetKind).includes(options.type)) {
        throw new BadRequestException(
          `Invalid asset type. Allowed values: ${Object.values(AssetKind).join(
            ", ",
          )}`,
        );
      }

      where.type = options.type;
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return this.assetCategoryModel.findAll({
      where,
      include: [
        {
          association: "assets",
          required: false,
        },
      ],
      order: [["name", "ASC"]],
    });
  }

  // ============================================================
  // FIND ONE
  // ============================================================

  async findOne(id: string): Promise<AssetCategory> {
    const category = await this.assetCategoryModel.findByPk(id, {
      include: [
        {
          association: "assets",
          required: false,
        },
      ],
    });

    if (!category) {
      throw new NotFoundException(`Asset category with ID "${id}" not found`);
    }

    return category;
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async update(
    id: string,
    dto: UpdateAssetCategoryDto,
  ): Promise<AssetCategory> {
    const category = await this.assetCategoryModel.findByPk(id);

    if (!category) {
      throw new NotFoundException(`Asset category with ID "${id}" not found`);
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (!name) {
        throw new BadRequestException("Category name cannot be empty");
      }

      dto.name = name;
    }

    if (
      dto.type !== undefined &&
      !Object.values(AssetKind).includes(dto.type)
    ) {
      throw new BadRequestException(
        `Invalid asset type. Allowed values: ${Object.values(AssetKind).join(
          ", ",
        )}`,
      );
    }

    // Check duplicate only when name/type changes
    if (dto.name !== undefined || dto.type !== undefined) {
      const name = dto.name ?? category.name;
      const type = dto.type ?? category.type;

      const existing = await this.assetCategoryModel.findOne({
        where: {
          name,
          type,
          organisationId: category.organisationId,
        },
      });

      if (existing && existing.id !== category.id) {
        throw new ConflictException(
          "An asset category with this name and type already exists",
        );
      }
    }

    await category.update({
      ...(dto.name !== undefined && {
        name: dto.name,
      }),
      ...(dto.description !== undefined && {
        description: dto.description?.trim() || null,
      }),
      ...(dto.type !== undefined && {
        type: dto.type,
      }),
      ...(dto.isActive !== undefined && {
        isActive: dto.isActive,
      }),
    });

    return this.findOne(category.id);
  }

  // ============================================================
  // DELETE
  // ============================================================

  async remove(id: string): Promise<{ message: string }> {
    const category = await this.assetCategoryModel.findByPk(id, {
      include: [
        {
          association: "assets",
          required: false,
        },
      ],
    });

    if (!category) {
      throw new NotFoundException(`Asset category with ID "${id}" not found`);
    }

    if (category.assets && category.assets.length > 0) {
      throw new ConflictException(
        "Cannot delete this category because assets are assigned to it",
      );
    }

    await category.destroy();

    return {
      message: "Asset category deleted successfully",
    };
  }

  // ============================================================
  // SOFT DELETE / TOGGLE ACTIVE
  // ============================================================

  async toggleActive(id: string): Promise<AssetCategory> {
    const category = await this.assetCategoryModel.findByPk(id);

    if (!category) {
      throw new NotFoundException(`Asset category with ID "${id}" not found`);
    }

    await category.update({
      isActive: !category.isActive,
    });

    return category;
  }
}
