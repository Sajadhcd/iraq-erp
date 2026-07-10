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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
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
  async findAll() {
    return this.customersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
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
  @Roles('SUPER_ADMIN')
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
