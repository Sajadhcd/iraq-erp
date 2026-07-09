import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PurchaseStatus, PaymentStatus } from "@prisma/client";

interface CreatePurchaseItemDto {
  productId: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  expiryDate?: string;
}

interface CreatePurchaseDto {
  supplierId: string;
  warehouseId: string;
  items: CreatePurchaseItemDto[];
}

@Injectable()
export class PurchasingService {
  constructor(private prisma: PrismaService) {}

  // Suppliers CRUD
  async createSupplier(data: {
    companyName: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxNumber?: string;
  }) {
    return this.prisma.supplier.create({ data });
  }

  async getSuppliers() {
    return this.prisma.supplier.findMany({
      where: { deletedAt: null },
    });
  }

  async updateSupplier(
    id: string,
    data: {
      companyName?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
      taxNumber?: string;
    },
  ) {
    return this.prisma.supplier.update({
      where: { id },
      data,
    });
  }

  async removeSupplier(id: string) {
    return this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Purchases CRUD
  async createPurchase(dto: CreatePurchaseDto) {
    if (dto.items.length === 0) {
      throw new BadRequestException("يجب أن يحتوي أمر الشراء على بند واحد على الأقل.");
    }

    const purchaseNumber = `PO-${Date.now().toString().slice(-8)}`;

    return this.prisma.$transaction(async (tx) => {
      // 0. Fetch tax rate from settings
      const settingsList = await tx.setting.findMany();
      const settingsMap = new Map(settingsList.map((s) => [s.key, s.value]));
      const taxRateSetting = parseFloat(settingsMap.get("TAX_RATE") || "0");

      let totalAmountBeforeTax = 0;
      let totalTaxAmount = 0;

      const purchaseItemsData = [];

      for (const item of dto.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new NotFoundException(`المنتج ${item.productId} غير موجود.`);
        }

        const subtotal = item.unitCost * item.quantity;
        const tax = subtotal * (taxRateSetting / 100);
        const lineTotal = subtotal + tax;

        totalAmountBeforeTax += subtotal;
        totalTaxAmount += tax;

        purchaseItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          taxAmount: tax,
          batchNumber: item.batchNumber || null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        });
      }

      const totalAmount = totalAmountBeforeTax + totalTaxAmount;

      const purchase = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId: dto.supplierId,
          warehouseId: dto.warehouseId,
          status: PurchaseStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          totalAmount: totalAmount,
          taxAmount: totalTaxAmount,
        },
      });

      for (const pItem of purchaseItemsData) {
        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: pItem.productId,
            quantity: pItem.quantity,
            unitCost: pItem.unitCost,
            taxAmount: pItem.taxAmount,
            batchNumber: pItem.batchNumber,
            expiryDate: pItem.expiryDate,
          },
        });
      }

      return purchase;
    });
  }

  async receivePurchase(purchaseId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { purchaseItems: true },
    });

    if (!purchase) {
      throw new NotFoundException("طلب الشراء غير موجود.");
    }

    if (purchase.status === PurchaseStatus.RECEIVED) {
      throw new BadRequestException("طلب الشراء تم استلامه بالفعل.");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update purchase status
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: { status: PurchaseStatus.RECEIVED },
      });

      // 2. Increment stock in warehouse for each item
      for (const item of purchase.purchaseItems) {
        const inventory = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            warehouseId: purchase.warehouseId,
            batchNumber: item.batchNumber,
          },
        });

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: { increment: item.quantity } },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: item.productId,
              warehouseId: purchase.warehouseId,
              quantity: item.quantity,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
            },
          });
        }
      }

      return updatedPurchase;
    });
  }

  async getPurchases() {
    return this.prisma.purchase.findMany({
      include: {
        supplier: true,
        warehouse: true,
        purchaseItems: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
