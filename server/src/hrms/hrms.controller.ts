import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { HrmsService } from './hrms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('hrms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrmsController {
  constructor(private readonly service: HrmsService) {}

  // ==========================================
  // DASHBOARD
  // ==========================================
  @Get('dashboard')
  @Permissions('hr:view')
  async getDashboard() {
    return this.service.getHrmsDashboard();
  }

  // ==========================================
  // DEPARTMENTS
  // ==========================================
  @Get('departments')
  @Permissions('hr:view')
  async getDepartments() {
    return this.service.getDepartments();
  }

  @Post('departments')
  @Permissions('hr:create')
  async createDepartment(@Body() dto: any) {
    return this.service.createDepartment(dto);
  }

  @Put('departments/:id')
  @Permissions('hr:edit')
  async updateDepartment(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.updateDepartment(id, dto, currentUserId);
  }

  @Delete('departments/:id')
  @Permissions('hr:delete')
  async deleteDepartment(@Param('id') id: string) {
    return this.service.deleteDepartment(id);
  }

  // ==========================================
  // JOB POSITIONS
  // ==========================================
  @Get('positions')
  @Permissions('hr:view')
  async getPositions(@Query('departmentId') departmentId?: string) {
    return this.service.getPositions({ departmentId });
  }

  @Post('positions')
  @Permissions('hr:create')
  async createPosition(@Body() dto: any) {
    return this.service.createPosition(dto);
  }

  @Put('positions/:id')
  @Permissions('hr:edit')
  async updatePosition(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.updatePosition(id, dto, currentUserId);
  }

  @Delete('positions/:id')
  @Permissions('hr:delete')
  async deletePosition(@Param('id') id: string) {
    return this.service.deletePosition(id);
  }

  // ==========================================
  // EMPLOYEES
  // ==========================================
  @Get('employees')
  @Permissions('employees:view')
  async getEmployees(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('positionId') positionId?: string,
    @Query('branch') branch?: string,
    @Query('status') status?: string,
  ) {
    return this.service.getEmployees({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      departmentId,
      positionId,
      branch,
      status,
    });
  }

  @Get('employees/:id')
  @Permissions('employees:view')
  async getEmployeeDetails(@Param('id') id: string) {
    return this.service.getEmployeeDetails(id);
  }

  @Post('employees')
  @Permissions('hr:create')
  async createEmployee(@Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.createEmployee(dto, currentUserId);
  }

  @Put('employees/:id')
  @Permissions('hr:edit')
  async updateEmployee(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.updateEmployee(id, dto, currentUserId);
  }

  @Delete('employees/:id')
  @Permissions('hr:delete')
  async deleteEmployee(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.deleteEmployee(id, currentUserId);
  }

  // ==========================================
  // EMPLOYEE DOCUMENTS
  // ==========================================
  @Post('employees/:id/documents')
  @Permissions('hr:documents')
  async uploadDocument(@Param('id') id: string, @Body() dto: any) {
    return this.service.uploadDocument(id, dto);
  }

  @Delete('documents/:docId')
  @Permissions('hr:documents')
  async deleteDocument(@Param('docId') docId: string) {
    return this.service.deleteDocument(docId);
  }
}
