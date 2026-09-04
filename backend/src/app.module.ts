import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SequelizeModule } from "@nestjs/sequelize";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";

import { AuthModule } from "./modules/auth/auth.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { UsersModule } from "./modules/users/users.module";
import { RolesModule } from "./modules/roles/roles.module";
import { AuditModule } from "./modules/audit/audit.module";
import { OrganisationsModule } from "./modules/organisation/organisation.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    SequelizeModule.forRoot({
      dialect: "mysql",

      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),

      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,

      database: process.env.DB_DATABASE,

      autoLoadModels: true,
      synchronize: false,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 200,
      },
    ]),

    AuthModule,
    AssetsModule,
    UsersModule,
    RolesModule,
    AuditModule,
    OrganisationsModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
