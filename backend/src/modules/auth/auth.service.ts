import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { InjectModel } from "@nestjs/sequelize";

import { User, UserStatus } from "../users/models/user.model";
import { Role } from "../roles/models/role.model";
import { Permission } from "../roles/models/permission.model";
import { RolePermission } from "../roles/models/role-permission.model";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,

    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userModel.findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: "role",
          include: [
            {
              model: RolePermission,
              as: "permissions",
              include: [{ model: Permission, as: "permission" }],
            },
          ],
        },
      ],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedException("Invalid email or password.");
    }

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
        role: user.role.name,
        permissions: user.role.permissions.map((rp) => rp.permission.key),
      },
    };
  }
}
