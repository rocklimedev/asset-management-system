import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid email or password.");
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
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
