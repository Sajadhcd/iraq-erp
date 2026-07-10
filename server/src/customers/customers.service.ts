import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    taxNumber?: string;
    creditLimit?: number;
  }) {
    return this.prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        taxNumber: data.taxNumber || null,
        creditLimit: data.creditLimit || 0.0,
      },
    });
  }

  async findAll() {
    return this.prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('العميل غير موجود أو تم حذفه.');
    return customer;
  }

  async update(
    id: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      taxNumber?: string;
      creditLimit?: number;
    },
  ) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
