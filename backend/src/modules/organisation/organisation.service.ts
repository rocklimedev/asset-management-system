import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op } from "sequelize";

import { CreateOrganisationDto } from "./dto/create-organisation.dto";
import { UpdateOrganisationDto } from "./dto/update-organisation.dto";

import { Organisation } from "./models/organisation.model";
import { AssetCategory } from "@/modules/assets/models/asset-category.model";
import { Asset } from "@/modules/assets/models/asset.model";
import { Employee } from "./models/employees.model";

@Injectable()
export class OrganisationsService {
  constructor(
    @InjectModel(Organisation)
    private readonly organisationModel: typeof Organisation,

    @InjectModel(AssetCategory)
    private readonly assetCategoryModel: typeof AssetCategory,

    @InjectModel(Asset)
    private readonly assetModel: typeof Asset,

    @InjectModel(Employee)
    private readonly employeeModel: typeof Employee,
  ) {}

  // ==========================================================
  // CREATE
  // ==========================================================

  async create(dto: CreateOrganisationDto) {
    const existing = await this.organisationModel.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException("Organisation already exists");
    }

    if (dto.code) {
      const existingCode = await this.organisationModel.findOne({
        where: { code: dto.code },
      });

      if (existingCode) {
        throw new ConflictException("Organisation code already exists");
      }
    }

    return this.organisationModel.create({
      name: dto.name,
      code: dto.code,
      isActive: dto.isActive ?? true,
    } as Organisation);
  }

  // ==========================================================
  // FIND ALL
  // ==========================================================
  //
  // NOTE: your Prisma version pulled `_count` for `categories`, `assets`,
  // `holders`, and `inventory`. The Sequelize `Organisation` model you've
  // shared only declares `HasMany` associations for `employees`, `categories`,
  // `assets`, and `locations` — there's no `holders` or `inventory`
  // association on this model. I've mapped `holders` to `employees` (the
  // closest analogue — presumably "who holds assets") and omitted
  // `inventory`, since nothing in the schema corresponds to it. Adjust the
  // mapping below if `holders`/`inventory` mean something else in your schema.

  async findAll() {
    const [organisations, categoryCounts, assetCounts, employeeCounts] =
      await Promise.all([
        this.organisationModel.findAll({ order: [["name", "ASC"]] }),
        this.assetCategoryModel.count({ group: ["organisationId"] }),
        this.assetModel.count({ group: ["organisationId"] }),
        this.employeeModel.count({ group: ["organisationId"] }),
      ]);

    const toCountMap = (rows: unknown) =>
      new Map(
        (rows as Array<{ organisationId: string; count: number }>).map(
          (row) => [row.organisationId, Number(row.count)],
        ),
      );

    const categoryMap = toCountMap(categoryCounts);
    const assetMap = toCountMap(assetCounts);
    const employeeMap = toCountMap(employeeCounts);

    return organisations.map((org) => ({
      ...org.toJSON(),
      _count: {
        categories: categoryMap.get(org.id) ?? 0,
        assets: assetMap.get(org.id) ?? 0,
        holders: employeeMap.get(org.id) ?? 0,
      },
    }));
  }

  // ==========================================================
  // FIND ONE
  // ==========================================================

  async findOne(id: string) {
    const organisation = await this.organisationModel.findByPk(id, {
      include: [
        {
          model: AssetCategory,
          as: "categories",
          separate: true,
          order: [["name", "ASC"]],
        },
      ],
    });

    if (!organisation) {
      throw new NotFoundException("Organisation not found");
    }

    const [assetsCount, holdersCount] = await Promise.all([
      this.assetModel.count({ where: { organisationId: id } }),
      this.employeeModel.count({ where: { organisationId: id } }),
    ]);

    return {
      ...organisation.toJSON(),
      _count: {
        assets: assetsCount,
        holders: holdersCount,
      },
    };
  }

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(id: string, dto: UpdateOrganisationDto) {
    await this.assertExists(id);

    if (dto.name) {
      const existing = await this.organisationModel.findOne({
        where: {
          name: dto.name,
          id: { [Op.ne]: id },
        },
      });

      if (existing) {
        throw new ConflictException("Organisation name already exists");
      }
    }

    if (dto.code) {
      const existing = await this.organisationModel.findOne({
        where: {
          code: dto.code,
          id: { [Op.ne]: id },
        },
      });

      if (existing) {
        throw new ConflictException("Organisation code already exists");
      }
    }

    const updateData: Partial<Organisation> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    await this.organisationModel.update(updateData, { where: { id } });

    return this.organisationModel.findByPk(id);
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  async remove(id: string) {
    const organisation = await this.assertExists(id);

    await this.organisationModel.destroy({ where: { id } });

    return organisation;
  }

  // ==========================================================
  // HELPERS
  // ==========================================================

  // Lightweight existence check used by update/remove, mirroring the
  // original service's re-use of findOne purely for its NotFoundException
  // side effect (without needing the categories include + counts).
  private async assertExists(id: string) {
    const organisation = await this.organisationModel.findByPk(id);

    if (!organisation) {
      throw new NotFoundException("Organisation not found");
    }

    return organisation;
  }
}
