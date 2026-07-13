import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('payroll')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  // ==========================================
  // SALARY STRUCTURES
  // ==========================================
  @Get('structures')
  @Permissions('payroll:view')
  async getSalaryStructures() {
    return this.service.getSalaryStructures();
  }

  @Get('structures/:employeeId')
  @Permissions('payroll:view')
  async getSalaryStructureByEmployee(@Param('employeeId') employeeId: string) {
    return this.service.getSalaryStructureByEmployee(employeeId);
  }

  @Post('structures')
  @Permissions('payroll:manage')
  async upsertSalaryStructure(@Body() dto: any) {
    return this.service.upsertSalaryStructure(dto);
  }

  // ==========================================
  // PAYROLL PERIODS
  // ==========================================
  @Get('periods')
  @Permissions('payroll:view')
  async getPayrollPeriods() {
    return this.service.getPayrollPeriods();
  }

  @Post('periods')
  @Permissions('payroll:manage')
  async createPayrollPeriod(@Body() dto: any) {
    return this.service.createPayrollPeriod(dto);
  }

  // ==========================================
  // PAYROLL RUNS
  // ==========================================
  @Get('runs')
  @Permissions('payroll:view')
  async getPayrollRuns() {
    return this.service.getPayrollRuns();
  }

  @Get('runs/:id')
  @Permissions('payroll:view')
  async getPayrollRunById(@Param('id') id: string) {
    return this.service.getPayrollRunById(id);
  }

  @Post('runs')
  @Permissions('payroll:manage')
  async createPayrollRun(@Body('payrollPeriodId') payrollPeriodId: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.createPayrollRun(payrollPeriodId, currentUserId);
  }

  @Post('runs/:id/approve')
  @Permissions('payroll:manage')
  async approvePayrollRun(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.approvePayrollRun(id, currentUserId);
  }

  @Post('runs/:id/lock')
  @Permissions('payroll:manage')
  async lockPayrollRun(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.lockPayrollRun(id, currentUserId);
  }

  // ==========================================
  // PAYSLIPS
  // ==========================================
  @Get('payslips')
  @Permissions('payroll:view')
  async getPayslips() {
    return this.service.getPayslips();
  }

  @Get('payslips/:id')
  @Permissions('payroll:view')
  async getPayslipById(@Param('id') id: string) {
    return this.service.getPayslipById(id);
  }

  @Post('payslips/:id/print-log')
  @Permissions('payroll:view')
  async logPayslipPrinted(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.logPayslipPrinted(id, currentUserId);
  }
}
