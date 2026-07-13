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

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new BadRequestException('البريد الإلكتروني مسجل بالفعل.');
    }

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

      if (data.employeeId) {
        await tx.employee.update({
          where: { id: data.employeeId },
          data: { userId: user.id },
        });

        if (data.roleId) {
          await tx.employee.update({
            where: { id: data.employeeId },
            data: { roleId: data.roleId },
          });
        }
      }

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

    if (data.email !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        throw new BadRequestException('البريد الإلكتروني مسجل بالفعل لمستخدم آخر.');
      }
    }

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

      if (user.employee && user.employee.id !== data.employeeId) {
        await tx.employee.update({
          where: { id: user.employee.id },
          data: { userId: null },
        });
      }

      if (data.employeeId) {
        await tx.employee.update({
          where: { id: data.employeeId },
          data: { userId: id },
        });

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
  // CHANGE PASSWORD
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
  // REMOVE USER
  // ==========================================
  async remove(id: string, currentUserId?: string) {
    const user = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
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

  // ==========================================
  // ROLES MANAGEMENT
  // ==========================================
  async getRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createRole(data: { name: string; description?: string; permissionIds?: string[]; currentUserId?: string }) {
    const existing = await this.prisma.role.findUnique({ where: { name: data.name } });
    if (existing) throw new BadRequestException('اسم الدور مسجل بالفعل.');

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: data.name,
          description: data.description,
        },
      });

      if (data.permissionIds) {
        for (const pId of data.permissionIds) {
          await tx.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: pId,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: 'ROLE_CREATED',
          entityName: 'Role',
          entityId: role.id,
          userId: data.currentUserId || null,
          newValues: { name: role.name } as any,
        },
      });

      return role;
    });
  }

  async updateRole(id: string, data: { name: string; description?: string; permissionIds?: string[]; currentUserId?: string }) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('الدور غير موجود.');

    if (data.name !== role.name) {
      const existing = await this.prisma.role.findUnique({ where: { name: data.name } });
      if (existing) throw new BadRequestException('اسم الدور مسجل بالفعل لدور آخر.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
        },
      });

      await tx.rolePermission.deleteMany({ where: { roleId: id } });

      if (data.permissionIds) {
        for (const pId of data.permissionIds) {
          await tx.rolePermission.create({
            data: {
              roleId: id,
              permissionId: pId,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: 'ROLE_UPDATED',
          entityName: 'Role',
          entityId: id,
          userId: data.currentUserId || null,
          newValues: { name: data.name } as any,
        },
      });

      return updated;
    });
  }

  async deleteRole(id: string, currentUserId?: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('الدور غير موجود.');

    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      const deleted = await tx.role.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          action: 'ROLE_DELETED',
          entityName: 'Role',
          entityId: id,
          userId: currentUserId || null,
        },
      });

      return deleted;
    });
  }

  // ==========================================
  // PERMISSIONS & MATRIX
  // ==========================================
  async getPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { action: 'asc' },
    });
  }

  async updateMatrix(data: { matrix: { roleId: string; permissionId: string; granted: boolean }[]; currentUserId?: string }) {
    return this.prisma.$transaction(async (tx) => {
      for (const item of data.matrix) {
        if (item.granted) {
          await tx.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: item.roleId,
                permissionId: item.permissionId,
              },
            },
            update: {},
            create: {
              roleId: item.roleId,
              permissionId: item.permissionId,
            },
          });
        } else {
          await tx.rolePermission.deleteMany({
            where: {
              roleId: item.roleId,
              permissionId: item.permissionId,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: 'PERMISSION_MATRIX_UPDATED',
          entityName: 'RolePermission',
          entityId: 'MATRIX',
          userId: data.currentUserId || null,
        },
      });

      return { success: true };
    });
  }

  // ==========================================
  // USER PERMISSION OVERRIDES
  // ==========================================
  async getUserPermissions(userId: string) {
    const user = await this.findOne(userId);
    const allPermissions = await this.getPermissions();

    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { roleId: user.employee?.roleId || '' },
    });
    const inheritedIds = new Set(rolePerms.map((rp) => rp.permissionId));

    const overrides = await this.prisma.userPermission.findMany({
      where: { userId },
    });
    const overrideMap = new Map(overrides.map((o) => [o.permissionId, o.isAllowed]));

    return allPermissions.map((p) => {
      const isInherited = inheritedIds.has(p.id);
      const userOverride = overrideMap.get(p.id);

      let overrideStatus = 'INHERIT';
      if (userOverride !== undefined) {
        overrideStatus = userOverride ? 'ALLOW' : 'DENY';
      }

      let active = isInherited;
      if (overrideStatus === 'ALLOW') active = true;
      if (overrideStatus === 'DENY') active = false;

      return {
        id: p.id,
        action: p.action,
        description: p.description,
        inherited: isInherited,
        overrideStatus,
        active,
      };
    });
  }

  async updateUserPermissions(userId: string, data: { overrides: { permissionId: string; status: 'ALLOW' | 'DENY' | 'INHERIT' }[]; currentUserId?: string }) {
    await this.findOne(userId);

    return this.prisma.$transaction(async (tx) => {
      for (const item of data.overrides) {
        await tx.userPermission.deleteMany({
          where: {
            userId,
            permissionId: item.permissionId,
          },
        });

        if (item.status === 'ALLOW') {
          await tx.userPermission.create({
            data: {
              userId,
              permissionId: item.permissionId,
              isAllowed: true,
            },
          });
        } else if (item.status === 'DENY') {
          await tx.userPermission.create({
            data: {
              userId,
              permissionId: item.permissionId,
              isAllowed: false,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: 'USER_OVERRIDES_UPDATED',
          entityName: 'UserPermission',
          entityId: userId,
          userId: data.currentUserId || null,
        },
      });

      return { success: true };
    });
  }

  // ==========================================
  // AUDIT LOGS & SESSION METRICS
  // ==========================================
  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        user: {
          include: { employee: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getSessionMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeUsers, totalUsers, usersLoggedInToday, totalAuditEntries] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { lastLogin: { gte: today }, deletedAt: null } }),
      this.prisma.auditLog.count(),
    ]);

    return {
      activeUsers,
      totalUsers,
      usersLoggedInToday,
      totalAuditEntries,
    };
  }
}
