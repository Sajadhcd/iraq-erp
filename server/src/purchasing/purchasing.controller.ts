import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PurchasingService } from './purchasing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('purchasing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasingController {
  constructor(private readonly purchasingService: PurchasingService) {}

  @Post('suppliers')
  @Permissions('purchasing:manage')
  async createSupplier(
    @Body()
    data: {
      companyName: string;
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
      taxNumber?: string;
    },
  ) {
    return this.purchasingService.createSupplier(data);
  }

  @Get('suppliers')
  @Permissions('purchasing:view')
  async getSuppliers() {
    return this.purchasingService.getSuppliers();
  }

  @Put('suppliers/:id')
  @Permissions('purchasing:manage')
  async updateSupplier(@Param('id') id: string, @Body() data: any) {
    return this.purchasingService.updateSupplier(id, data);
  }

  @Delete('suppliers/:id')
  @Permissions('purchasing:manage')
  async removeSupplier(@Param('id') id: string) {
    return this.purchasingService.removeSupplier(id);
  }

  @Post()
  @Permissions('purchasing:manage')
  async createPurchase(
    @Body()
    dto: {
      supplierId: string;
      warehouseId: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitCost: number;
        batchNumber?: string;
        expiryDate?: string;
      }>;
    },
  ) {
    return this.purchasingService.createPurchase(dto);
  }

  @Post(':id/receive')
  @Permissions('purchasing:manage')
  async receivePurchase(@Param('id') id: string) {
    return this.purchasingService.receivePurchase(id);
  }

  @Get()
  @Permissions('purchasing:view')
  async getPurchases() {
    return this.purchasingService.getPurchases();
  }
}
