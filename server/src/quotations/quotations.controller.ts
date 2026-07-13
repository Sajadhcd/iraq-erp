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
} from '@nestjs/common';
import {
  QuotationsService,
  CreateQuotationDto,
  UpdateQuotationDto,
} from './quotations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PaymentMethod } from '@prisma/client';

@Controller(['quotations', 'crm/quotations'])
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  // 1. Dashboard KPIs
  @Get('dashboard')
  @Permissions('quotations:view')
  async getDashboard() {
    return this.quotationsService.getQuotationDashboard();
  }

  // 2. Create Quotation
  @Post()
  @Permissions('quotations:create')
  async createQuotation(@Body() dto: CreateQuotationDto, @Request() req: any) {
    return this.quotationsService.createQuotation(dto, req.user.id);
  }

  // 3. Get Quotations List
  @Get()
  @Permissions('quotations:view')
  async getQuotations(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('salespersonId') salespersonId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('amountMin') amountMin?: number,
    @Query('amountMax') amountMax?: number,
  ) {
    return this.quotationsService.getQuotations({
      page,
      limit,
      search,
      status,
      customerId,
      salespersonId,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
    });
  }

  // 4. Version History
  @Get('history/:quotationNumber')
  @Permissions('quotations:view')
  async getHistory(@Param('quotationNumber') quotationNumber: string) {
    return this.quotationsService.getQuotationHistory(quotationNumber);
  }

  // 5. Get Single Quotation detail
  @Get(':id')
  @Permissions('quotations:view')
  async getQuotation(@Param('id') id: string) {
    return this.quotationsService.getQuotation(id);
  }

  // 6. Update Quotation (generates version clone)
  @Put(':id')
  @Permissions('quotations:edit')
  async updateQuotation(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
    @Request() req: any,
  ) {
    return this.quotationsService.updateQuotation(id, dto, req.user.id);
  }

  // 7. Submit for Approval
  @Put(':id/submit')
  @Permissions('quotations:edit')
  async submitForApproval(@Param('id') id: string, @Request() req: any) {
    return this.quotationsService.submitForApproval(id, req.user.id);
  }

  // 7.1 Approve Quotation
  @Put(':id/approve')
  @Permissions('quotations:approve')
  async approveQuotation(@Param('id') id: string, @Request() req: any) {
    return this.quotationsService.approveQuotation(id, req.user.id);
  }

  // 7.2 Reject Quotation
  @Put(':id/reject')
  @Permissions('quotations:approve')
  async rejectQuotation(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @Request() req: any,
  ) {
    return this.quotationsService.rejectQuotation(id, comment, req.user.id);
  }

  // 8. Convert to Invoice
  @Post(':id/convert')
  @Permissions('quotations:edit')
  async convertToInvoice(
    @Param('id') id: string,
    @Request() req: any,
    @Body('paymentMethod') paymentMethod?: PaymentMethod,
    @Body('amountPaid') amountPaid?: number,
  ) {
    return this.quotationsService.convertToInvoice(
      id,
      paymentMethod,
      amountPaid,
      req.user.id,
    );
  }

  // 9. Soft Delete Quotation
  @Delete(':id')
  @Permissions('quotations:delete')
  async deleteQuotation(@Param('id') id: string) {
    return this.quotationsService.deleteQuotation(id);
  }
}
