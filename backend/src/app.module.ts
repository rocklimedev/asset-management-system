import { Module } from '@nestjs/common';
import { NetworkModule } from './modules/network/network.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { CommunicationModule } from './modules/communication/communication.module';
import { ZohoFailureFilter } from './modules/zoho-auth/zoho-failure.filter';

import { AuthModule } from './modules/auth/auth.module';
import { AssetsModule } from './modules/assets/assets.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { AuditModule } from './modules/audit/audit.module';
import { OrganisationsModule } from './modules/organisation/organisation.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    SequelizeModule.forRoot({
      dialect: 'mysql',

      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),

      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,

      database: process.env.DB_NAME,

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
    CommunicationModule,
    CredentialsModule,
    NetworkModule,
    AssetsModule,
    UsersModule,
    RolesModule,
    AuditModule,
    ReportsModule,
    OrganisationsModule,
  ],

  providers: [
    { provide: APP_FILTER, useClass: ZohoFailureFilter },
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
