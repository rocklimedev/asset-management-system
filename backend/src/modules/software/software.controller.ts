import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RequirePermissions } from "../auth/roles.decorator";

@Controller("software")
export class SoftwareController {
  constructor(private prisma: PrismaService) {}

  // Software assets are just Assets with kind = SOFTWARE plus a license record;
  // this endpoint returns them pre-shaped for the Software Management screen.
  @Get()
  @RequirePermissions("software.view")
  async findAll() {
    const assets = await this.prisma.asset.findMany({
      where: { kind: "SOFTWARE" },
      include: { license: true, category: true },
      orderBy: { name: "asc" },
    });
    return assets.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      vendor: a.license?.vendor,
      licenseType: a.license?.licenseType,
      totalSeats: a.license?.totalSeats ?? 0,
      assignedSeats: a.license?.assignedSeats ?? 0,
      availableSeats:
        (a.license?.totalSeats ?? 0) - (a.license?.assignedSeats ?? 0),
      expiryDate: a.license?.expiryDate,
      renewalDate: a.license?.renewalDate,
    }));
  }
}
