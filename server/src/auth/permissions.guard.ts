import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard (e.g. { userId: string, email: string })
    if (!user || !user.userId) return false;

    // Fetch user details from DB
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        employee: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        userPermissions: {
          include: { permission: true },
        },
      },
    });

    if (!dbUser || !dbUser.isActive) {
      return false;
    }

    // SUPER_ADMIN gets a complete bypass
    const userRoleName = dbUser.employee?.role?.name;
    if (userRoleName === 'SUPER_ADMIN') {
      return true;
    }

    // Compile active permissions
    const activePermissions = new Set<string>();

    // 1. Inherit from role
    if (dbUser.employee?.role?.permissions) {
      dbUser.employee.role.permissions.forEach((rp) => {
        if (rp.permission?.action) {
          activePermissions.add(rp.permission.action);
        }
      });
    }

    // 2. Overlay user-specific overrides
    if (dbUser.userPermissions) {
      dbUser.userPermissions.forEach((up) => {
        if (up.permission?.action) {
          if (up.isAllowed) {
            activePermissions.add(up.permission.action);
          } else {
            activePermissions.delete(up.permission.action);
          }
        }
      });
    }

    // Verify if at least one or all of required permissions are met
    const hasPermission = requiredPermissions.every((perm) => activePermissions.has(perm));
    if (!hasPermission) {
      throw new ForbiddenException('ليس لديك الصلاحيات الكافية لإتمام هذا الإجراء.');
    }

    return true;
  }
}
