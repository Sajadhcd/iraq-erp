import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  // ==========================================
  // DASHBOARD
  // ==========================================
  @Get('dashboard')
  @Roles('SUPER_ADMIN')
  async getDashboard() {
    return this.service.getAttendanceDashboard();
  }

  // ==========================================
  // POLICY SETTINGS
  // ==========================================
  @Get('policy')
  @Roles('SUPER_ADMIN')
  async getPolicy() {
    return this.service.getPolicy();
  }

  @Post('policy')
  @Roles('SUPER_ADMIN')
  async updatePolicy(@Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.updatePolicy(dto, currentUserId);
  }

  // ==========================================
  // CHECK IN
  // ==========================================
  @Post('check-in')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async checkIn(@Body() dto: { employeeId: string; checkInTime?: string; notes?: string }, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.checkIn(dto, currentUserId);
  }

  // ==========================================
  // CHECK OUT
  // ==========================================
  @Put('check-out')
  @Roles('SUPER_ADMIN', 'SALES_AGENT', 'ACCOUNTANT', 'INVENTORY_MANAGER')
  async checkOut(@Body() dto: { employeeId: string; checkOutTime?: string; notes?: string }, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.checkOut(dto, currentUserId);
  }

  // ==========================================
  // MANUAL CRUD - CREATE
  // ==========================================
  @Post()
  @Roles('SUPER_ADMIN')
  async create(@Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.createAttendance(dto, currentUserId);
  }

  // ==========================================
  // MANUAL CRUD - UPDATE
  // ==========================================
  @Put(':id')
  @Roles('SUPER_ADMIN')
  async update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.updateAttendance(id, dto, currentUserId);
  }

  // ==========================================
  // MANUAL CRUD - DELETE
  // ==========================================
  @Delete(':id')
  @Roles('SUPER_ADMIN')
  async delete(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.deleteAttendance(id, currentUserId);
  }

  // ==========================================
  // LIST ATTENDANCE
  // ==========================================
  @Get()
  @Roles('SUPER_ADMIN')
  async getAttendanceList(
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getAttendanceList({
      employeeId,
      startDate,
      endDate,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ==========================================
  // GET ATTENDANCE BY EMPLOYEE
  // ==========================================
  @Get('employee/:employeeId')
  @Roles('SUPER_ADMIN')
  async getAttendanceByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getAttendanceByEmployee(employeeId, { startDate, endDate });
  }

  // ==========================================
  // GET MONTHLY ATTENDANCE SUMMARY
  // ==========================================
  @Get('monthly')
  @Roles('SUPER_ADMIN')
  async getMonthlyAttendance(@Query('year') year?: string, @Query('month') month?: string) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    return this.service.getMonthlyAttendance(y, m);
  }
}
