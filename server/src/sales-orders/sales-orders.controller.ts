import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('sales-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesOrdersController {
  constructor(private readonly service: SalesOrdersService) {}

  @Get('dashboard')
  @Permissions('sales_orders:view')
  async getDashboard() {
    return this.service.getSalesOrderDashboard();
  }

  @Get()
  @Permissions('sales_orders:view')
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
  @Permissions('sales_orders:view')
  async getSalesOrderDetails(@Param('id') id: string) {
    return this.service.getSalesOrderDetails(id);
  }

  @Post()
  @Permissions('sales_orders:manage')
  async createSalesOrder(@Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.createSalesOrder(dto, currentUserId);
  }

  @Post('convert/:quoteId')
  @Permissions('sales_orders:manage')
  async convertFromQuotation(@Param('quoteId') quoteId: string, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.convertFromQuotation(quoteId, currentUserId);
  }

  @Put(':id/confirm')
  @Permissions('sales_orders:manage')
  async confirmSalesOrder(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.confirmSalesOrder(id, currentUserId);
  }

  @Post(':id/deliveries')
  @Permissions('sales_orders:manage')
  async createDeliveryNote(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.createDeliveryNote(id, dto, currentUserId);
  }

  @Put('deliveries/:deliveryId/complete')
  @Permissions('sales_orders:manage')
  async completeDeliveryNote(@Param('deliveryId') deliveryId: string, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.completeDeliveryNote(deliveryId, currentUserId);
  }

  @Post(':id/invoice')
  @Permissions('sales_orders:manage')
  async createInvoiceFromOrder(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.createInvoiceFromOrder(id, dto, currentUserId);
  }

  @Put(':id/cancel')
  @Permissions('sales_orders:manage')
  async cancelSalesOrder(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.id;
    return this.service.cancelSalesOrder(id, currentUserId);
  }
}
