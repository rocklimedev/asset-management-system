import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { InjectModel } from "@nestjs/sequelize";

import { User, UserStatus } from "@/modules/users/models/user.model";
import { Role } from "@/modules/roles/models/role.model";
import { Permission } from "@/modules/roles/models/permission.model";
import { RolePermission } from "@/modules/roles/models/role-permission.model";

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  // ============================================================
  // VALIDATE JWT
  // ============================================================

  async validate(payload: JwtPayload) {
    const user = await this.userModel.findByPk(payload.sub, {
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

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Account is not active.");
    }

    if (!user.role) {
      throw new UnauthorizedException("User role is not configured.");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,

      roleId: user.roleId,

      roleName: user.role.name,

      permissions:
        user.role.permissions?.map(
          (rolePermission) => rolePermission.permission.key,
        ) ?? [],
    };
  }
}
