import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(dto: CreateCategoryDto) {
    const organisation = await this.prisma.organisation.findUnique({
      where: {
        id: dto.organisationId,
      },
    });

    if (!organisation) {
      throw new NotFoundException("Organisation not found");
    }

    const existing = await this.prisma.category.findFirst({
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

    return this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
        organisationId: dto.organisationId,
        isActive: dto.isActive ?? true,
      },

      include: {
        organisation: true,
      },
    });
  }

  // ==========================================================
  // FIND ALL
  // ==========================================================

  async findAll(organisationId?: string) {
    return this.prisma.category.findMany({
      where: organisationId
        ? {
            organisationId,
          }
        : undefined,

      orderBy: {
        name: "asc",
      },

      include: {
        organisation: true,

        _count: {
          select: {
            assets: true,
            inventory: true,
          },
        },
      },
    });
  }

  // ==========================================================
  // FIND ONE
  // ==========================================================

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: {
        id,
      },

      include: {
        organisation: true,

        _count: {
          select: {
            assets: true,
            inventory: true,
          },
        },
      },
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
    const existing = await this.prisma.category.findUnique({
      where: {
        id,
      },
    });

    if (!existing) {
      throw new NotFoundException("Category not found");
    }

    const organisationId = dto.organisationId ?? existing.organisationId;

    if (dto.organisationId) {
      const organisation = await this.prisma.organisation.findUnique({
        where: {
          id: dto.organisationId,
        },
      });

      if (!organisation) {
        throw new NotFoundException("Organisation not found");
      }
    }

    if (dto.name) {
      const duplicate = await this.prisma.category.findFirst({
        where: {
          organisationId,
          name: dto.name,

          NOT: {
            id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          "Category already exists in this organisation",
        );
      }
    }

    return this.prisma.category.update({
      where: {
        id,
      },

      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.organisationId !== undefined && {
          organisationId: dto.organisationId,
        }),

        ...(dto.isActive !== undefined && {
          isActive: dto.isActive,
        }),
      },

      include: {
        organisation: true,
      },
    });
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.category.delete({
      where: {
        id,
      },
    });
  }
}
