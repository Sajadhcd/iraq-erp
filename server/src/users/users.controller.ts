import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==========================================
  // AUDIT LOGS & SESSION METRICS
  // ==========================================
  @Get('audit-logs')
  @Roles('SUPER_ADMIN')
  async getAuditLogs() {
    return this.usersService.getAuditLogs();
  }

  @Get('session-metrics')
  @Roles('SUPER_ADMIN')
  async getSessionMetrics() {
    return this.usersService.getSessionMetrics();
  }

  // ==========================================
  // ROLES MANAGEMENT
  // ==========================================
  @Get('roles')
  @Roles('SUPER_ADMIN')
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Post('roles')
  @Roles('SUPER_ADMIN')
  async createRole(@Body() data: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.createRole({ ...data, currentUserId });
  }

  @Put('roles/:id')
  @Roles('SUPER_ADMIN')
  async updateRole(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.updateRole(id, { ...data, currentUserId });
  }

  @Delete('roles/:id')
  @Roles('SUPER_ADMIN')
  async deleteRole(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.deleteRole(id, currentUserId);
  }

  // ==========================================
  // PERMISSIONS & MATRIX
  // ==========================================
  @Get('permissions')
  @Roles('SUPER_ADMIN')
  async getPermissions() {
    return this.usersService.getPermissions();
  }

  @Put('matrix')
  @Roles('SUPER_ADMIN')
  async updateMatrix(@Body() data: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.updateMatrix({ ...data, currentUserId });
  }

  // ==========================================
  // USER OVERRIDES
  // ==========================================
  @Get(':id/permissions')
  @Roles('SUPER_ADMIN')
  async getUserPermissions(@Param('id') id: string) {
    return this.usersService.getUserPermissions(id);
  }

  @Put(':id/permissions')
  @Roles('SUPER_ADMIN')
  async updateUserPermissions(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.updateUserPermissions(id, { ...data, currentUserId });
  }

  // ==========================================
  // BASIC USER CRUD & PASSWORDS
  // ==========================================
  @Post()
  @Roles('SUPER_ADMIN')
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
  @Roles('SUPER_ADMIN')
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN')
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
  @Roles('SUPER_ADMIN')
  async toggleActive(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.toggleActive(id, currentUserId);
  }

  @Post(':id/reset-password')
  @Roles('SUPER_ADMIN')
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
  @Roles('SUPER_ADMIN')
  async remove(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.usersService.remove(id, currentUserId);
  }
}
