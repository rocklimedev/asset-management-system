import { Controller, Get, Header, Post, Query } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, AuthUser } from '../../common/decorator/current-user.decorator';
import { RequirePermissions } from '../../common/decorator/roles.decorator';
import { Public } from '../../common/decorator/public.decorator';
import { ZohoAuthService } from './zoho-auth.service';

export class OAuthCallbackDto {
  @IsString() @MaxLength(256) state!: string;
  @IsOptional() @IsString() @MaxLength(4096) code?: string;
  @IsOptional() @IsString() @MaxLength(256) error?: string;
  @IsOptional() @IsString() @MaxLength(256) location?: string;
  @IsOptional() @IsString() @MaxLength(256) 'accounts-server'?: string;
}
@Controller('integrations/zoho')
@RequirePermissions('integrations:read')
export class ZohoAuthController {
  constructor(private readonly auth: ZohoAuthService) {}
  @Get('auth/url')
  @Header('Cache-Control', 'no-store')
  @RequirePermissions('integrations:manage')
  url(@CurrentUser() actor: AuthUser) {
    return this.auth.authorize(actor.id);
  }
  @Post('reconnect')
  @RequirePermissions('integrations:manage')
  reconnect(@CurrentUser() actor: AuthUser) {
    return this.auth.authorize(actor.id);
  }
  @Get('auth/callback')
  @Public()
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  callback(@Query() query: OAuthCallbackDto) {
    return this.auth.callback(query.state, query.code, query.error);
  }
  @Get('status')
  @Header('Cache-Control', 'no-store')
  status() {
    return this.auth.status();
  }
  @Post('disconnect')
  @RequirePermissions('integrations:manage')
  disconnect(@CurrentUser() actor: AuthUser) {
    return this.auth.disconnect(actor.id);
  }
}
