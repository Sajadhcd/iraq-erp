import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    firstName: string;
    lastName: string;
    phone?: string;
    roleId: string;
    userId?: string;
  }) {
    return this.prisma.employee.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        roleId: data.roleId,
        userId: data.userId || null,
      },
    });
  }

  async findAll() {
    return this.prisma.employee.findMany({
      where: { deletedAt: null },
      include: { role: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: { role: true, user: true },
    });
    if (!employee) throw new NotFoundException('الموظف غير موجود أو تم حذفه.');
    return employee;
  }

  async update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      roleId?: string;
      userId?: string;
    },
  ) {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany();
  }
}
