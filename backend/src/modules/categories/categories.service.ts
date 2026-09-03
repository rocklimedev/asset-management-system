import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/sequelize";

import { Category } from "./category.model";
import { Organisation } from "../organisations/organisation.model";

import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category)
    private readonly categoryModel: typeof Category,

    @InjectModel(Organisation)
    private readonly organisationModel: typeof Organisation,
  ) {}

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(dto: CreateCategoryDto) {
    // --------------------------------------------------------
    // Check organisation
    // --------------------------------------------------------

    const organisation = await this.organisationModel.findByPk(
      dto.organisationId,
    );

    if (!organisation) {
      throw new NotFoundException("Organisation not found");
    }

    // --------------------------------------------------------
    // Check duplicate
    // --------------------------------------------------------

    const existing = await this.categoryModel.findOne({
      where: {
        organisationId: dto.organisationId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        "Category already exists in this organisation",
      );
    }

    // --------------------------------------------------------
    // Create category
    // --------------------------------------------------------

    return this.categoryModel.create(
      {
        name: dto.name,
        description: dto.description ?? null,
        organisationId: dto.organisationId,
        isActive: dto.isActive ?? true,
      },
      {
        include: [
          {
            model: Organisation,
          },
        ],
      },
    );
  }

  // ==========================================================
  // FIND ALL
  // ==========================================================

  async findAll(organisationId?: string) {
    const where: any = {};

    if (organisationId) {
      where.organisationId = organisationId;
    }

    return this.categoryModel.findAll({
      where,

      order: [["name", "ASC"]],

      include: [
        {
          model: Organisation,
        },
      ],
    });
  }

  // ==========================================================
  // FIND ONE
  // ==========================================================

  async findOne(id: string) {
    const category = await this.categoryModel.findByPk(id, {
      include: [
        {
          model: Organisation,
        },
      ],
    });

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return category;
  }

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(id: string, dto: UpdateCategoryDto) {
    // --------------------------------------------------------
    // Find existing category
    // --------------------------------------------------------

    const existing = await this.categoryModel.findByPk(id);

    if (!existing) {
      throw new NotFoundException("Category not found");
    }

    // --------------------------------------------------------
    // Determine organisation
    // --------------------------------------------------------

    const organisationId = dto.organisationId ?? existing.organisationId;

    // --------------------------------------------------------
    // Check organisation if changed
    // --------------------------------------------------------

    if (dto.organisationId) {
      const organisation = await this.organisationModel.findByPk(
        dto.organisationId,
      );

      if (!organisation) {
        throw new NotFoundException("Organisation not found");
      }
    }

    // --------------------------------------------------------
    // Check duplicate category name
    // --------------------------------------------------------

    if (dto.name !== undefined) {
      const duplicate = await this.categoryModel.findOne({
        where: {
          organisationId,
          name: dto.name,
        },
      });

      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          "Category already exists in this organisation",
        );
      }
    }

    // --------------------------------------------------------
    // Update
    // --------------------------------------------------------

    const updateData: Partial<Category> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.organisationId !== undefined) {
      updateData.organisationId = dto.organisationId;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    await existing.update(updateData);

    // Return updated record with organisation
    return this.categoryModel.findByPk(id, {
      include: [
        {
          model: Organisation,
        },
      ],
    });
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  async remove(id: string) {
    const category = await this.findOne(id);

    await category.destroy();

    return {
      message: "Category deleted successfully",
    };
  }
}
