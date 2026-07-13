import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('leave')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  // ==========================================
  // DASHBOARD
  // ==========================================
  @Get('dashboard')
  @Permissions('leave:view')
  async getDashboard() {
    return this.service.getLeaveDashboard();
  }

  // ==========================================
  // LEAVE TYPES CRUD
  // ==========================================
  @Get('types')
  @Permissions('leave:view')
  async getLeaveTypes() {
    return this.service.getLeaveTypes();
  }

  @Post('types')
  @Permissions('leave:manage')
  async createLeaveType(@Body() dto: any) {
    return this.service.createLeaveType(dto);
  }

  @Put('types/:id')
  @Permissions('leave:manage')
  async updateLeaveType(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateLeaveType(id, dto);
  }

  @Delete('types/:id')
  @Permissions('leave:manage')
  async deleteLeaveType(@Param('id') id: string) {
    return this.service.deleteLeaveType(id);
  }

  // ==========================================
  // LEAVE BALANCES
  // ==========================================
  @Get('balances/:employeeId')
  @Permissions('leave:view')
  async getBalances(@Param('employeeId') employeeId: string) {
    return this.service.getAllLeaveBalances(employeeId);
  }

  // ==========================================
  // LEAVE REQUESTS CRUD & WORKFLOWS
  // ==========================================
  @Get()
  @Permissions('leave:view')
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
  @Permissions('leave:view')
  async getLeaveRequestById(@Param('id') id: string) {
    return this.service.getLeaveRequestById(id);
  }

  @Post()
  @Permissions('leave:manage')
  async createLeaveRequest(@Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.createLeaveRequest(dto, currentUserId);
  }

  @Put(':id')
  @Permissions('leave:manage')
  async updateLeaveRequest(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.updateLeaveRequest(id, dto, currentUserId);
  }

  @Post(':id/submit')
  @Permissions('leave:manage')
  async submitLeaveRequest(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.submitLeaveRequest(id, currentUserId);
  }

  @Post(':id/approve')
  @Permissions('leave:manage')
  async approveLeaveRequest(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    const approverName = req.user?.username || 'Super Admin';
    return this.service.approveLeaveRequest(id, approverName, currentUserId);
  }

  @Post(':id/reject')
  @Permissions('leave:manage')
  async rejectLeaveRequest(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.rejectLeaveRequest(id, reason || 'Rejected by Admin', currentUserId);
  }

  @Post(':id/cancel')
  @Permissions('leave:manage')
  async cancelLeaveRequest(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.cancelLeaveRequest(id, currentUserId);
  }
}
