import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ArrayMaxSize, ArrayUnique, IsArray, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { Op, Transaction, UniqueConstraintError } from 'sequelize';
import { RequirePermissions } from '@/common/decorator/roles.decorator';
import { AuditService } from '@/modules/audit/audit.service';
import { CurrentUser, AuthUser } from '@/common/decorator/current-user.decorator';
import { Role } from './models/role.model';
import { Permission } from './models/permission.model';
import { RolePermission } from './models/role-permission.model';

export class RolePermissionsDto {
  @IsArray() @ArrayUnique() @ArrayMaxSize(1000) @IsUUID(undefined, { each: true }) permissionIds!: string[];
}
export class CreateRoleDto extends RolePermissionsDto {
  @IsString() @Matches(/^[a-z][a-z0-9_]*$/) @MaxLength(100) name!: string;
  @IsString() @MaxLength(255) description!: string;
}

@Controller('roles')
export class RolesController {
  constructor(
    @InjectModel(Role) private readonly roleModel: typeof Role,
    @InjectModel(Permission) private readonly permissionModel: typeof Permission,
    @InjectModel(RolePermission) private readonly rolePermissionModel: typeof RolePermission,
    private readonly audit: AuditService,
  ) {}

  @Get('access')
  access(@CurrentUser() user: AuthUser) {
    return { roleId: user.roleId, permissions: user.permissions };
  }

  @Get()
  findAll() {
    return this.roleModel.findAll({ include: [{ model: RolePermission, as: 'permissions', include: [{ model: Permission, as: 'permission' }] }], order: [['name', 'ASC']] });
  }

  @Get('permissions')
  @RequirePermissions('roles.manage')
  permissions() { return this.permissionModel.findAll({ order: [['key', 'ASC']] }); }

  private async validatePermissions(ids: string[], transaction: Transaction) {
    const permissions = await this.permissionModel.findAll({ where: { id: { [Op.in]: ids } }, transaction });
    if (permissions.length !== ids.length) throw new BadRequestException('One or more permissions no longer exist. Reload and try again.');
    const keys = new Set(permissions.map(p => p.key));
    if ((keys.has('credentials.manage') || keys.has('credentials.reveal')) && !keys.has('credentials.read')) {
      throw new BadRequestException('Credential manage and reveal permissions also require credentials.read.');
    }
    return keys;
  }

  @Post()
  @RequirePermissions('roles.manage')
  async create(@Body() dto: CreateRoleDto, @CurrentUser() user: AuthUser) {
    try {
      return await this.roleModel.sequelize!.transaction(async transaction => {
        await this.validatePermissions(dto.permissionIds, transaction);
        if (['admin', 'developer'].includes(dto.name)) throw new BadRequestException('This name is reserved for a built-in role.');
        const role = await this.roleModel.create({ name: dto.name, description: dto.description.trim() } as Role, { transaction });
        await this.rolePermissionModel.bulkCreate(dto.permissionIds.map(permissionId => ({ roleId: role.id, permissionId })) as RolePermission[], { transaction });
        await this.audit.log({ userId: user.id, action: 'ROLE_CREATED', entity: 'Role', entityId: role.id, metadata: { name: role.name, permissionIds: dto.permissionIds } }, transaction);
        return role;
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) throw new ConflictException('A role with that name already exists.');
      throw error;
    }
  }

  @Patch(':id/permissions')
  @RequirePermissions('roles.manage')
  async setPermissions(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RolePermissionsDto, @CurrentUser() user: AuthUser) {
    return this.roleModel.sequelize!.transaction(async transaction => {
      const role = await this.roleModel.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!role) throw new NotFoundException('Role not found.');
      const keys = await this.validatePermissions(dto.permissionIds, transaction);
      if (['admin', 'developer'].includes(role.name.trim().toLowerCase())) {
        const total = await this.permissionModel.count({ transaction });
        if (dto.permissionIds.length !== total) throw new BadRequestException('Admin and developer roles must retain all registered permissions.');
      }
      if (user.roleId === id && !keys.has('roles.manage')) throw new BadRequestException('You cannot remove your own ability to manage roles.');
      await this.rolePermissionModel.destroy({ where: { roleId: id }, transaction });
      await this.rolePermissionModel.bulkCreate(dto.permissionIds.map(permissionId => ({ roleId: id, permissionId })) as RolePermission[], { transaction });
      await this.audit.log({ userId: user.id, action: 'PERMISSION_CHANGED', entity: 'Role', entityId: id, metadata: { permissionIds: dto.permissionIds } }, transaction);
      return { id, permissionIds: dto.permissionIds };
    });
  }
}
