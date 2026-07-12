import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { PaymentMethod } from '@prisma/client';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('checkout')
  @Permissions('sales:checkout')
  async checkout(
    @Body()
    dto: {
      customerId?: string;
      cashRegisterId?: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        discountAmount?: number;
      }>;
      paymentMethod: PaymentMethod;
      amountPaid: number;
      discountAmount?: number;
    },
  ) {
    return this.salesService.createSale(dto);
  }

  @Get()
  @Permissions('sales:view')
  async getSales() {
    return this.salesService.getSales();
  }

  @Get('invoice/:invoiceNumber')
  @Permissions('sales:view')
  async getInvoice(@Param('invoiceNumber') invoiceNumber: string) {
    return this.salesService.getInvoiceByNumber(invoiceNumber);
  }
}
