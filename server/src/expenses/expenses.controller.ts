import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
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
  async getExpenses() {
    return this.expensesService.getExpenses();
  }
}
