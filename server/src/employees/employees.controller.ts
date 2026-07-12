import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Permissions('hr:create')
  async create(
    @Body()
    data: {
      firstName: string;
      lastName: string;
      phone?: string;
      roleId: string;
      userId?: string;
    },
  ) {
    return this.employeesService.create(data);
  }

  @Get()
  @Permissions('employees:view')
  async findAll() {
    return this.employeesService.findAll();
  }

  @Get('roles')
  @Permissions('employees:view')
  async getRoles() {
    return this.employeesService.getRoles();
  }

  @Get(':id')
  @Permissions('employees:view')
  async findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Put(':id')
  @Permissions('hr:edit')
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      roleId?: string;
      userId?: string;
    },
  ) {
    return this.employeesService.update(id, data);
  }

  @Delete(':id')
  @Permissions('hr:delete')
  async remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
