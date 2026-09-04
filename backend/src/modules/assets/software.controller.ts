import { Controller, Get } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";

import { RequirePermissions } from "@/common/decorator/roles.decorator";

import { Asset } from "./models/asset.model";
import { SoftwareLicense } from "./models/software-license.model";
import { AssetKind } from "./models/asset-category.model";
@Controller("assets/software")
export class SoftwareController {
  constructor(
    @InjectModel(Asset)
    private readonly assetModel: typeof Asset,
  ) {}

  // ============================================================
  // GET SOFTWARE ASSETS
  // ============================================================

  @Get()
  @RequirePermissions("software.view")
  async findAll() {
    const assets = await this.assetModel.findAll({
      where: {
        kind: AssetKind.SOFTWARE,
      },

      include: [
        {
          model: SoftwareLicense,
          as: "license",
        },
      ],

      order: [["name", "ASC"]],
    });

    return assets.map((asset) => {
      const license = asset.license;

      const totalSeats = license?.totalSeats ?? 0;
      const assignedSeats = license?.assignedSeats ?? 0;

      return {
        id: asset.id,
        name: asset.name,
        status: asset.status,

        vendor: license?.vendor ?? null,
        licenseType: license?.licenseType ?? null,
        licenseReference: license?.licenseReference ?? null,

        totalSeats,
        assignedSeats,

        availableSeats: Math.max(totalSeats - assignedSeats, 0),

        purchaseDate: license?.purchaseDate ?? null,
        expiryDate: license?.expiryDate ?? null,
        renewalDate: license?.renewalDate ?? null,
        cost: license?.cost ?? null,
      };
    });
  }
}
