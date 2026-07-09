import { Controller, Post, Get, Body, Param, UseGuards } from "@nestjs/common";
import { SalesService } from "./sales.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { PaymentMethod } from "@prisma/client";

@Controller("sales")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post("checkout")
  @Roles("SUPER_ADMIN", "SALES_AGENT")
  async checkout(
    @Body()
    dto: {
      customerId?: string;
      cashRegisterId?: string;
      items: Array<{ productId: string; quantity: number; unitPrice: number; discountAmount?: number }>;
      paymentMethod: PaymentMethod;
      amountPaid: number;
      discountAmount?: number;
    },
  ) {
    return this.salesService.createSale(dto);
  }

  @Get()
  async getSales() {
    return this.salesService.getSales();
  }

  @Get("invoice/:invoiceNumber")
  async getInvoice(@Param("invoiceNumber") invoiceNumber: string) {
    return this.salesService.getInvoiceByNumber(invoiceNumber);
  }
}
