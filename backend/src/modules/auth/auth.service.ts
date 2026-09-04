import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { InjectModel } from "@nestjs/sequelize";

import { User, UserStatus } from "@/modules/users/models/user.model";
import { Role } from "@/modules/roles/models/role.model";
import { Permission } from "@/modules/roles/models/permission.model";
import { RolePermission } from "@/modules/roles/models/role-permission.model";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,

    private readonly jwt: JwtService,
  ) {}

  // ============================================================
  // LOGIN
  // ============================================================

  async login(email: string, password: string) {
    const user = await this.userModel.findOne({
      where: {
        email,
      },

      include: [
        {
          model: Role,
          as: "role",

          include: [
            {
              model: RolePermission,
              as: "permissions",

              include: [
                {
                  model: Permission,
                  as: "permission",
                },
              ],
            },
          ],
        },
      ],
    });

    // Never reveal whether the email exists or the account is disabled.
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    // UUID is used directly as JWT subject.
    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken: token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,

        role: user.role?.name ?? null,

        permissions:
          user.role?.permissions?.map(
            (rolePermission) => rolePermission.permission.key,
          ) ?? [],
      },
    };
  }
}
