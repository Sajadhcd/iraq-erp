import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from '../sales/sales.service';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

// DTO Classes with Class Validator annotations
export class CreateQuotationItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPct?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  taxPct?: number;
}

export class CreateQuotationDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsOptional()
  opportunityId?: string;

  @IsString()
  @IsOptional()
  salespersonId?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsString()
  @IsNotEmpty()
  issueDate: string;

  @IsString()
  @IsNotEmpty()
  expiryDate: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  deliveryTerms?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items: CreateQuotationItemDto[];
}

export class UpdateQuotationDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsOptional()
  opportunityId?: string;

  @IsString()
  @IsOptional()
  salespersonId?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsString()
  @IsOptional()
  issueDate?: string;

  @IsString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsString()
  @IsOptional()
  deliveryTerms?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  @IsOptional()
  items?: CreateQuotationItemDto[];
}

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    private salesService: SalesService,
  ) {}

  // 1. Create Quotation
  async createQuotation(dto: CreateQuotationDto, currentUserId?: string) {
    if (dto.items.length === 0) {
      throw new BadRequestException(
        'يجب أن يحتوي عرض السعر على بند واحد على الأقل.',
      );
    }

    const quotationNumber = `QT-${Date.now().toString().slice(-6)}`;

    // Create database records inside transaction
    const quotation = await this.prisma.$transaction(async (tx) => {
      // Validate customer
      const customer = await tx.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer) throw new NotFoundException('العميل غير موجود.');

      // Parse and save items with calculations
      const itemData = [];
      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product || product.deletedAt || !product.isActive) {
          throw new BadRequestException(
            `المنتج ذو المعرف ${item.productId} غير متاح أو تم حذفه.`,
          );
        }

        const qty = item.quantity;
        const price = item.unitPrice;
        const disc = item.discountPct || 0;
        const tax = item.taxPct || 0;

        const subtotal = qty * price * (1 - disc / 100);
        const total = subtotal * (1 + tax / 100);

        itemData.push({
          productId: item.productId,
          description: item.description || product.description,
          quantity: qty,
          unit: product.unit,
          unitPrice: price,
          discountPct: disc,
          taxPct: tax,
          subtotal,
          total,
        });
      }

      const created = await tx.quotation.create({
        data: {
          quotationNumber,
          version: 1,
          isCurrent: true,
          customerId: dto.customerId,
          leadId: dto.leadId || null,
          opportunityId: dto.opportunityId || null,
          salespersonId: dto.salespersonId || currentUserId || null,
          status: 'DRAFT',
          currency: dto.currency || 'IQD',
          exchangeRate: dto.exchangeRate || 1.0,
          issueDate: new Date(dto.issueDate),
          expiryDate: new Date(dto.expiryDate),
          paymentTerms: dto.paymentTerms,
          deliveryTerms: dto.deliveryTerms,
          notes: dto.notes,
          internalNotes: dto.internalNotes,
          items: {
            create: itemData,
          },
        },
        include: {
          items: true,
        },
      });

      // Write CRM timeline log if linked to Lead
      if (dto.leadId) {
        await tx.leadTimeline.create({
          data: {
            leadId: dto.leadId,
            type: 'QUOTATION_CREATED',
            description: `تم إنشاء عرض سعر جديد برقم: ${quotationNumber} بقيمة إجمالية: ${itemData.reduce((acc, i) => acc + i.total, 0)}`,
            userId: currentUserId,
          },
        });
      }

      return created;
    });

    return quotation;
  }

  // 2. Get Quotations (Filters, Pagination)
  async getQuotations(filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: string;
    salespersonId?: string;
    dateFrom?: string;
    dateTo?: string;
    amountMin?: number;
    amountMax?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      isCurrent: true,
      deletedAt: null,
    };

    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.salespersonId) where.salespersonId = filters.salespersonId;

    if (filters.dateFrom || filters.dateTo) {
      where.issueDate = {};
      if (filters.dateFrom) where.issueDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.issueDate.lte = new Date(filters.dateTo);
    }

    if (filters.search) {
      where.OR = [
        { quotationNumber: { contains: filters.search, mode: 'insensitive' } },
        {
          customer: { name: { contains: filters.search, mode: 'insensitive' } },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          salesperson: { select: { email: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    // Format totals for filtering if min/max amount are provided
    let filteredItems = items;
    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      filteredItems = items.filter((q) => {
        const totalAmount = q.items.reduce(
          (sum, item) => sum + item.total.toNumber(),
          0,
        );
        if (filters.amountMin !== undefined && totalAmount < filters.amountMin)
          return false;
        if (filters.amountMax !== undefined && totalAmount > filters.amountMax)
          return false;
        return true;
      });
    }

    return {
      items: filteredItems,
      total,
      page,
      limit,
    };
  }

  // 3. Get Single Quotation (Includes detail products)
  async getQuotation(id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        lead: true,
        opportunity: true,
        salesperson: {
          select: {
            email: true,
            employee: { select: { firstName: true, lastName: true } },
          },
        },
        submittedBy: {
          select: {
            email: true,
            employee: { select: { firstName: true, lastName: true } },
          },
        },
        approvedBy: {
          select: {
            email: true,
            employee: { select: { firstName: true, lastName: true } },
          },
        },
        rejectedBy: {
          select: {
            email: true,
            employee: { select: { firstName: true, lastName: true } },
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) throw new NotFoundException('عرض السعر المطلوب غير موجود.');
    return quotation;
  }

  // 4. Update Quotation (Creating New Version)
  async updateQuotation(
    id: string,
    dto: UpdateQuotationDto,
    currentUserId?: string,
  ) {
    const existing = await this.prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('عرض السعر غير موجود.');
    }

    if (existing.status === 'CONVERTED') {
      throw new BadRequestException(
        'لا يمكن تعديل عرض سعر تم تحويله بالفعل إلى فاتورة.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mark existing as not current
      await tx.quotation.update({
        where: { id },
        data: { isCurrent: false },
      });

      // 2. Compute items list for new version
      const itemsToClone = dto.items || existing.items;
      const newItemData = [];

      for (const item of itemsToClone) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product || product.deletedAt || !product.isActive) {
          throw new BadRequestException(
            `المنتج ذو المعرف ${item.productId} غير متاح أو تم حذفه.`,
          );
        }

        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);
        const disc = Number(item.discountPct || 0);
        const tax = Number(item.taxPct || 0);

        const subtotal = qty * price * (1 - disc / 100);
        const total = subtotal * (1 + tax / 100);

        newItemData.push({
          productId: item.productId,
          description: item.description || product.description,
          quantity: qty,
          unit: product.unit,
          unitPrice: price,
          discountPct: disc,
          taxPct: tax,
          subtotal,
          total,
        });
      }

      // 3. Create new quotation version record
      const nextVersion = existing.version + 1;
      const created = await tx.quotation.create({
        data: {
          quotationNumber: existing.quotationNumber,
          version: nextVersion,
          isCurrent: true,
          customerId: dto.customerId || existing.customerId,
          leadId:
            dto.leadId !== undefined ? dto.leadId || null : existing.leadId,
          opportunityId:
            dto.opportunityId !== undefined
              ? dto.opportunityId || null
              : existing.opportunityId,
          salespersonId: dto.salespersonId
            ? dto.salespersonId || null
            : existing.salespersonId,
          status: 'DRAFT',
          currency: dto.currency || existing.currency,
          exchangeRate: dto.exchangeRate || existing.exchangeRate,
          issueDate: dto.issueDate
            ? new Date(dto.issueDate)
            : existing.issueDate,
          expiryDate: dto.expiryDate
            ? new Date(dto.expiryDate)
            : existing.expiryDate,
          paymentTerms:
            dto.paymentTerms !== undefined
              ? dto.paymentTerms
              : existing.paymentTerms,
          deliveryTerms:
            dto.deliveryTerms !== undefined
              ? dto.deliveryTerms
              : existing.deliveryTerms,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
          internalNotes:
            dto.internalNotes !== undefined
              ? dto.internalNotes
              : existing.internalNotes,
          items: {
            create: newItemData,
          },
        },
        include: {
          items: true,
        },
      });

      // Write timeline update log
      const linkedLeadId = dto.leadId || existing.leadId;
      if (linkedLeadId) {
        await tx.leadTimeline.create({
          data: {
            leadId: linkedLeadId,
            type: 'QUOTATION_UPDATED',
            description: `تعديل عرض السعر برقم: ${existing.quotationNumber} وإصدار نسخة رقم: ${nextVersion}`,
            userId: currentUserId,
          },
        });
      }

      return created;
    });

    return result;
  }

  // 5. Submit Quotation for Approval
  async submitForApproval(id: string, currentUserId: string) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id } });
    if (!quotation) throw new NotFoundException('عرض السعر غير موجود.');
    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'يمكن فقط تقديم عروض الأسعار التي تكون بحالة مسودة.',
      );
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedById: currentUserId,
        submittedAt: new Date(),
      },
    });

    // Log in AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: 'QUOTATION_SUBMIT',
        entityName: 'Quotation',
        entityId: id,
        newValues: { status: 'SUBMITTED' },
      },
    });

    if (quotation.leadId) {
      await this.prisma.leadTimeline.create({
        data: {
          leadId: quotation.leadId,
          type: 'QUOTATION_SUBMITTED',
          description: `تقديم عرض السعر ${quotation.quotationNumber} للاعتماد.`,
          userId: currentUserId,
        },
      });
    }

    return updated;
  }

  // 5.1 Approve Quotation
  async approveQuotation(id: string, currentUserId: string) {
    const quotation = await this.prisma.quotation.findUnique({ where: { id } });
    if (!quotation) throw new NotFoundException('عرض السعر غير موجود.');
    if (quotation.status !== 'SUBMITTED') {
      throw new BadRequestException('يمكن فقط اعتماد عروض الأسعار المقدمة.');
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: currentUserId,
        approvedAt: new Date(),
      },
    });

    // Log in AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: 'QUOTATION_APPROVE',
        entityName: 'Quotation',
        entityId: id,
        newValues: { status: 'APPROVED' },
      },
    });

    if (quotation.leadId) {
      await this.prisma.leadTimeline.create({
        data: {
          leadId: quotation.leadId,
          type: 'QUOTATION_APPROVED',
          description: `اعتماد عرض السعر ${quotation.quotationNumber}.`,
          userId: currentUserId,
        },
      });
    }

    return updated;
  }

  // 5.2 Reject Quotation
  async rejectQuotation(id: string, comment: string, currentUserId: string) {
    if (!comment || comment.trim() === '') {
      throw new BadRequestException('يجب توفير سبب لرفض عرض السعر.');
    }

    const quotation = await this.prisma.quotation.findUnique({ where: { id } });
    if (!quotation) throw new NotFoundException('عرض السعر غير موجود.');
    if (quotation.status !== 'SUBMITTED') {
      throw new BadRequestException('يمكن فقط رفض عروض الأسعار المقدمة.');
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedById: currentUserId,
        rejectedAt: new Date(),
        rejectionComment: comment,
      },
    });

    // Log in AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: 'QUOTATION_REJECT',
        entityName: 'Quotation',
        entityId: id,
        newValues: { status: 'REJECTED', comment },
      },
    });

    if (quotation.leadId) {
      await this.prisma.leadTimeline.create({
        data: {
          leadId: quotation.leadId,
          type: 'QUOTATION_REJECTED',
          description: `رفض عرض السعر ${quotation.quotationNumber} للسبب: ${comment}`,
          userId: currentUserId,
        },
      });
    }

    return updated;
  }

  // Legacy status support
  async updateStatus(id: string, status: string, currentUserId?: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) throw new NotFoundException('عرض السعر غير موجود.');

    const updateData: any = { status };
    const now = new Date();

    if (status === 'SENT') updateData.sentAt = now;
    if (status === 'VIEWED') updateData.viewedAt = now;
    if (status === 'ACCEPTED') updateData.acceptedAt = now;
    if (status === 'REJECTED') updateData.rejectedAt = now;

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  // 6. Convert Accepted Quotation to Sales Order / Invoice
  async convertToInvoice(
    id: string,
    paymentMethod?: PaymentMethod,
    amountPaid?: number,
    currentUserId?: string,
  ) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventories: true,
              },
            },
          },
        },
      },
    });

    if (!quotation) throw new NotFoundException('عرض السعر غير موجود.');

    if (quotation.status === 'CONVERTED') {
      throw new BadRequestException(
        'تم بالفعل تحويل هذا العرض إلى فاتورة مسبقاً.',
      );
    }

    // Workflow Rule: Block unless Approved
    if (quotation.status !== 'APPROVED') {
      throw new BadRequestException(
        'لا يمكن تحويل عرض السعر إلى فاتورة مبيعات إلا بعد اعتماده والموافقة عليه.',
      );
    }

    // Validation: Block inactive, deleted and verify stock levels
    for (const item of quotation.items) {
      if (!item.product.isActive || item.product.deletedAt) {
        throw new BadRequestException(
          `المنتج ${item.product.name} غير نشط أو تم حذفه ولا يمكن بيعه.`,
        );
      }

      const totalStock = item.product.inventories.reduce(
        (sum, inv) => sum + inv.quantity.toNumber(),
        0,
      );
      if (totalStock < item.quantity.toNumber()) {
        throw new BadRequestException(
          `المخزون غير كافٍ للمنتج ${item.product.name}. المطلوب: ${item.quantity.toNumber()}, المتوفر: ${totalStock}`,
        );
      }
    }

    // Call SalesService to construct Sale & Invoice records
    const saleItems = quotation.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity.toNumber(),
      unitPrice: item.unitPrice.toNumber(),
      discountAmount:
        (item.quantity.toNumber() *
          item.unitPrice.toNumber() *
          item.discountPct.toNumber()) /
        100,
    }));

    const totalExpected = quotation.items.reduce(
      (sum, i) => sum + i.total.toNumber(),
      0,
    );

    const sale = await this.salesService.createSale({
      customerId: quotation.customerId,
      items: saleItems,
      paymentMethod: paymentMethod || 'CASH',
      amountPaid: amountPaid !== undefined ? amountPaid : totalExpected,
    });

    // Update Quotation Status to CONVERTED
    await this.prisma.quotation.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedAt: new Date(),
      },
    });

    // Create conversion log in CRM Timeline
    if (quotation.leadId) {
      await this.prisma.leadTimeline.create({
        data: {
          leadId: quotation.leadId,
          type: 'QUOTATION_CONVERTED',
          description: `تحويل عرض السعر ${quotation.quotationNumber} إلى فاتورة مبيعات برقم: ${sale.invoiceNumber}`,
          userId: currentUserId,
        },
      });
    }

    return sale;
  }

  // 7. Get History Versions
  async getQuotationHistory(quotationNumber: string) {
    return this.prisma.quotation.findMany({
      where: { quotationNumber, deletedAt: null },
      orderBy: { version: 'asc' },
      include: {
        items: { include: { product: { select: { name: true } } } },
      },
    });
  }

  // 8. Delete Quotation (Soft delete)
  async deleteQuotation(id: string) {
    const q = await this.prisma.quotation.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('عرض السعر غير موجود.');

    return this.prisma.quotation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // 9. Dashboard Analytics
  async getQuotationDashboard() {
    const quotes = await this.prisma.quotation.findMany({
      where: { isCurrent: true, deletedAt: null },
      include: { items: true },
    });

    const counts: Record<string, number> = {
      DRAFT: 0,
      SUBMITTED: 0,
      APPROVED: 0,
      REJECTED: 0,
      CONVERTED: 0,
    };

    let totalValue = 0;
    let acceptedValue = 0;

    let pendingApproval = 0;
    let approvedToday = 0;
    let rejectedToday = 0;
    let totalApprovalTimeMs = 0;
    let closedApprovalCount = 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    for (const q of quotes) {
      const qVal = q.items.reduce(
        (sum, item) => sum + item.total.toNumber(),
        0,
      );
      totalValue += qVal;

      if (counts[q.status] !== undefined) {
        counts[q.status]++;
      }

      if (q.status === 'APPROVED' || q.status === 'CONVERTED') {
        acceptedValue += qVal;
      }

      if (q.status === 'SUBMITTED') {
        pendingApproval++;
      }

      if (q.approvedAt) {
        if (new Date(q.approvedAt) >= startOfToday) {
          approvedToday++;
        }
        if (q.submittedAt) {
          totalApprovalTimeMs +=
            new Date(q.approvedAt).getTime() -
            new Date(q.submittedAt).getTime();
          closedApprovalCount++;
        }
      }

      if (q.rejectedAt) {
        if (new Date(q.rejectedAt) >= startOfToday) {
          rejectedToday++;
        }
        if (q.submittedAt) {
          totalApprovalTimeMs +=
            new Date(q.rejectedAt).getTime() -
            new Date(q.submittedAt).getTime();
          closedApprovalCount++;
        }
      }
    }

    const averageApprovalTimeHours =
      closedApprovalCount > 0
        ? parseFloat(
            (
              totalApprovalTimeMs /
              (1000 * 60 * 60) /
              closedApprovalCount
            ).toFixed(1),
          )
        : 0;

    const totalQuotesCount = quotes.length;
    const acceptedCount = counts.APPROVED + counts.CONVERTED;
    const conversionRate =
      totalQuotesCount > 0
        ? parseFloat(((acceptedCount / totalQuotesCount) * 100).toFixed(1))
        : 0;

    return {
      kpis: counts,
      totalQuotes: totalQuotesCount,
      pipelineValue: totalValue,
      acceptedValue,
      conversionRate,
      approvalWorkflow: {
        pendingApproval,
        approvedToday,
        rejectedToday,
        averageApprovalTimeHours,
      },
    };
  }
}
