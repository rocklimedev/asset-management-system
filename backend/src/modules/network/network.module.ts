import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuditModule } from '../audit/audit.module';
import { NetworkMap } from './network.model';
import { NetworkController } from './network.controller';
@Module({ imports: [SequelizeModule.forFeature([NetworkMap]), AuditModule], controllers: [NetworkController] })
export class NetworkModule {}
