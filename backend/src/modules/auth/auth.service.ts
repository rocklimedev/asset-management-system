import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UniqueConstraintError } from 'sequelize';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/sequelize';

import { User, UserStatus } from '@/modules/users/models/user.model';
import { Role } from '@/modules/roles/models/role.model';
import { Permission } from '@/modules/roles/models/permission.model';
import { RolePermission } from '@/modules/roles/models/role-permission.model';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,

    private readonly jwt: JwtService,
  ) {}

  async updateProfile(userId: string, name: string, email: string) {
    const user = await this.userModel.findByPk(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is unavailable.');
    }
    try {
      await user.update({ name, email });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('This email address is already in use.');
      }
      throw error;
    }
    return { id: user.id, name: user.name, email: user.email };
  }

  async resetPassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userModel.findByPk(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is unavailable.');
    }
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect.');
    }
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      throw new BadRequestException('New password must be at most 72 bytes.');
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw new BadRequestException('Choose a password different from your current password.');
    }
    const previousHash = user.passwordHash;
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const [updated] = await this.userModel.update(
      { passwordHash },
      {
        where: { id: userId, passwordHash: previousHash, status: UserStatus.ACTIVE },
      },
    );
    if (!updated) throw new BadRequestException('Password changed during this request. Try again.');
    return { message: 'Password reset successfully.' };
  }

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
          as: 'role',

          include: [
            {
              model: RolePermission,
              as: 'permissions',

              include: [
                {
                  model: Permission,
                  as: 'permission',
                },
              ],
            },
          ],
        },
      ],
    });

    // Never reveal whether the email exists or the account is disabled.
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException('Invalid email or password.');
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
        employeeId: user.employeeId ?? null,

        permissions:
          user.role?.permissions?.map((rolePermission) => rolePermission.permission.key) ?? [],
      },
    };
  }
}
