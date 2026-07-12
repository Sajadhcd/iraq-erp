import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==========================================
  // AUDIT LOGS & SESSION METRICS
  // ==========================================
  @Get('audit-logs')
  @Permissions('users:manage')
  async getAuditLogs() {
    return this.usersService.getAuditLogs();
  }

  @Get('session-metrics')
  @Permissions('users:manage')
  async getSessionMetrics() {
    return this.usersService.getSessionMetrics();
  }

  // ==========================================
  // ROLES MANAGEMENT
  // ==========================================
  @Get('roles')
  @Permissions('users:manage')
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Post('roles')
  @Permissions('users:manage')
  async createRole(@Body() data: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.createRole({ ...data, currentUserId });
  }

  @Put('roles/:id')
  @Permissions('users:manage')
  async updateRole(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.updateRole(id, { ...data, currentUserId });
  }

  @Delete('roles/:id')
  @Permissions('users:manage')
  async deleteRole(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.deleteRole(id, currentUserId);
  }

  // ==========================================
  // PERMISSIONS & MATRIX
  // ==========================================
  @Get('permissions')
  @Permissions('users:manage')
  async getPermissions() {
    return this.usersService.getPermissions();
  }

  @Put('matrix')
  @Permissions('users:manage')
  async updateMatrix(@Body() data: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.updateMatrix({ ...data, currentUserId });
  }

  // ==========================================
  // USER OVERRIDES
  // ==========================================
  @Get(':id/permissions')
  @Permissions('users:manage')
  async getUserPermissions(@Param('id') id: string) {
    return this.usersService.getUserPermissions(id);
  }

  @Put(':id/permissions')
  @Permissions('users:manage')
  async updateUserPermissions(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.updateUserPermissions(id, { ...data, currentUserId });
  }

  // ==========================================
  // BASIC USER CRUD & PASSWORDS
  // ==========================================
  @Post()
  @Permissions('users:manage')
  async create(
    @Body()
    data: {
      email: string;
      username: string;
      passwordHash: string;
      employeeId?: string;
      roleId?: string;
    },
    @Req() req: any
  ) {
    const currentUserId = req.user?.userId;
    return this.usersService.create({ ...data, currentUserId });
  }

  @Get()
  @Permissions('users:manage')
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Permissions('users:manage')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Permissions('users:manage')
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      email: string;
      username: string;
      employeeId?: string;
      roleId?: string;
    },
    @Req() req: any
  ) {
    const currentUserId = req.user?.userId;
    return this.usersService.update(id, { ...data, currentUserId });
  }

  @Put(':id/toggle')
  @Permissions('users:manage')
  async toggleActive(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.toggleActive(id, currentUserId);
  }

  @Post(':id/reset-password')
  @Permissions('users:manage')
  async resetPassword(
    @Param('id') id: string,
    @Body('password') passwordHash: string,
    @Req() req: any
  ) {
    const currentUserId = req.user?.userId;
    return this.usersService.resetPassword(id, passwordHash, currentUserId);
  }

  @Post('change-password')
  async changePassword(
    @Body() data: { oldPassword: string; newPassword: string },
    @Req() req: any
  ) {
    const currentUserId = req.user?.userId;
    return this.usersService.changePassword(currentUserId, data, currentUserId);
  }

  @Delete(':id')
  @Permissions('users:manage')
  async remove(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.remove(id, currentUserId);
  }
}
