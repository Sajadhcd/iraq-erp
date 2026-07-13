import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('categories')
  @Permissions('products:create')
  async createCategory(
    @Body()
    data: {
      name: string;
      slug: string;
      description?: string;
      parentId?: string;
    },
  ) {
    return this.inventoryService.createCategory(data);
  }

  @Get('categories')
  @Permissions('products:view')
  async getCategories() {
    return this.inventoryService.getCategories();
  }

  @Delete('categories/:id')
  @Permissions('products:delete')
  async removeCategory(@Param('id') id: string) {
    return this.inventoryService.removeCategory(id);
  }

  @Post('products')
  @Permissions('products:create')
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

  @Get('products')
  @Permissions('products:view')
  async getProducts() {
    return this.inventoryService.getProducts();
  }

  @Get('products/:id')
  @Permissions('products:view')
  async getProductById(@Param('id') id: string) {
    return this.inventoryService.getProductById(id);
  }

  @Put('products/:id')
  @Permissions('products:edit')
  async updateProduct(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      sku?: string;
      barcode?: string;
      categoryId?: string;
      brandId?: string;
      costPrice?: number;
      retailPrice?: number;
      unit?: any;
      alertQuantity?: number;
    },
  ) {
    return this.inventoryService.updateProduct(id, data);
  }

  @Delete('products/:id')
  @Permissions('products:delete')
  async removeProduct(@Param('id') id: string) {
    return this.inventoryService.removeProduct(id);
  }

  @Post('warehouses')
  @Permissions('inventory:manage')
  async createWarehouse(
    @Body() data: { name: string; code: string; location?: string },
  ) {
    return this.inventoryService.createWarehouse(data);
  }

  @Get('warehouses')
  @Permissions('inventory:view')
  async getWarehouses() {
    return this.inventoryService.getWarehouses();
  }

  @Delete('warehouses/:id')
  @Permissions('inventory:manage')
  async removeWarehouse(@Param('id') id: string) {
    return this.inventoryService.removeWarehouse(id);
  }

  @Post('transfer')
  @Permissions('inventory:manage')
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

  @Post('adjust')
  @Permissions('inventory:manage')
  async adjustStock(
    @Body()
    data: {
      productId: string;
      warehouseId: string;
      quantity: number;
    },
  ) {
    return this.inventoryService.adjustStock(data);
  }
}
