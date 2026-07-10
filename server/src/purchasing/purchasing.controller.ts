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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('purchasing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasingController {
  constructor(private readonly purchasingService: PurchasingService) {}

  @Post('suppliers')
  @Roles('SUPER_ADMIN', 'INVENTORY_MANAGER', 'PURCHASING_AGENT')
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
  async getSuppliers() {
    return this.purchasingService.getSuppliers();
  }

  @Put('suppliers/:id')
  @Roles('SUPER_ADMIN')
  async updateSupplier(@Param('id') id: string, @Body() data: any) {
    return this.purchasingService.updateSupplier(id, data);
  }

  @Delete('suppliers/:id')
  @Roles('SUPER_ADMIN')
  async removeSupplier(@Param('id') id: string) {
    return this.purchasingService.removeSupplier(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'PURCHASING_AGENT')
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
  @Roles('SUPER_ADMIN', 'INVENTORY_MANAGER')
  async receivePurchase(@Param('id') id: string) {
    return this.purchasingService.receivePurchase(id);
  }

  @Get()
  async getPurchases() {
    return this.purchasingService.getPurchases();
  }
}
