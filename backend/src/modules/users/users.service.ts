import { ConflictException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { InjectModel } from "@nestjs/sequelize";

import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../../common/decorator/current-user.decorator";

import { User, UserStatus } from "./models/user.model";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,

    private readonly audit: AuditService,
  ) {}

  findAll() {
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

  async create(
    dto: { name: string; email: string; password: string; roleId: number },
    actor: AuthUser,
  ) {
    const existing = await this.userModel.findOne({
      where: { email: dto.email },
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

  async setStatus(id: number, status: UserStatus, actor: AuthUser) {
    await this.userModel.update({ status }, { where: { id } });

    const user = await this.userModel.findByPk(id);

    await this.audit.log({
      userId: actor.id,
      action: status === UserStatus.DISABLED ? "USER_DISABLED" : "USER_ENABLED",
      entity: "User",
      entityId: id,
    });

    return user;
  }

  async changeRole(id: number, roleId: number, actor: AuthUser) {
    await this.userModel.update({ roleId }, { where: { id } });

    const user = await this.userModel.findByPk(id);

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
