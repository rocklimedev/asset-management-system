import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RequirePermissions } from '../../common/decorator/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorator/current-user.decorator';
import { ConnectorsModule } from '../connectors/connectors.module';
import { CommunicationService } from './communication.service';
import {
  ActivationDto,
  AssignProfileDto,
  ProfileDto,
  ProvisionDto,
  RetryDto,
  UpdateProfileDto,
} from './communication.dto';

@Controller('communication')
@RequirePermissions('communication:read')
export class CommunicationController {
  constructor(private readonly service: CommunicationService) {}
  @Get('profiles') async profiles() {
    return { items: await this.service.profiles() };
  }
  @Get('profiles/:id') profile(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.profile(id);
  }
  @Post('profiles')
  @RequirePermissions('communication:profiles:manage')
  createProfile(@Body() dto: ProfileDto, @CurrentUser() actor: AuthUser) {
    return this.service.saveProfile(undefined, dto, actor.id);
  }
  @Patch('profiles/:id')
  @RequirePermissions('communication:profiles:manage')
  updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.saveProfile(id, dto, actor.id);
  }
  @Delete('profiles/:id')
  @RequirePermissions('communication:profiles:manage')
  deleteProfile(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deleteProfile(id, actor.id);
  }
  @Get('channels') async channels() {
    return { items: await this.service.channels() };
  }
  @Post('channels/sync')
  @RequirePermissions('communication:channels:manage')
  syncChannels(@CurrentUser() actor: AuthUser) {
    return this.service.syncChannels(actor.id);
  }
  @Get('channels/:id') details(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.details(id);
  }
  @Get('channels/:id/members') members(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.members(id);
  }
  @Post('employees/:employeeId/preview')
  preview(@Param('employeeId', ParseUUIDPipe) id: string, @Body() dto: AssignProfileDto) {
    return this.service.preview(id, dto);
  }
  @Post('employees/:employeeId/assign-profile')
  @RequirePermissions('communication:employees:manage')
  assign(
    @Param('employeeId', ParseUUIDPipe) id: string,
    @Body() dto: AssignProfileDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.assign(id, dto, actor.id);
  }
  @Post('employees/:employeeId/provision-email')
  @RequirePermissions('communication:employees:provision')
  mail(
    @Param('employeeId', ParseUUIDPipe) id: string,
    @Body() dto: ProvisionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.provision(id, dto, actor.id, 'MAIL');
  }
  @Post('employees/:employeeId/provision-cliq')
  @RequirePermissions('communication:employees:provision')
  cliq(
    @Param('employeeId', ParseUUIDPipe) id: string,
    @Body() dto: ProvisionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.provision(id, dto, actor.id, 'CLIQ');
  }
  @Post('employees/:employeeId/onboard')
  @RequirePermissions('communication:employees:provision')
  onboard(
    @Param('employeeId', ParseUUIDPipe) id: string,
    @Body() dto: ProvisionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.provision(id, dto, actor.id);
  }
  @Post('employees/:employeeId/sync-channels')
  @RequirePermissions('communication:employees:manage')
  syncMemberships(
    @Param('employeeId', ParseUUIDPipe) id: string,
    @Body() dto: ProvisionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.provision(id, dto, actor.id, 'ALL', 'CHANNELS', true);
  }
  @Post('employees/:employeeId/retry')
  @RequirePermissions('communication:employees:provision')
  retry(
    @Param('employeeId', ParseUUIDPipe) id: string,
    @Body() dto: RetryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.provision(id, dto, actor.id, 'ALL', dto.step);
  }
  @Get('employees/:employeeId/status') status(@Param('employeeId', ParseUUIDPipe) id: string) {
    return this.service.status(id);
  }
  @Get('employees/:employeeId/logs') async logs(@Param('employeeId', ParseUUIDPipe) id: string) {
    return { items: await this.service.logs(id) };
  }
  @Delete('employees/:employeeId/channels/:channelId')
  @RequirePermissions('communication:employees:manage')
  removeMember(
    @Param('employeeId', ParseUUIDPipe) id: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.removeMembership(id, channelId, actor.id);
  }
  @Post('employees/:employeeId/confirm-activation')
  @RequirePermissions('communication:employees:manage')
  activation(
    @Param('employeeId', ParseUUIDPipe) id: string,
    @Body() dto: ActivationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.confirmActivation(id, dto, actor.id);
  }
}
@Module({
  imports: [ConnectorsModule],
  providers: [CommunicationService],
  controllers: [CommunicationController],
})
export class CommunicationModule {}
