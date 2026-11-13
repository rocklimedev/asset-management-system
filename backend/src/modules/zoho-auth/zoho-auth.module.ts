import { Module } from '@nestjs/common';
import { IntegrationStore } from '../connectors/integration.store';
import { ZohoAuthController } from './zoho-auth.controller';
import { ZohoAuthService } from './zoho-auth.service';
import { ZohoTokenService } from './zoho-token.service';

@Module({
  providers: [IntegrationStore, ZohoAuthService, ZohoTokenService],
  controllers: [ZohoAuthController],
  exports: [IntegrationStore, ZohoAuthService, ZohoTokenService],
})
export class ZohoAuthModule {}
