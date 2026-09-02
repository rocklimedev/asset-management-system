import { ConflictException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../auth/current-user.decorator";

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        role: true,
        employeeId: true,
      },
      orderBy: { name: "asc" },
    });
  }

  async create(
    dto: { name: string; email: string; password: string; roleId: number },
    actor: AuthUser,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing)
      throw new ConflictException("A user with this email already exists.");
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        roleId: dto.roleId,
      },
    });
    await this.audit.log({
      userId: actor.id,
      action: "USER_CREATED",
      entity: "User",
      entityId: user.id,
    });
    return user;
  }

  async setStatus(id: number, status: "ACTIVE" | "DISABLED", actor: AuthUser) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
    });
    await this.audit.log({
      userId: actor.id,
      action: status === "DISABLED" ? "USER_DISABLED" : "USER_ENABLED",
      entity: "User",
      entityId: id,
    });
    return user;
  }

  async changeRole(id: number, roleId: number, actor: AuthUser) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { roleId },
    });
    await this.audit.log({
      userId: actor.id,
      action: "ROLE_CHANGED",
      entity: "User",
      entityId: id,
      metadata: { roleId },
    });
    return user;
  }
}
