import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  // ==========================================
  // DASHBOARD
  // ==========================================
  @Get('dashboard')
  @Permissions('attendance:view')
  async getDashboard() {
    return this.service.getAttendanceDashboard();
  }

  // ==========================================
  // POLICY SETTINGS
  // ==========================================
  @Get('policy')
  @Permissions('attendance:view')
  async getPolicy() {
    return this.service.getPolicy();
  }

  @Post('policy')
  @Permissions('attendance:manage')
  async updatePolicy(@Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.updatePolicy(dto, currentUserId);
  }

  // ==========================================
  // CHECK IN
  // ==========================================
  @Post('check-in')
  @Permissions('attendance:view')
  async checkIn(@Body() dto: { employeeId: string; checkInTime?: string; notes?: string }, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.checkIn(dto, currentUserId);
  }

  // ==========================================
  // CHECK OUT
  // ==========================================
  @Put('check-out')
  @Permissions('attendance:view')
  async checkOut(@Body() dto: { employeeId: string; checkOutTime?: string; notes?: string }, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.checkOut(dto, currentUserId);
  }

  // ==========================================
  // MANUAL CRUD - CREATE
  // ==========================================
  @Post()
  @Permissions('attendance:manage')
  async create(@Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.createAttendance(dto, currentUserId);
  }

  // ==========================================
  // MANUAL CRUD - UPDATE
  // ==========================================
  @Put(':id')
  @Permissions('attendance:manage')
  async update(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.updateAttendance(id, dto, currentUserId);
  }

  // ==========================================
  // MANUAL CRUD - DELETE
  // ==========================================
  @Delete(':id')
  @Permissions('attendance:manage')
  async delete(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.deleteAttendance(id, currentUserId);
  }

  // ==========================================
  // LIST ATTENDANCE
  // ==========================================
  @Get()
  @Permissions('attendance:view')
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
  @Permissions('attendance:view')
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
  @Permissions('attendance:view')
  async getMonthlyAttendance(@Query('year') year?: string, @Query('month') month?: string) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    return this.service.getMonthlyAttendance(y, m);
  }
}
