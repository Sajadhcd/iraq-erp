import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('leave')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  // ==========================================
  // DASHBOARD
  // ==========================================
  @Get('dashboard')
  @Roles('SUPER_ADMIN')
  async getDashboard() {
    return this.service.getLeaveDashboard();
  }

  // ==========================================
  // LEAVE TYPES CRUD
  // ==========================================
  @Get('types')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getLeaveTypes() {
    return this.service.getLeaveTypes();
  }

  @Post('types')
  @Roles('SUPER_ADMIN')
  async createLeaveType(@Body() dto: any) {
    return this.service.createLeaveType(dto);
  }

  @Put('types/:id')
  @Roles('SUPER_ADMIN')
  async updateLeaveType(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateLeaveType(id, dto);
  }

  @Delete('types/:id')
  @Roles('SUPER_ADMIN')
  async deleteLeaveType(@Param('id') id: string) {
    return this.service.deleteLeaveType(id);
  }

  // ==========================================
  // LEAVE BALANCES
  // ==========================================
  @Get('balances/:employeeId')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getBalances(@Param('employeeId') employeeId: string) {
    return this.service.getAllLeaveBalances(employeeId);
  }

  // ==========================================
  // LEAVE REQUESTS CRUD & WORKFLOWS
  // ==========================================
  @Get()
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getLeaveRequests(
    @Query('employeeId') employeeId?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getLeaveRequests({
      employeeId,
      leaveTypeId,
      status,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async getLeaveRequestById(@Param('id') id: string) {
    return this.service.getLeaveRequestById(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async createLeaveRequest(@Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.createLeaveRequest(dto, currentUserId);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async updateLeaveRequest(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.updateLeaveRequest(id, dto, currentUserId);
  }

  @Post(':id/submit')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async submitLeaveRequest(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.submitLeaveRequest(id, currentUserId);
  }

  @Post(':id/approve')
  @Roles('SUPER_ADMIN')
  async approveLeaveRequest(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    const approverName = req.user?.username || 'Super Admin';
    return this.service.approveLeaveRequest(id, approverName, currentUserId);
  }

  @Post(':id/reject')
  @Roles('SUPER_ADMIN')
  async rejectLeaveRequest(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.rejectLeaveRequest(id, reason || 'Rejected by Admin', currentUserId);
  }

  @Post(':id/cancel')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async cancelLeaveRequest(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.cancelLeaveRequest(id, currentUserId);
  }
}
