import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async summary() {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    const in90 = new Date(now.getTime() + 90 * 24 * 3600 * 1000);

    const [
      totalAssets,
      assigned,
      unassigned,
      employees,
      hardware,
      software,
      underRepair,
      expiringLicenses,
      byStatus,
      hardwareByCategory,
      softwareByCategory,
      recentHistory,
      expiringWarranties,
    ] = await this.prisma.$transaction([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.asset.count({ where: { status: { in: ['AVAILABLE'] } } }),
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.asset.count({ where: { kind: 'HARDWARE' } }),
      this.prisma.asset.count({ where: { kind: 'SOFTWARE' } }),
      this.prisma.asset.count({ where: { status: 'REPAIR' } }),
      this.prisma.softwareLicense.count({ where: { expiryDate: { lte: in90, gte: now } } }),
      this.prisma.asset.groupBy({ by: ['status'], _count: true }),
      this.prisma.asset.groupBy({ by: ['categoryId'], where: { kind: 'HARDWARE' }, _count: true }),
      this.prisma.asset.groupBy({ by: ['categoryId'], where: { kind: 'SOFTWARE' }, _count: true }),
      this.prisma.assetHistory.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { asset: true } }),
      this.prisma.asset.findMany({
        where: { warrantyExpiry: { lte: in90, gte: now } },
        orderBy: { warrantyExpiry: 'asc' },
        take: 5,
      }),
    ]);

    const categories = await this.prisma.assetCategory.findMany();
    const categoryName = (id: number) => categories.find((c) => c.id === id)?.name ?? 'Other';

    const expiringLicenseList = await this.prisma.softwareLicense.findMany({
      where: { expiryDate: { lte: in90, gte: now } },
      orderBy: { expiryDate: 'asc' },
      take: 5,
      include: { asset: true },
    });

    return {
      cards: {
        totalAssets,
        assignedAssets: assigned,
        unassignedAssets: unassigned,
        employees,
        hardware,
        software,
        underRepair,
        expiringLicenses,
      },
      assetDistribution: byStatus.map((s) => ({ status: s.status, count: s._count })),
      hardwareBreakdown: hardwareByCategory.map((c) => ({ category: categoryName(c.categoryId), count: c._count })),
      softwareBreakdown: softwareByCategory.map((c) => ({ category: categoryName(c.categoryId), count: c._count })),
      recentActivity: recentHistory.map((h) => ({
        id: h.id,
        action: h.action,
        assetName: h.asset.name,
        fromValue: h.fromValue,
        toValue: h.toValue,
        performedBy: h.performedBy,
        createdAt: h.createdAt,
      })),
      upcoming: {
        licenseExpirations: expiringLicenseList.map((l) => ({
          assetName: l.asset.name,
          expiryDate: l.expiryDate,
          urgency: l.expiryDate && l.expiryDate <= in30 ? 'red' : 'yellow',
        })),
        warrantyExpirations: expiringWarranties.map((a) => ({
          assetName: a.name,
          assetTag: a.assetTag,
          warrantyExpiry: a.warrantyExpiry,
          urgency: a.warrantyExpiry && a.warrantyExpiry <= in30 ? 'red' : 'yellow',
        })),
      },
    };
  }
}
