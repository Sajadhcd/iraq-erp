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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles('SUPER_ADMIN')
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
  async findAll() {
    return this.employeesService.findAll();
  }

  @Get('roles')
  async getRoles() {
    return this.employeesService.getRoles();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN')
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
  @Roles('SUPER_ADMIN')
  async remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
