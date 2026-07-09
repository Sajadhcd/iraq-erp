import { Controller, Get, Post, Body, UseGuards, Delete, Param } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("inventory")
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post("categories")
  @Roles("SUPER_ADMIN", "INVENTORY_MANAGER")
  async createCategory(@Body() data: { name: string; slug: string; description?: string; parentId?: string }) {
    return this.inventoryService.createCategory(data);
  }

  @Get("categories")
  async getCategories() {
    return this.inventoryService.getCategories();
  }

  @Delete("categories/:id")
  @Roles("SUPER_ADMIN")
  async removeCategory(@Param("id") id: string) {
    return this.inventoryService.removeCategory(id);
  }

  @Post("products")
  @Roles("SUPER_ADMIN", "INVENTORY_MANAGER")
  async createProduct(
    @Body()
    data: {
      name: string;
      sku: string;
      barcode?: string;
      categoryId: string;
      brandId?: string;
      costPrice: number;
      retailPrice: number;
      unit?: any;
      alertQuantity?: number;
      initialStock?: number;
      warehouseId?: string;
    },
  ) {
    return this.inventoryService.createProduct(data);
  }

  @Get("products")
  async getProducts() {
    return this.inventoryService.getProducts();
  }

  @Delete("products/:id")
  @Roles("SUPER_ADMIN")
  async removeProduct(@Param("id") id: string) {
    return this.inventoryService.removeProduct(id);
  }

  @Post("warehouses")
  @Roles("SUPER_ADMIN")
  async createWarehouse(@Body() data: { name: string; code: string; location?: string }) {
    return this.inventoryService.createWarehouse(data);
  }

  @Get("warehouses")
  async getWarehouses() {
    return this.inventoryService.getWarehouses();
  }

  @Delete("warehouses/:id")
  @Roles("SUPER_ADMIN")
  async removeWarehouse(@Param("id") id: string) {
    return this.inventoryService.removeWarehouse(id);
  }

  @Post("transfer")
  @Roles("SUPER_ADMIN", "INVENTORY_MANAGER")
  async transferStock(
    @Body()
    data: {
      productId: string;
      fromWarehouseId: string;
      toWarehouseId: string;
      quantity: number;
      batchNumber?: string;
    },
  ) {
    return this.inventoryService.transferStock(data);
  }
}
