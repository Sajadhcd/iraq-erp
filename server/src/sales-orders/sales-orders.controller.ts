import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service';

@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly service: SalesOrdersService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.service.getSalesOrderDashboard();
  }

  @Get()
  async getSalesOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('salespersonId') salespersonId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.getSalesOrders({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      customerId,
      warehouseId,
      status,
      salespersonId,
      dateFrom,
      dateTo,
    });
  }

  @Get(':id')
  async getSalesOrderDetails(@Param('id') id: string) {
    return this.service.getSalesOrderDetails(id);
  }

  @Post()
  async createSalesOrder(@Body() dto: any, @Req() req: any) {
    // Standard mock user request mapping if req.user is populated by JWT middleware
    const currentUserId = req.user?.id;
    return this.service.createSalesOrder(dto, currentUserId);
  }

  @Post('convert/:quoteId')
  async convertFromQuotation(@Param('quoteId') quoteId: string, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.convertFromQuotation(quoteId, currentUserId);
  }

  @Put(':id/confirm')
  async confirmSalesOrder(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.confirmSalesOrder(id, currentUserId);
  }

  @Post(':id/deliveries')
  async createDeliveryNote(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.createDeliveryNote(id, dto, currentUserId);
  }

  @Put('deliveries/:deliveryId/complete')
  async completeDeliveryNote(@Param('deliveryId') deliveryId: string, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.completeDeliveryNote(deliveryId, currentUserId);
  }

  @Post(':id/invoice')
  async createInvoiceFromOrder(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.createInvoiceFromOrder(id, dto, currentUserId);
  }

  @Put(':id/cancel')
  async cancelSalesOrder(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.cancelSalesOrder(id, currentUserId);
  }
}
