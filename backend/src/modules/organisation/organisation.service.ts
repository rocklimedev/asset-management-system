import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

import { CreateOrganisationDto } from "./dto/create-organisation.dto";
import { UpdateOrganisationDto } from "./dto/update-organisation.dto";

@Injectable()
export class OrganisationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(dto: CreateOrganisationDto) {
    const existing = await this.prisma.organisation.findUnique({
      where: {
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException("Organisation already exists");
    }

    if (dto.code) {
      const existingCode = await this.prisma.organisation.findUnique({
        where: {
          code: dto.code,
        },
      });

      if (existingCode) {
        throw new ConflictException("Organisation code already exists");
      }
    }

    return this.prisma.organisation.create({
      data: {
        name: dto.name,
        code: dto.code,
        isActive: dto.isActive ?? true,
      },
    });
  }

  // ==========================================================
  // FIND ALL
  // ==========================================================

  async findAll() {
    return this.prisma.organisation.findMany({
      orderBy: {
        name: "asc",
      },

      include: {
        _count: {
          select: {
            categories: true,
            assets: true,
            holders: true,
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
    const organisation = await this.prisma.organisation.findUnique({
      where: {
        id,
      },

      include: {
        categories: {
          orderBy: {
            name: "asc",
          },
        },

        _count: {
          select: {
            assets: true,
            holders: true,
            inventory: true,
          },
        },
      },
    });

    if (!organisation) {
      throw new NotFoundException("Organisation not found");
    }

    return organisation;
  }

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(id: string, dto: UpdateOrganisationDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.organisation.findFirst({
        where: {
          name: dto.name,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException("Organisation name already exists");
      }
    }

    if (dto.code) {
      const existing = await this.prisma.organisation.findFirst({
        where: {
          code: dto.code,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException("Organisation code already exists");
      }
    }

    return this.prisma.organisation.update({
      where: {
        id,
      },

      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.code !== undefined && {
          code: dto.code,
        }),

        ...(dto.isActive !== undefined && {
          isActive: dto.isActive,
        }),
      },
    });
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.organisation.delete({
      where: {
        id,
      },
    });
  }
}
