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
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Permissions('customers:create')
  async create(
    @Body()
    data: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      taxNumber?: string;
      creditLimit?: number;
    },
  ) {
    return this.customersService.create(data);
  }

  @Get()
  @Permissions('customers:view')
  async findAll() {
    return this.customersService.findAll();
  }

  @Get(':id')
  @Permissions('customers:view')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Put(':id')
  @Permissions('customers:update')
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      taxNumber?: string;
      creditLimit?: number;
    },
  ) {
    return this.customersService.update(id, data);
  }

  @Delete(':id')
  @Permissions('customers:delete')
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
