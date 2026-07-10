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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PaymentMethod } from '@prisma/client';

@Controller('quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  // 1. Dashboard KPIs
  @Get('dashboard')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async getDashboard() {
    return this.quotationsService.getQuotationDashboard();
  }

  // 2. Create Quotation
  @Post()
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async createQuotation(@Body() dto: CreateQuotationDto, @Request() req: any) {
    return this.quotationsService.createQuotation(dto, req.user.id);
  }

  // 3. Get Quotations List
  @Get()
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
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

  // 4. Get Single Quotation detail
  @Get(':id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async getQuotation(@Param('id') id: string) {
    return this.quotationsService.getQuotation(id);
  }

  // 5. Update Quotation (generates version clone)
  @Put(':id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async updateQuotation(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
    @Request() req: any,
  ) {
    return this.quotationsService.updateQuotation(id, dto, req.user.id);
  }

  // 6. Submit for Approval
  @Put(':id/submit')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async submitForApproval(@Param('id') id: string, @Request() req: any) {
    return this.quotationsService.submitForApproval(id, req.user.id);
  }

  // 6.1 Approve Quotation
  @Put(':id/approve')
  @Roles('SUPER_ADMIN')
  async approveQuotation(@Param('id') id: string, @Request() req: any) {
    return this.quotationsService.approveQuotation(id, req.user.id);
  }

  // 6.2 Reject Quotation
  @Put(':id/reject')
  @Roles('SUPER_ADMIN')
  async rejectQuotation(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @Request() req: any,
  ) {
    return this.quotationsService.rejectQuotation(id, comment, req.user.id);
  }

  // 7. Convert to Invoice
  @Post(':id/convert')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
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

  // 8. Version History
  @Get('history/:quotationNumber')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async getHistory(@Param('quotationNumber') quotationNumber: string) {
    return this.quotationsService.getQuotationHistory(quotationNumber);
  }

  // 9. Soft Delete Quotation
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'SALES_AGENT')
  async deleteQuotation(@Param('id') id: string) {
    return this.quotationsService.deleteQuotation(id);
  }
}
