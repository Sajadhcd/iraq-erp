import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: { email: string; passwordHash: string; employeeId?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new BadRequestException("البريد الإلكتروني مسجل بالفعل.");

    const passwordHash = await bcrypt.hash(data.passwordHash, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
        },
      });

      if (data.employeeId) {
        await tx.employee.update({
          where: { id: data.employeeId },
          data: { userId: user.id },
        });
      }

      return user;
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        employee: {
          include: { role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { employee: true },
    });
    if (!user) throw new NotFoundException("المستخدم غير موجود أو تم حذفه.");
    return user;
  }

  async toggleActive(id: string) {
    const user = await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
