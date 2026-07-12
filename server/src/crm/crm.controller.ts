import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CRMService,
  CreateLeadDto,
  UpdateLeadDto,
  ConvertLeadDto,
  CreateActivityDto,
  UpdateActivityDto,
} from './crm.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { LeadStatus, LeadPriority, OpportunityStage } from '@prisma/client';

@Controller('crm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CRMController {
  constructor(private readonly crmService: CRMService) {}

  // 1. CRM Dashboard
  @Get('dashboard')
  @Permissions('crm:view')
  async getDashboard() {
    return this.crmService.getCRMDashboard();
  }

  // 2. Leads Endpoints
  @Post('leads')
  @Permissions('crm:create')
  async createLead(@Body() dto: CreateLeadDto, @Request() req: any) {
    return this.crmService.createLead(dto, req.user.id);
  }

  @Get('leads')
  @Permissions('crm:view')
  async getLeads(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: LeadStatus,
    @Query('priority') priority?: LeadPriority,
    @Query('salespersonId') salespersonId?: string,
    @Query('industry') industry?: string,
    @Query('search') search?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDir') orderDir?: 'asc' | 'desc',
  ) {
    return this.crmService.getLeads({
      page,
      limit,
      status,
      priority,
      salespersonId,
      industry,
      search,
      orderBy,
      orderDir,
    });
  }

  @Get('leads/:id')
  @Permissions('crm:view')
  async getLead(@Param('id') id: string) {
    return this.crmService.getLead(id);
  }

  @Put('leads/:id')
  @Permissions('crm:edit')
  async updateLead(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @Request() req: any,
  ) {
    return this.crmService.updateLead(id, dto, req.user.id);
  }

  @Delete('leads/:id')
  @Permissions('crm:delete')
  async deleteLead(@Param('id') id: string, @Request() req: any) {
    return this.crmService.deleteLead(id, req.user.id);
  }

  @Post('leads/:id/convert')
  @Permissions('crm:convert')
  async convertLead(
    @Param('id') id: string,
    @Body() dto: ConvertLeadDto,
    @Request() req: any,
  ) {
    return this.crmService.convertLead(id, dto, req.user.id);
  }

  // 3. Opportunities Endpoints
  @Get('opportunities')
  @Permissions('crm:view')
  async getOpportunities(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('stage') stage?: OpportunityStage,
    @Query('assignedUserId') assignedUserId?: string,
  ) {
    return this.crmService.getOpportunities({
      page,
      limit,
      stage,
      assignedUserId,
    });
  }

  @Get('opportunities/:id')
  @Permissions('crm:view')
  async getOpportunity(@Param('id') id: string) {
    return this.crmService.getOpportunity(id);
  }

  @Put('opportunities/:id')
  @Permissions('crm:edit')
  async updateOpportunity(
    @Param('id') id: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.crmService.updateOpportunity(id, dto, req.user.id);
  }

  @Delete('opportunities/:id')
  @Permissions('crm:delete')
  async deleteOpportunity(@Param('id') id: string, @Request() req: any) {
    return this.crmService.deleteOpportunity(id, req.user.id);
  }

  // 4. Activities Endpoints
  @Post('activities')
  @Permissions('crm:edit')
  async createActivity(@Body() dto: CreateActivityDto, @Request() req: any) {
    return this.crmService.createActivity(dto, req.user.id);
  }

  @Put('activities/:id')
  @Permissions('crm:edit')
  async updateActivity(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @Request() req: any,
  ) {
    return this.crmService.updateActivity(id, dto, req.user.id);
  }

  @Delete('activities/:id')
  @Permissions('crm:edit')
  async deleteActivity(@Param('id') id: string) {
    return this.crmService.deleteActivity(id);
  }

  // 5. Attachments Upload Endpoint
  @Post('leads/:id/attachments')
  @Permissions('crm:edit')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') leadId: string,
    @UploadedFile() file: any,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('لم يتم توفير أي ملف للرفع.');

    const fileInfo = {
      fileName: file.originalname,
      filePath: `/uploads/crm/${Date.now()}-${file.originalname}`,
      mimeType: file.mimetype,
      size: file.size,
    };

    return this.crmService.addAttachment(leadId, fileInfo, req.user.id);
  }
}
