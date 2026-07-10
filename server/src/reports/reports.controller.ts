import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('financial-summary')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async getFinancialSummary() {
    return this.reportsService.getFinancialSummary();
  }

  @Get('trial-balance')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async getTrialBalance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getTrialBalance(startDate, endDate);
  }

  @Get('profit-loss')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async getProfitLoss(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getProfitLoss(startDate, endDate);
  }

  @Get('balance-sheet')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async getBalanceSheet(@Query('date') date?: string) {
    return this.reportsService.getBalanceSheet(date);
  }

  @Get('customer-statement/:customerId')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async getCustomerStatement(
    @Param('customerId') customerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getCustomerStatement(
      customerId,
      startDate,
      endDate,
    );
  }

  @Get('supplier-statement/:supplierId')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async getSupplierStatement(
    @Param('supplierId') supplierId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSupplierStatement(
      supplierId,
      startDate,
      endDate,
    );
  }

  @Get('ledger/:accountId')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async getAccountLedger(
    @Param('accountId') accountId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getAccountLedger(accountId, startDate, endDate);
  }
}
