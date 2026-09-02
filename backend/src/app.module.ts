import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { EmployeesModule } from "./modules/employees/employees.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { SoftwareModule } from "./modules/software/software.module";
import { UsersModule } from "./modules/users/users.module";
import { RolesModule } from "./modules/roles/roles.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { AuditModule } from "./modules/audit/audit.module";
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard";
import { RolesGuard } from "./modules/auth/roles.guard";
import { APP_GUARD as APP_GUARD_TOKEN } from "@nestjs/core";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    AssetsModule,
    SoftwareModule,
    UsersModule,
    RolesModule,
    DashboardModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
