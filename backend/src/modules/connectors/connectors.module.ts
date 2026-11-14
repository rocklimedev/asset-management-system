import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { RequirePermissions } from '../../common/decorator/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorator/current-user.decorator';
import { ZohoAuthModule } from '../zoho-auth/zoho-auth.module';
import { IntegrationStore } from './integration.store';
import { Connector, ZohoMailConnector, ZohoCliqConnector } from './zoho.providers';
import { ZohoHttpService } from './zoho-http.service';

@Injectable()
export class ConnectorRegistry {
  private readonly providers = new Map<string, Connector>();
  constructor(
    readonly mail: ZohoMailConnector,
    readonly cliq: ZohoCliqConnector,
  ) {
    this.register(mail);
    this.register(cliq);
  }
  register(connector: Connector) {
    if (this.providers.has(connector.provider)) throw new Error('Duplicate connector provider');
    this.providers.set(connector.provider, connector);
  }
  get(provider: string, capability?: string): Connector {
    const connector = this.providers.get(provider);
    if (!connector || (capability && !connector.getCapabilities().includes(capability)))
      throw new BadRequestException('Unsupported provider or capability');
    return connector;
  }
  all() {
    return [...this.providers.values()];
  }
}
export class ToggleConnectorDto {
  @IsBoolean() enabled!: boolean;
}
@Controller('connectors')
@RequirePermissions('integrations:read')
export class ConnectorsController {
  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly store: IntegrationStore,
  ) {}
  @Get() async list() {
    const items = await this.store.rows(
      'SELECT provider,name,description,enabled,health,lastSuccessfulRequest,lastError FROM connectors ORDER BY provider',
    );
    return {
      items: await Promise.all(
        items.map(async (item) => ({
          ...item,
          authenticationType: 'oauth2',
          capabilities: this.registry.get(item.provider).getCapabilities(),
          connection: await this.registry.get(item.provider).getStatus(),
        })),
      ),
    };
  }
  @Get(':provider/status') async status(@Param('provider') provider: string) {
    return {
      ...(await this.store.one(
        'SELECT provider,enabled,health,lastSuccessfulRequest,lastError FROM connectors WHERE provider=:provider',
        { provider },
      )),
      connection: await this.registry.get(provider).getStatus(),
    };
  }
  @Post(':provider/test')
  @RequirePermissions('integrations:manage')
  async test(@Param('provider') provider: string, @CurrentUser() actor: AuthUser) {
    try {
      const result = await this.registry.get(provider).testConnection();
      await this.store.log('CONNECTOR_TEST', provider, 'COMPLETED', actor.id);
      return result;
    } catch (error) {
      await this.store.log('CONNECTOR_TEST', provider, 'FAILED', actor.id);
      throw error;
    }
  }
  @Patch(':provider/toggle')
  @RequirePermissions('integrations:manage')
  async toggle(
    @Param('provider') provider: string,
    @Body() dto: ToggleConnectorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    this.registry.get(provider);
    await this.store.run('UPDATE connectors SET enabled=:enabled WHERE provider=:provider', {
      provider,
      enabled: dto.enabled,
    });
    await this.store.log(
      dto.enabled ? 'CONNECTOR_ENABLED' : 'CONNECTOR_DISABLED',
      provider,
      'COMPLETED',
      actor.id,
    );
    return this.status(provider);
  }
}
@Controller('integrations/zoho')
@RequirePermissions('integrations:manage')
export class ZohoHealthController {
  constructor(private readonly registry: ConnectorRegistry) {}
  @Post('test-connection') async test() {
    return {
      items: await Promise.all(
        this.registry.all().map(async (connector) => {
          try {
            return await connector.testConnection();
          } catch {
            return { provider: connector.provider, healthy: false };
          }
        }),
      ),
    };
  }
}
@Module({
  imports: [ZohoAuthModule],
  providers: [ZohoHttpService, ZohoMailConnector, ZohoCliqConnector, ConnectorRegistry],
  controllers: [ConnectorsController, ZohoHealthController],
  exports: [ConnectorRegistry, ZohoAuthModule],
})
export class ConnectorsModule {}
