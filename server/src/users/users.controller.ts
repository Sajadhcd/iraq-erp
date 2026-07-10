import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
