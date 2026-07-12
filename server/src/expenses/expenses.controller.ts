import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Permissions('accounting:manage')
  async createExpense(
    @Body()
    data: {
      category: string;
      amount: number;
      supplierId?: string;
      warehouseId?: string;
    },
  ) {
    return this.expensesService.createExpense(data);
  }

  @Get()
  @Permissions('accounting:view')
  async getExpenses() {
    return this.expensesService.getExpenses();
  }
}
