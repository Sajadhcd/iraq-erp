import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { HrmsService } from './hrms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('hrms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HrmsController {
  constructor(private readonly service: HrmsService) {}

  // ==========================================
  // DASHBOARD
  // ==========================================
  @Get('dashboard')
  @Roles('SUPER_ADMIN')
  async getDashboard() {
    return this.service.getHrmsDashboard();
  }

  // ==========================================
  // DEPARTMENTS
  // ==========================================
  @Get('departments')
  @Roles('SUPER_ADMIN')
  async getDepartments() {
    return this.service.getDepartments();
  }

  @Post('departments')
  @Roles('SUPER_ADMIN')
  async createDepartment(@Body() dto: any) {
    return this.service.createDepartment(dto);
  }

  @Put('departments/:id')
  @Roles('SUPER_ADMIN')
  async updateDepartment(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.updateDepartment(id, dto, currentUserId);
  }

  @Delete('departments/:id')
  @Roles('SUPER_ADMIN')
  async deleteDepartment(@Param('id') id: string) {
    return this.service.deleteDepartment(id);
  }

  // ==========================================
  // JOB POSITIONS
  // ==========================================
  @Get('positions')
  @Roles('SUPER_ADMIN')
  async getPositions(@Query('departmentId') departmentId?: string) {
    return this.service.getPositions({ departmentId });
  }

  @Post('positions')
  @Roles('SUPER_ADMIN')
  async createPosition(@Body() dto: any) {
    return this.service.createPosition(dto);
  }

  @Put('positions/:id')
  @Roles('SUPER_ADMIN')
  async updatePosition(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.updatePosition(id, dto, currentUserId);
  }

  @Delete('positions/:id')
  @Roles('SUPER_ADMIN')
  async deletePosition(@Param('id') id: string) {
    return this.service.deletePosition(id);
  }

  // ==========================================
  // EMPLOYEES
  // ==========================================
  @Get('employees')
  @Roles('SUPER_ADMIN')
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
  @Roles('SUPER_ADMIN')
  async getEmployeeDetails(@Param('id') id: string) {
    return this.service.getEmployeeDetails(id);
  }

  @Post('employees')
  @Roles('SUPER_ADMIN')
  async createEmployee(@Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.createEmployee(dto, currentUserId);
  }

  @Put('employees/:id')
  @Roles('SUPER_ADMIN')
  async updateEmployee(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.updateEmployee(id, dto, currentUserId);
  }

  @Delete('employees/:id')
  @Roles('SUPER_ADMIN')
  async deleteEmployee(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.userId;
    return this.service.deleteEmployee(id, currentUserId);
  }

  // ==========================================
  // EMPLOYEE DOCUMENTS
  // ==========================================
  @Post('employees/:id/documents')
  @Roles('SUPER_ADMIN')
  async uploadDocument(@Param('id') id: string, @Body() dto: any) {
    return this.service.uploadDocument(id, dto);
  }

  @Delete('documents/:docId')
  @Roles('SUPER_ADMIN')
  async deleteDocument(@Param('docId') docId: string) {
    return this.service.deleteDocument(docId);
  }
}
