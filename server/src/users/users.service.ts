import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // CREATE USER
  // ==========================================
  async create(data: {
    email: string;
    username: string;
    passwordHash: string;
    employeeId?: string;
    roleId?: string;
    currentUserId?: string;
  }) {
    if (!data.email || !data.username || !data.passwordHash) {
      throw new BadRequestException('البريد الإلكتروني واسم المستخدم وكلمة المرور مطلوبة.');
    }

    // Check duplicate email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new BadRequestException('البريد الإلكتروني مسجل بالفعل.');
    }

    // Check duplicate username
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existingUsername) {
      throw new BadRequestException('اسم المستخدم مسجل بالفعل.');
    }

    const hashed = await bcrypt.hash(data.passwordHash, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          username: data.username,
          passwordHash: hashed,
          isActive: true,
        },
      });

      // Handle Employee Link
      if (data.employeeId) {
        // Unlink previous users from this employee if any
        await tx.employee.update({
          where: { id: data.employeeId },
          data: { userId: user.id },
        });

        // Set Role on Employee if provided
        if (data.roleId) {
          await tx.employee.update({
            where: { id: data.employeeId },
            data: { roleId: data.roleId },
          });
        }
      }

      // Log action
      await tx.auditLog.create({
        data: {
          action: 'USER_CREATED',
          entityName: 'User',
          entityId: user.id,
          userId: data.currentUserId || null,
          newValues: { email: user.email, username: user.username } as any,
        },
      });

      return user;
    });
  }

  // ==========================================
  // GET USERS
  // ==========================================
  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        employee: {
          include: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        employee: {
          include: { role: true },
        },
      },
    });
    if (!user) throw new NotFoundException('المستخدم غير موجود أو تم حذفه.');
    return user;
  }

  // ==========================================
  // UPDATE USER
  // ==========================================
  async update(
    id: string,
    data: {
      email: string;
      username: string;
      employeeId?: string;
      roleId?: string;
      currentUserId?: string;
    },
  ) {
    const user = await this.findOne(id);

    // Check duplicate email
    if (data.email !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        throw new BadRequestException('البريد الإلكتروني مسجل بالفعل لمستخدم آخر.');
      }
    }

    // Check duplicate username
    if (data.username !== user.username) {
      const existingUsername = await this.prisma.user.findUnique({
        where: { username: data.username },
      });
      if (existingUsername) {
        throw new BadRequestException('اسم المستخدم مسجل بالفعل لمستخدم آخر.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          email: data.email,
          username: data.username,
        },
      });

      // If user had a previously linked employee, unlink them first
      if (user.employee && user.employee.id !== data.employeeId) {
        await tx.employee.update({
          where: { id: user.employee.id },
          data: { userId: null },
        });
      }

      // Link to new employee
      if (data.employeeId) {
        await tx.employee.update({
          where: { id: data.employeeId },
          data: { userId: id },
        });

        // Set Role on Employee
        if (data.roleId) {
          await tx.employee.update({
            where: { id: data.employeeId },
            data: { roleId: data.roleId },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: 'USER_UPDATED',
          entityName: 'User',
          entityId: id,
          userId: data.currentUserId || null,
          newValues: { email: data.email, username: data.username } as any,
        },
      });

      return updatedUser;
    });
  }

  // ==========================================
  // TOGGLE ACTIVE STATUS
  // ==========================================
  async toggleActive(id: string, currentUserId?: string) {
    const user = await this.findOne(id);
    const nextStatus = !user.isActive;

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: nextStatus },
    });

    await this.prisma.auditLog.create({
      data: {
        action: nextStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityName: 'User',
        entityId: id,
        userId: currentUserId || null,
      },
    });

    return updated;
  }

  // ==========================================
  // PASSWORD RESET (BY ADMIN)
  // ==========================================
  async resetPassword(id: string, passwordHash: string, currentUserId?: string) {
    await this.findOne(id);
    const hashed = await bcrypt.hash(passwordHash, 10);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { passwordHash: hashed },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_PASSWORD_RESET',
        entityName: 'User',
        entityId: id,
        userId: currentUserId || null,
      },
    });

    return updated;
  }

  // ==========================================
  // CHANGE PASSWORD (BY USER THEMSELVES)
  // ==========================================
  async changePassword(
    id: string,
    data: { oldPassword: string; newPassword: string },
    currentUserId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('المستخدم غير موجود.');

    const isMatch = await bcrypt.compare(data.oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('كلمة المرور القديمة غير صحيحة.');
    }

    const hashed = await bcrypt.hash(data.newPassword, 10);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { passwordHash: hashed },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_PASSWORD_CHANGED',
        entityName: 'User',
        entityId: id,
        userId: currentUserId || null,
      },
    });

    return updated;
  }

  // ==========================================
  // REMOVE USER (SOFT DELETE)
  // ==========================================
  async remove(id: string, currentUserId?: string) {
    const user = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Unlink employee to release unique constraint
      if (user.employee) {
        await tx.employee.update({
          where: { id: user.employee.id },
          data: { userId: null },
        });
      }

      const updated = await tx.user.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });

      await tx.auditLog.create({
        data: {
          action: 'USER_DELETED',
          entityName: 'User',
          entityId: id,
          userId: currentUserId || null,
        },
      });

      return updated;
    });
  }
}
