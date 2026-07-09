import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentMethod } from "@prisma/client";

interface CreateSaleItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

interface CreateSaleDto {
  customerId?: string;
  cashRegisterId?: string;
  items: CreateSaleItemDto[];
  paymentMethod: PaymentMethod;
  amountPaid: number;
  discountAmount?: number;
}

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async createSale(dto: CreateSaleDto) {
    if (dto.items.length === 0) {
      throw new BadRequestException("يجب أن تحتوي الفاتورة على بند واحد على الأقل.");
    }

    return this.prisma.$transaction(async (tx) => {
      // 0. Fetch global settings
      const settingsList = await tx.setting.findMany();
      const settingsMap = new Map(settingsList.map((s) => [s.key, s.value]));

      const taxRateSetting = parseFloat(settingsMap.get("TAX_RATE") || "0");
      const currencySetting = settingsMap.get("DEFAULT_CURRENCY") || "IQD";
      const companyName = settingsMap.get("COMPANY_NAME") || "شركة التجارة العامة";
      const taxNumber = settingsMap.get("TAX_NUMBER") || "000000000";
      const invoicePrefix = settingsMap.get("INVOICE_NUMBERING_PREFIX") || "INV-";

      // 1. Verify and deduct stock for each item
      const itemDetails = [];
      let totalAmountBeforeTax = 0;
      let totalDiscountAmount = dto.discountAmount || 0;

      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { inventories: true },
        });

        if (!product) {
          throw new NotFoundException(`المنتج ذو المعرف ${item.productId} غير موجود.`);
        }

        // Check stock (simplified to default warehouse / first matching inventory)
        const inventory = product.inventories[0];
        if (!inventory || inventory.quantity.toNumber() < item.quantity) {
          throw new BadRequestException(`المنتج ${product.name} ليس لديه مخزون كافٍ. المتوفر: ${inventory?.quantity || 0}`);
        }

        // Deduct inventory
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: { decrement: item.quantity } },
        });

        // Log stock movement
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            warehouseId: inventory.warehouseId,
            quantity: -item.quantity,
            type: "STOCK_OUT",
            referenceType: "SALE",
          },
        });

        const lineSubtotal = item.unitPrice * item.quantity;
        const lineDiscount = item.discountAmount || 0;
        const lineTaxable = lineSubtotal - lineDiscount;
        const lineTax = lineTaxable * (taxRateSetting / 100);
        const lineTotal = lineTaxable + lineTax;

        totalAmountBeforeTax += lineSubtotal;
        
        itemDetails.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: lineDiscount,
          taxRate: taxRateSetting,
          taxAmount: lineTax,
          totalAmount: lineTotal,
        });
      }

      // Compute aggregates
      const netTaxableAmount = totalAmountBeforeTax - totalDiscountAmount;
      const totalTaxAmount = netTaxableAmount * (taxRateSetting / 100);
      const netAmount = netTaxableAmount + totalTaxAmount;

      const invoiceNumber = `${invoicePrefix}${Date.now().toString().slice(-8)}`;

      // 2. Create Sale record
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: dto.customerId || null,
          cashRegisterId: dto.cashRegisterId || null,
          totalAmount: totalAmountBeforeTax,
          discountAmount: totalDiscountAmount,
          taxAmount: totalTaxAmount,
          netAmount: netAmount,
          paymentStatus: dto.amountPaid >= netAmount ? "PAID" : dto.amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID",
          status: "COMPLETED",
        },
      });

      // Generate a generic QR code payload
      const timeStr = new Date().toISOString();
      const qrData = {
        company: companyName,
        taxNo: taxNumber,
        date: timeStr,
        amount: netAmount.toFixed(2),
        tax: totalTaxAmount.toFixed(2),
        invoice: invoiceNumber,
        currency: currencySetting
      };
      const qrHash = Buffer.from(JSON.stringify(qrData)).toString("base64");

      // 3. Create Invoice record
      const invoice = await tx.invoice.create({
        data: {
          saleId: sale.id,
          invoiceNumber,
          invoiceType: dto.customerId ? "STANDARD" : "SIMPLIFIED",
          qrHash,
          status: "ACCEPTED",
        },
      });

      // 4. Create Invoice Items
      for (const details of itemDetails) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            productId: details.productId,
            quantity: details.quantity,
            unitPrice: details.unitPrice,
            discountAmount: details.discountAmount,
            taxRate: details.taxRate,
            taxAmount: details.taxAmount,
            totalAmount: details.totalAmount,
          },
        });
      }

      // 5. Create Payment Log
      if (dto.amountPaid > 0) {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            amount: dto.amountPaid,
            method: dto.paymentMethod,
            status: "COMPLETED",
          },
        });
      }

      return {
        saleId: sale.id,
        invoiceNumber,
        total: netAmount,
        tax: totalTaxAmount,
        qrHash,
      };
    });
  }

  async getSales() {
    return this.prisma.sale.findMany({
      include: {
        customer: true,
        invoice: {
          include: {
            invoiceItems: {
              include: { product: true },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getInvoiceByNumber(invoiceNumber: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber },
      include: {
        sale: {
          include: { customer: true },
        },
        invoiceItems: {
          include: { product: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException("الفاتورة غير موجودة.");
    }

    return invoice;
  }
}
