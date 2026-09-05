import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SequelizeModule } from "@nestjs/sequelize";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "@/common/strategy/jwt.strategy";

import { User } from "@/modules/users/models/user.model";

@Module({
  imports: [
    SequelizeModule.forFeature([User]),

    PassportModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),

        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN") ?? "8h",
        },
      }),
    }),
  ],

  providers: [AuthService, JwtStrategy],

  controllers: [AuthController],

  exports: [AuthService],
})
export class AuthModule {}
