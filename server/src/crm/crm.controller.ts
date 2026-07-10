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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LeadStatus, LeadPriority, OpportunityStage } from '@prisma/client';

@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CRMController {
  constructor(private readonly crmService: CRMService) {}

  // 1. CRM Dashboard
  @Get('dashboard')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async getDashboard() {
    return this.crmService.getCRMDashboard();
  }

  // 2. Leads Endpoints
  @Post('leads')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async createLead(@Body() dto: CreateLeadDto, @Request() req: any) {
    return this.crmService.createLead(dto, req.user.id);
  }

  @Get('leads')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
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
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async getLead(@Param('id') id: string) {
    return this.crmService.getLead(id);
  }

  @Put('leads/:id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async updateLead(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @Request() req: any,
  ) {
    return this.crmService.updateLead(id, dto, req.user.id);
  }

  @Delete('leads/:id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async deleteLead(@Param('id') id: string, @Request() req: any) {
    return this.crmService.deleteLead(id, req.user.id);
  }

  @Post('leads/:id/convert')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async convertLead(
    @Param('id') id: string,
    @Body() dto: ConvertLeadDto,
    @Request() req: any,
  ) {
    return this.crmService.convertLead(id, dto, req.user.id);
  }

  // 3. Opportunities Endpoints
  @Get('opportunities')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
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
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async getOpportunity(@Param('id') id: string) {
    return this.crmService.getOpportunity(id);
  }

  @Put('opportunities/:id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async updateOpportunity(
    @Param('id') id: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.crmService.updateOpportunity(id, dto, req.user.id);
  }

  @Delete('opportunities/:id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async deleteOpportunity(@Param('id') id: string, @Request() req: any) {
    return this.crmService.deleteOpportunity(id, req.user.id);
  }

  // 4. Activities Endpoints
  @Post('activities')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async createActivity(@Body() dto: CreateActivityDto, @Request() req: any) {
    return this.crmService.createActivity(dto, req.user.id);
  }

  @Put('activities/:id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async updateActivity(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @Request() req: any,
  ) {
    return this.crmService.updateActivity(id, dto, req.user.id);
  }

  @Delete('activities/:id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async deleteActivity(@Param('id') id: string) {
    return this.crmService.deleteActivity(id);
  }

  // 5. Attachments Upload Endpoint
  @Post('leads/:id/attachments')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
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
