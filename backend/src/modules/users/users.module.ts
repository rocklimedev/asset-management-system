import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { AuditModule } from "../audit/audit.module";

import { User } from "./models/user.model";

@Module({
  imports: [SequelizeModule.forFeature([User]), AuditModule],

  providers: [UsersService],

  controllers: [UsersController],

  exports: [UsersService],
})
export class UsersModule {}
