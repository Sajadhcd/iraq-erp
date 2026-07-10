import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  // ==========================================
  // SALARY STRUCTURES
  // ==========================================
  @Get('structures')
  @Roles('SUPER_ADMIN')
  async getSalaryStructures() {
    return this.service.getSalaryStructures();
  }

  @Get('structures/:employeeId')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getSalaryStructureByEmployee(@Param('employeeId') employeeId: string) {
    return this.service.getSalaryStructureByEmployee(employeeId);
  }

  @Post('structures')
  @Roles('SUPER_ADMIN')
  async upsertSalaryStructure(@Body() dto: any) {
    return this.service.upsertSalaryStructure(dto);
  }

  // ==========================================
  // PAYROLL PERIODS
  // ==========================================
  @Get('periods')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getPayrollPeriods() {
    return this.service.getPayrollPeriods();
  }

  @Post('periods')
  @Roles('SUPER_ADMIN')
  async createPayrollPeriod(@Body() dto: any) {
    return this.service.createPayrollPeriod(dto);
  }

  // ==========================================
  // PAYROLL RUNS
  // ==========================================
  @Get('runs')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async getPayrollRuns() {
    return this.service.getPayrollRuns();
  }

  @Get('runs/:id')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async getPayrollRunById(@Param('id') id: string) {
    return this.service.getPayrollRunById(id);
  }

  @Post('runs')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async createPayrollRun(@Body('payrollPeriodId') payrollPeriodId: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.createPayrollRun(payrollPeriodId, currentUserId);
  }

  @Post('runs/:id/approve')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async approvePayrollRun(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.approvePayrollRun(id, currentUserId);
  }

  @Post('runs/:id/lock')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async lockPayrollRun(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.lockPayrollRun(id, currentUserId);
  }

  // ==========================================
  // PAYSLIPS
  // ==========================================
  @Get('payslips')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getPayslips() {
    return this.service.getPayslips();
  }

  @Get('payslips/:id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getPayslipById(@Param('id') id: string) {
    return this.service.getPayslipById(id);
  }

  @Post('payslips/:id/print-log')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async logPayslipPrinted(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.logPayslipPrinted(id, currentUserId);
  }
}
