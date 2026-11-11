import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

import { AuditLog } from './models/audit-log.model';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActivityInterceptor } from './activity.interceptor';

@Module({
  imports: [SequelizeModule.forFeature([AuditLog])],

  providers: [AuditService, { provide: APP_INTERCEPTOR, useClass: ActivityInterceptor }],

  controllers: [AuditController],

  exports: [AuditService],
})
export class AuditModule {}
