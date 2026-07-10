import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from '../sales/sales.service';
import { AccountingService } from '../accounting/accounting.service';
import { PaymentMethod } from '@prisma/client';

@Injectable()
export class SalesOrdersService {
  constructor(
    private prisma: PrismaService,
    private salesService: SalesService,
    private accountingService: AccountingService,
  ) {}

  // 1. Create Sales Order (DRAFT)
  async createSalesOrder(dto: any, currentUserId?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('يجب أن يحتوي أمر البيع على بند واحد على الأقل.');
    }

    const salesOrderNumber = `SO-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (tx) => {
      const itemData = [];

      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.deletedAt || !product.isActive) {
          throw new BadRequestException(`المنتج ذو المعرف ${item.productId} غير نشط أو تم حذفه.`);
        }

        const qty = parseFloat(item.quantity);
        const price = parseFloat(item.unitPrice);
        const disc = parseFloat(item.discountPct || '0');
        const tax = parseFloat(item.taxPct || '0');

        const subtotal = qty * price * (1 - disc / 100);
        const total = subtotal * (1 + tax / 100);

        itemData.push({
          productId: item.productId,
          description: item.description || product.description,
          quantity: qty,
          deliveredQuantity: 0.0,
          invoicedQuantity: 0.0,
          remainingQuantity: qty,
          unit: product.unit || 'PCS',
          unitPrice: price,
          discountPct: disc,
          taxPct: tax,
          subtotal,
          total,
        });
      }

      const order = await tx.salesOrder.create({
        data: {
          salesOrderNumber,
          customerId: dto.customerId,
          quotationId: dto.quotationId || null,
          salespersonId: dto.salespersonId || currentUserId || null,
          warehouseId: dto.warehouseId,
          currency: dto.currency || 'IQD',
          exchangeRate: parseFloat(dto.exchangeRate || '1.0'),
          orderDate: new Date(dto.orderDate || Date.now()),
          expectedDeliveryDate: new Date(dto.expectedDeliveryDate || Date.now()),
          status: 'DRAFT',
          notes: dto.notes || '',
          internalNotes: dto.internalNotes || '',
          items: {
            create: itemData,
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          warehouse: true,
        },
      });

      // Log SO created to Lead timeline if exists
      if (dto.leadId) {
        await tx.leadTimeline.create({
          data: {
            leadId: dto.leadId,
            type: 'SALES_ORDER_CREATED',
            description: `تم إنشاء أمر البيع رقم ${salesOrderNumber}`,
          },
        });
      }

      return order;
    });
  }

  // 2. Convert from Quotation
  async convertFromQuotation(quoteId: string, currentUserId?: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quoteId, deletedAt: null },
      include: { items: true },
    });

    if (!quotation) {
      throw new NotFoundException('عرض السعر المطلوب غير موجود.');
    }

    if (quotation.status !== 'APPROVED') {
      throw new BadRequestException('لا يمكن تحويل عرض سعر غير معتمد.');
    }

    // Check if quotation already has an active Sales Order
    const existingSO = await this.prisma.salesOrder.findFirst({
      where: { quotationId: quoteId, status: { not: 'CANCELLED' } },
    });
    if (existingSO) {
      throw new BadRequestException('تم تحويل عرض السعر هذا مسبقاً إلى أمر بيع بالفعل.');
    }

    // Default to the first available Warehouse
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { isActive: true, deletedAt: null },
    });
    if (!warehouse) {
      throw new BadRequestException('لا يوجد مستودع نشط لإسناد أمر البيع إليه.');
    }

    return this.prisma.$transaction(async (tx) => {
      const itemData = quotation.items.map((item) => {
        const qty = item.quantity.toNumber();
        const price = item.unitPrice.toNumber();
        const disc = item.discountPct.toNumber();
        const tax = item.taxPct.toNumber();

        const subtotal = qty * price * (1 - disc / 100);
        const total = subtotal * (1 + tax / 100);

        return {
          productId: item.productId,
          description: item.description,
          quantity: qty,
          deliveredQuantity: 0.0,
          invoicedQuantity: 0.0,
          remainingQuantity: qty,
          unit: item.unit,
          unitPrice: price,
          discountPct: disc,
          taxPct: tax,
          subtotal,
          total,
        };
      });

      const salesOrderNumber = `SO-${Date.now().toString().slice(-6)}`;
      const order = await tx.salesOrder.create({
        data: {
          salesOrderNumber,
          customerId: quotation.customerId,
          quotationId: quoteId,
          salespersonId: quotation.salespersonId || currentUserId || null,
          warehouseId: warehouse.id,
          currency: quotation.currency,
          exchangeRate: quotation.exchangeRate,
          orderDate: new Date(),
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: 'DRAFT',
          notes: quotation.notes || '',
          internalNotes: quotation.internalNotes || '',
          items: {
            create: itemData,
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          warehouse: true,
        },
      });

      if (quotation.leadId) {
        await tx.leadTimeline.create({
          data: {
            leadId: quotation.leadId,
            type: 'SALES_ORDER_CREATED',
            description: `تم إنشاء أمر البيع رقم ${salesOrderNumber} من عرض السعر ${quotation.quotationNumber}`,
          },
        });
      }

      return order;
    });
  }

  // 3. Confirm Sales Order & Reserve Stock
  async confirmSalesOrder(id: string, currentUserId?: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order || order.deletedAt) {
      throw new NotFoundException('أمر البيع غير موجود.');
    }

    if (order.status !== 'DRAFT') {
      throw new BadRequestException('يمكن تأكيد عروض أسعار أو أوامر مبيعات مسودة فقط.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Check and reserve stock in selected warehouse
      for (const item of order.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            warehouseId: order.warehouseId,
          },
        });

        const qtyNeeded = item.quantity.toNumber();
        const stockQty = inventory ? inventory.quantity.toNumber() : 0;
        const reservedQty = inventory ? inventory.reserved.toNumber() : 0;
        const availableStock = stockQty - reservedQty;

        if (availableStock < qtyNeeded) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          throw new BadRequestException(
            `المخزون المتوفر غير كافٍ للمنتج ${product?.name || 'غير معروف'} في المستودع المحدد. المتوفر للطلب: ${availableStock}, المطلوب: ${qtyNeeded}`,
          );
        }

        // Reserve stock
        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { reserved: { increment: qtyNeeded } },
          });
        }
      }

      const updated = await tx.salesOrder.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: { items: { include: { product: true } }, customer: true, warehouse: true },
      });

      // Write to audit log & customer timeline
      await tx.auditLog.create({
        data: {
          action: 'SALES_ORDER_CONFIRM',
          entityName: 'SalesOrder',
          entityId: id,
          userId: currentUserId || null,
          newValues: { status: 'CONFIRMED' },
        },
      });

      return updated;
    });
  }

  // 4. Create Delivery Note (DRAFT)
  async createDeliveryNote(orderId: string, dto: any, currentUserId?: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.deletedAt) {
      throw new NotFoundException('أمر البيع غير موجود.');
    }

    const allowedStatuses = ['CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY', 'PARTIALLY_DELIVERED'];
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException('لا يمكن إنشاء إذن تسليم لأمر بيع في حالته الحالية.');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('يجب إضافة بند واحد على الأقل للتسليم.');
    }

    const deliveryNumber = `DN-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (tx) => {
      const itemData = [];

      for (const item of dto.items) {
        const orderItem = order.items.find((i) => i.productId === item.productId);
        if (!orderItem) {
          throw new BadRequestException(`المنتج ذو المعرف ${item.productId} لا ينتمي إلى هذا البيع.`);
        }

        const qtyDelivered = parseFloat(item.quantity);
        if (qtyDelivered <= 0) {
          throw new BadRequestException('يجب أن تكون الكمية المسلمة أكبر من صفر.');
        }

        const remaining = orderItem.remainingQuantity.toNumber();
        if (qtyDelivered > remaining) {
          throw new BadRequestException(
            `الكمية المسلمة (${qtyDelivered}) تفوق الكمية المتبقية للتسليم (${remaining}) للمنتج.`,
          );
        }

        itemData.push({
          productId: item.productId,
          quantity: qtyDelivered,
          unit: orderItem.unit,
        });
      }

      const delivery = await tx.deliveryNote.create({
        data: {
          deliveryNumber,
          salesOrderId: orderId,
          warehouseId: order.warehouseId,
          deliveryDate: new Date(dto.deliveryDate || Date.now()),
          driver: dto.driver || '',
          receiver: dto.receiver || '',
          status: 'DRAFT',
          notes: dto.notes || '',
          items: {
            create: itemData,
          },
        },
        include: {
          items: { include: { product: true } },
          salesOrder: true,
          warehouse: true,
        },
      });

      return delivery;
    });
  }

  // 5. Complete Delivery Note & Decrement Inventory
  async completeDeliveryNote(deliveryId: string, currentUserId?: string) {
    const delivery = await this.prisma.deliveryNote.findUnique({
      where: { id: deliveryId },
      include: {
        items: true,
        salesOrder: { include: { items: true } },
      },
    });

    if (!delivery || delivery.deletedAt) {
      throw new NotFoundException('إذن التسليم غير موجود.');
    }

    if (delivery.status !== 'DRAFT') {
      throw new BadRequestException('لا يمكن إكمال إذن تسليم مكتمل بالفعل أو ملغي.');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of delivery.items) {
        // Find Inventory
        const inventory = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            warehouseId: delivery.warehouseId,
          },
        });

        const qtyDelivered = item.quantity.toNumber();

        if (!inventory || inventory.quantity.toNumber() < qtyDelivered) {
          throw new BadRequestException(
            `مخزون المستودع غير كافٍ لإكمال التسليم.`,
          );
        }

        // Decrement actual quantity AND release reserved quantity
        const reservedDecrement = Math.min(qtyDelivered, inventory.reserved.toNumber());
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: { decrement: qtyDelivered },
            reserved: { decrement: reservedDecrement },
          },
        });

        // Log Stock Out Movement
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            warehouseId: delivery.warehouseId,
            quantity: -qtyDelivered,
            type: 'STOCK_OUT',
            referenceType: 'SALE',
            referenceId: delivery.salesOrderId,
          },
        });

        // Update Sales Order Line item delivered quantities
        const orderItem = delivery.salesOrder.items.find((oi) => oi.productId === item.productId);
        if (orderItem) {
          const newDelivered = orderItem.deliveredQuantity.toNumber() + qtyDelivered;
          const newRemaining = Math.max(0, orderItem.quantity.toNumber() - newDelivered);

          await tx.salesOrderItem.update({
            where: { id: orderItem.id },
            data: {
              deliveredQuantity: newDelivered,
              remainingQuantity: newRemaining,
            },
          });
        }
      }

      // Update Delivery Note Status
      const completedDelivery = await tx.deliveryNote.update({
        where: { id: deliveryId },
        data: { status: 'COMPLETED' },
        include: { items: true },
      });

      // Refetch Sales Order items to check overall order status
      const updatedOrderItems = await tx.salesOrderItem.findMany({
        where: { salesOrderId: delivery.salesOrderId },
      });

      const allDelivered = updatedOrderItems.every((item) => item.remainingQuantity.toNumber() === 0);
      const anyDelivered = updatedOrderItems.some((item) => item.deliveredQuantity.toNumber() > 0);

      let nextStatus = 'PROCESSING';
      if (allDelivered) {
        nextStatus = 'DELIVERED';
      } else if (anyDelivered) {
        nextStatus = 'PARTIALLY_DELIVERED';
      }

      await tx.salesOrder.update({
        where: { id: delivery.salesOrderId },
        data: { status: nextStatus },
      });

      // Timeline Log
      if (delivery.salesOrder.quotationId) {
        const quotation = await tx.quotation.findUnique({
          where: { id: delivery.salesOrder.quotationId },
        });
        if (quotation?.leadId) {
          await tx.leadTimeline.create({
            data: {
              leadId: quotation.leadId,
              type: 'DELIVERY_COMPLETED',
              description: `تم تسليم شحنة بالكامل لإذن التسليم رقم ${delivery.deliveryNumber}`,
            },
          });
        }
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'DELIVERY_COMPLETE',
          entityName: 'DeliveryNote',
          entityId: deliveryId,
          userId: currentUserId || null,
          newValues: { status: 'COMPLETED' },
        },
      });

      return completedDelivery;
    });
  }

  // 6. Create Invoice from Delivery (Invoices delivered but uninvoiced items)
  async createInvoiceFromOrder(orderId: string, dto: any, currentUserId?: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    if (!order || order.deletedAt) {
      throw new NotFoundException('أمر البيع غير موجود.');
    }

    // Verify order is at least partially or fully delivered
    const updatedOrderItems = order.items;
    const totalDelivered = updatedOrderItems.reduce((sum, item) => sum + item.deliveredQuantity.toNumber(), 0);
    if (totalDelivered <= 0) {
      throw new BadRequestException('لا يمكن توليد فاتورة لأمر بيع لم يتم تسليم أي من بنوده بعد.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Compute invoice items based on (deliveredQuantity - invoicedQuantity)
      const invoiceItemsToCreate = [];
      let totalAmountBeforeTax = 0;
      let totalTaxAmount = 0;
      let netAmount = 0;
      let totalCogs = 0;

      const settingsList = await tx.setting.findMany();
      const settingsMap = new Map(settingsList.map((s) => [s.key, s.value]));
      const invoicePrefix = settingsMap.get('INVOICE_NUMBERING_PREFIX') || 'INV-';
      const companyName = settingsMap.get('COMPANY_NAME') || 'شركة التجارة العامة';
      const taxNumber = settingsMap.get('TAX_NUMBER') || '000000000';
      const currencySetting = settingsMap.get('DEFAULT_CURRENCY') || 'IQD';

      for (const item of order.items) {
        const deliverQty = item.deliveredQuantity.toNumber();
        const invoiceQty = item.invoicedQuantity.toNumber();
        const availableToInvoice = deliverQty - invoiceQty;

        if (availableToInvoice > 0) {
          const price = item.unitPrice.toNumber();
          const disc = item.discountPct.toNumber();
          const taxPct = item.taxPct.toNumber();

          const subtotal = availableToInvoice * price * (1 - disc / 100);
          const taxVal = subtotal * (taxPct / 100);
          const totalVal = subtotal + taxVal;

          invoiceItemsToCreate.push({
            productId: item.productId,
            quantity: availableToInvoice,
            unitPrice: price,
            discountAmount: (availableToInvoice * price * disc) / 100,
            taxRate: taxPct,
            taxAmount: taxVal,
            totalAmount: totalVal,
            costPrice: item.product.costPrice.toNumber(),
            orderItemId: item.id,
          });

          totalAmountBeforeTax += availableToInvoice * price;
          totalTaxAmount += taxVal;
          netAmount += totalVal;
          totalCogs += item.product.costPrice.toNumber() * availableToInvoice;
        }
      }

      if (invoiceItemsToCreate.length === 0) {
        throw new BadRequestException('تمت فوترة جميع الكميات التي تم تسليمها بالفعل.');
      }

      const invoiceNumber = `${invoicePrefix}${Date.now().toString().slice(-8)}`;

      // 1. Create Sale
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: order.customerId,
          salesOrderId: orderId,
          totalAmount: totalAmountBeforeTax,
          discountAmount: order.items.reduce((sum, item) => sum + (item.quantity.toNumber() * item.unitPrice.toNumber() * item.discountPct.toNumber()) / 100, 0), // Proportionate discount logic simplifies here
          taxAmount: totalTaxAmount,
          netAmount: netAmount,
          paymentStatus: dto.amountPaid >= netAmount ? 'PAID' : dto.amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
          status: 'COMPLETED',
        },
      });

      // 2. Create Invoice
      const timeStr = new Date().toISOString();
      const qrData = {
        company: companyName,
        taxNo: taxNumber,
        date: timeStr,
        amount: netAmount.toFixed(2),
        tax: totalTaxAmount.toFixed(2),
        invoice: invoiceNumber,
        currency: currencySetting,
      };
      const qrHash = Buffer.from(JSON.stringify(qrData)).toString('base64');

      const invoice = await tx.invoice.create({
        data: {
          saleId: sale.id,
          invoiceNumber,
          invoiceType: 'STANDARD',
          qrHash,
          status: 'ACCEPTED',
        },
      });

      // 3. Create Invoice items & update invoiced quantity on SalesOrderItem
      for (const details of invoiceItemsToCreate) {
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

        // Update SalesOrderItem invoicedQuantity
        const orderItem = order.items.find((i) => i.id === details.orderItemId);
        if (orderItem) {
          const currentInvoiced = orderItem.invoicedQuantity.toNumber();
          await tx.salesOrderItem.update({
            where: { id: orderItem.id },
            data: {
              invoicedQuantity: currentInvoiced + details.quantity,
            },
          });
        }
      }

      // 4. Create Payment Log
      const amountPaidNum = parseFloat(dto.amountPaid || '0');
      if (amountPaidNum > 0) {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            amount: amountPaidNum,
            method: (dto.paymentMethod as PaymentMethod) || 'CASH',
            status: 'COMPLETED',
          },
        });
      }

      // 5. Generate Accounting Entries
      await this.accountingService.autoGenerateJournal(
        {
          type: 'SALE',
          referenceId: sale.id,
          referenceNumber: invoiceNumber,
          amount: netAmount,
          taxAmount: totalTaxAmount,
          paymentMethod: dto.paymentMethod || 'CASH',
          cogsAmount: totalCogs,
        },
        tx,
      );

      // Check if order is fully invoiced (invoicedQuantity == quantity for all items)
      const updatedItemsAfterInvoice = await tx.salesOrderItem.findMany({
        where: { salesOrderId: orderId },
      });
      const allInvoiced = updatedItemsAfterInvoice.every(
        (item) => item.invoicedQuantity.toNumber() >= item.quantity.toNumber(),
      );

      if (allInvoiced) {
        await tx.salesOrder.update({
          where: { id: orderId },
          data: { status: 'CLOSED' },
        });
      }

      // Timeline entries
      if (order.quotationId) {
        const quotation = await tx.quotation.findUnique({
          where: { id: order.quotationId },
        });
        if (quotation?.leadId) {
          await tx.leadTimeline.create({
            data: {
              leadId: quotation.leadId,
              type: 'INVOICE_CREATED',
              description: `تم إنشاء الفاتورة رقم ${invoiceNumber} للبيع رقم ${order.salesOrderNumber}`,
            },
          });
        }
      }

      return {
        saleId: sale.id,
        invoiceNumber,
        total: netAmount,
        qrHash,
      };
    });
  }

  // 7. Cancel Sales Order & Release Reserved Stock
  async cancelSalesOrder(id: string, currentUserId?: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order || order.deletedAt) {
      throw new NotFoundException('أمر البيع غير موجود.');
    }

    if (['DELIVERED', 'CLOSED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('لا يمكن إلغاء أمر البيع بعد تسليمه بالكامل أو إغلاقه.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Release reservations
      for (const item of order.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            warehouseId: order.warehouseId,
          },
        });

        // Reserve needs to be decremented by the unfulfilled amount
        const unfulfilledQty = item.quantity.toNumber() - item.deliveredQuantity.toNumber();
        if (inventory && unfulfilledQty > 0) {
          const reservedDecrement = Math.min(unfulfilledQty, inventory.reserved.toNumber());
          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              reserved: { decrement: reservedDecrement },
            },
          });
        }
      }

      // Cancel draft delivery notes
      await tx.deliveryNote.updateMany({
        where: { salesOrderId: id, status: 'DRAFT' },
        data: { status: 'CANCELLED' },
      });

      const updated = await tx.salesOrder.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await tx.auditLog.create({
        data: {
          action: 'SALES_ORDER_CANCEL',
          entityName: 'SalesOrder',
          entityId: id,
          userId: currentUserId || null,
          newValues: { status: 'CANCELLED' },
        },
      });

      return updated;
    });
  }

  // 8. Search & List Sales Orders
  async getSalesOrders(filters: {
    page?: number;
    limit?: number;
    search?: string;
    customerId?: string;
    warehouseId?: string;
    status?: string;
    salespersonId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.status) where.status = filters.status;
    if (filters.salespersonId) where.salespersonId = filters.salespersonId;

    if (filters.search) {
      where.OR = [
        { salesOrderNumber: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.orderDate = {};
      if (filters.dateFrom) where.orderDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.orderDate.lte = new Date(filters.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        include: {
          customer: true,
          warehouse: true,
          salesperson: { select: { email: true } },
          items: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // 9. Single Sales Order Details
  async getSalesOrderDetails(id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        warehouse: true,
        salesperson: { select: { email: true } },
        quotation: true,
        items: { include: { product: true } },
        deliveryNotes: {
          where: { deletedAt: null },
          include: { items: { include: { product: true } } },
        },
        sales: {
          include: {
            invoice: {
              include: { invoiceItems: { include: { product: true } } },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('أمر البيع المطلوب غير موجود.');
    }

    return order;
  }

  // 10. Dashboard KPI metrics
  async getSalesOrderDashboard() {
    const orders = await this.prisma.salesOrder.findMany({
      where: { deletedAt: null },
    });

    const kpis: Record<string, number> = {
      DRAFT: 0,
      CONFIRMED: 0,
      PROCESSING: 0,
      READY_FOR_DELIVERY: 0,
      PARTIALLY_DELIVERED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      CLOSED: 0,
    };

    let openOrders = 0; // CONFIRMED
    let processingOrders = 0; // PROCESSING + READY_FOR_DELIVERY + PARTIALLY_DELIVERED
    let readyForDelivery = 0; // READY_FOR_DELIVERY
    let deliveredToday = 0;
    let pendingDeliveries = 0; // CONFIRMED + PROCESSING + PARTIALLY_DELIVERED

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    for (const order of orders) {
      if (kpis[order.status] !== undefined) {
        kpis[order.status]++;
      }

      if (order.status === 'CONFIRMED') {
        openOrders++;
        pendingDeliveries++;
      }

      if (['PROCESSING', 'READY_FOR_DELIVERY', 'PARTIALLY_DELIVERED'].includes(order.status)) {
        processingOrders++;
        pendingDeliveries++;
      }

      if (order.status === 'READY_FOR_DELIVERY') {
        readyForDelivery++;
      }

      // Check delivered today
      if (order.status === 'DELIVERED' || order.status === 'CLOSED') {
        if (order.updatedAt >= startOfToday) {
          deliveredToday++;
        }
      }
    }

    return {
      kpis,
      openOrders,
      processingOrders,
      readyForDelivery,
      deliveredToday,
      pendingDeliveries,
    };
  }
}
