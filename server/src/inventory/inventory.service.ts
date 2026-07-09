import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UnitOfMeasure } from "@prisma/client";

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // Categories
  async createCategory(data: { name: string; slug: string; description?: string; parentId?: string }) {
    const existing = await this.prisma.category.findUnique({ where: { slug: data.slug } });
    if (existing) throw new BadRequestException("الرمز اللطيف للقسم مسجل بالفعل.");

    return this.prisma.category.create({ data });
  }

  async getCategories() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      include: { children: true },
    });
  }

  // Products
  async createProduct(data: {
    name: string;
    sku: string;
    barcode?: string;
    categoryId: string;
    brandId?: string;
    costPrice: number;
    retailPrice: number;
    unit?: UnitOfMeasure;
    alertQuantity?: number;
    initialStock?: number;
    warehouseId?: string;
  }) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!data.categoryId || !uuidRegex.test(data.categoryId)) {
      throw new BadRequestException("يرجى اختيار قسم صالح للمنتج.");
    }

    const existingSku = await this.prisma.product.findUnique({ where: { sku: data.sku } });
    if (existingSku) throw new BadRequestException("رمز SKU مسجل بالفعل.");

    if (data.barcode) {
      const existingBarcode = await this.prisma.product.findUnique({ where: { barcode: data.barcode } });
      if (existingBarcode) throw new BadRequestException("رمز الباركود مسجل بالفعل.");
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          sku: data.sku,
          barcode: data.barcode,
          categoryId: data.categoryId,
          brandId: data.brandId,
          costPrice: data.costPrice,
          retailPrice: data.retailPrice,
          unit: data.unit || UnitOfMeasure.PCS,
          alertQuantity: data.alertQuantity || 10,
        },
      });

      // Log price history
      await tx.priceHistory.create({
        data: {
          productId: product.id,
          oldCost: 0.00,
          newCost: data.costPrice,
          oldRetail: 0.00,
          newRetail: data.retailPrice,
        },
      });

      // Record opening stock if warehouse is supplied
      if (data.initialStock && data.initialStock > 0 && data.warehouseId) {
        await tx.inventory.create({
          data: {
            productId: product.id,
            warehouseId: data.warehouseId,
            quantity: data.initialStock,
          },
        });

        // Log initial stock movement
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            warehouseId: data.warehouseId,
            quantity: data.initialStock,
            type: "STOCK_IN",
            referenceType: "INITIAL_STOCK",
          },
        });
      }

      return product;
    });
  }

  async getProducts() {
    return this.prisma.product.findMany({
      where: { deletedAt: null },
      include: { category: true, brand: true, inventories: true },
    });
  }

  // Warehouses
  async createWarehouse(data: { name: string; code: string; location?: string }) {
    const existing = await this.prisma.warehouse.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestException("كود المستودع مسجل بالفعل.");

    return this.prisma.warehouse.create({ data });
  }

  async getWarehouses() {
    return this.prisma.warehouse.findMany({
      where: { deletedAt: null },
    });
  }

  // Stock Transfer
  async transferStock(data: {
    productId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    batchNumber?: string;
  }) {
    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new BadRequestException("مستودع المصدر يطابق مستودع الهدف.");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify source stock
      const sourceStock = await tx.inventory.findFirst({
        where: {
          productId: data.productId,
          warehouseId: data.fromWarehouseId,
          batchNumber: data.batchNumber || null,
        },
      });

      if (!sourceStock || sourceStock.quantity.toNumber() < data.quantity) {
        throw new BadRequestException("الكمية المطلوبة للتحويل غير متوفرة في مستودع المصدر.");
      }

      // 2. Deduct source stock
      await tx.inventory.update({
        where: { id: sourceStock.id },
        data: { quantity: { decrement: data.quantity } },
      });

      // 3. Increment or create target stock
      const targetStock = await tx.inventory.findFirst({
        where: {
          productId: data.productId,
          warehouseId: data.toWarehouseId,
          batchNumber: data.batchNumber || null,
        },
      });

      if (targetStock) {
        await tx.inventory.update({
          where: { id: targetStock.id },
          data: { quantity: { increment: data.quantity } },
        });
      } else {
        await tx.inventory.create({
          data: {
            productId: data.productId,
            warehouseId: data.toWarehouseId,
            quantity: data.quantity,
            batchNumber: data.batchNumber || null,
          },
        });
      }

      // Log movements
      await tx.inventoryMovement.create({
        data: {
          productId: data.productId,
          warehouseId: data.fromWarehouseId,
          quantity: -data.quantity,
          type: "TRANSFER_OUT",
          referenceType: "WAREHOUSE_TRANSFER",
        },
      });

      await tx.inventoryMovement.create({
        data: {
          productId: data.productId,
          warehouseId: data.toWarehouseId,
          quantity: data.quantity,
          type: "TRANSFER_IN",
          referenceType: "WAREHOUSE_TRANSFER",
        },
      });

      return { success: true };
    });
  }

  async removeProduct(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async removeCategory(id: string) {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async removeWarehouse(id: string) {
    return this.prisma.warehouse.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
