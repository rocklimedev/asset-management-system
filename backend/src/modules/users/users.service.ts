import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { InjectModel } from "@nestjs/sequelize";

import { AuditService } from "@/modules/audit/audit.service";
import { AuthUser } from "@/common/decorator/current-user.decorator";

import { User, UserStatus } from "./models/user.model";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,

    private readonly audit: AuditService,
  ) {}

  // ============================================================
  // FIND ALL
  // ============================================================

  async findAll() {
    return this.userModel.findAll({
      attributes: [
        "id",
        "name",
        "email",
        "status",
        "createdAt",
        "roleId",
        "employeeId",
      ],

      order: [["name", "ASC"]],
    });
  }

  // ============================================================
  // CREATE USER
  // ============================================================

  async create(
    dto: {
      name: string;
      email: string;
      password: string;
      roleId: string;
    },
    actor: AuthUser,
  ) {
    const existing = await this.userModel.findOne({
      where: {
        email: dto.email,
      },
    });

    if (existing) {
      throw new ConflictException("A user with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      roleId: dto.roleId,
    } as User);

    await this.audit.log({
      userId: actor.id,

      action: "USER_CREATED",

      entity: "User",

      entityId: user.id,
    });

    return user;
  }

  // ============================================================
  // SET USER STATUS
  // ============================================================

  async setStatus(id: string, status: UserStatus, actor: AuthUser) {
    const user = await this.userModel.findByPk(id);

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    await user.update({
      status,
    });

    await this.audit.log({
      userId: actor.id,

      action: status === UserStatus.DISABLED ? "USER_DISABLED" : "USER_ENABLED",

      entity: "User",

      entityId: user.id,

      metadata: {
        status,
      },
    });

    return user;
  }

  // ============================================================
  // CHANGE USER ROLE
  // ============================================================

  async changeRole(id: string, roleId: string, actor: AuthUser) {
    const user = await this.userModel.findByPk(id);

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    await user.update({
      roleId,
    });

    await this.audit.log({
      userId: actor.id,

      action: "ROLE_CHANGED",

      entity: "User",

      entityId: user.id,

      metadata: {
        roleId,
      },
    });

    return user;
  }
}
