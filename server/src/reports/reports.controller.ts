import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('financial-summary')
  @Permissions('reports:view')
  async getFinancialSummary() {
    return this.reportsService.getFinancialSummary();
  }

  @Get('trial-balance')
  @Permissions('reports:view')
  async getTrialBalance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getTrialBalance(startDate, endDate);
  }

  @Get('profit-loss')
  @Permissions('reports:view')
  async getProfitLoss(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getProfitLoss(startDate, endDate);
  }

  @Get('balance-sheet')
  @Permissions('reports:view')
  async getBalanceSheet(@Query('date') date?: string) {
    return this.reportsService.getBalanceSheet(date);
  }

  @Get('customer-statement/:customerId')
  @Permissions('reports:view')
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
  @Permissions('reports:view')
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
  @Permissions('reports:view')
  async getAccountLedger(
    @Param('accountId') accountId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getAccountLedger(accountId, startDate, endDate);
  }
}
