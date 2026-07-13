import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { email: loginDto.email },
          { username: loginDto.email },
        ],
      },
      include: {
        employee: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('الحساب غير موجود أو تم تعطيله.');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('كلمة المرور غير صحيحة.');
    }

    // Update lastLogin timestamp asynchronously
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Compile active permissions
    const activePermissions = new Set<string>();

    // 1. Inherit from role
    if (user.employee?.role?.id) {
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: { roleId: user.employee.roleId },
        include: { permission: true },
      });
      rolePermissions.forEach((rp) => {
        if (rp.permission?.action) {
          activePermissions.add(rp.permission.action);
        }
      });
    }

    // 2. User-specific overrides
    const userPermissions = await this.prisma.userPermission.findMany({
      where: { userId: user.id },
      include: { permission: true },
    });
    userPermissions.forEach((up) => {
      if (up.permission?.action) {
        if (up.isAllowed) {
          activePermissions.add(up.permission.action);
        } else {
          activePermissions.delete(up.permission.action);
        }
      }
    });

    const permissionsList = Array.from(activePermissions);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.employee?.role?.name || 'SALES_AGENT',
      permissions: permissionsList,
    };

    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`
          : 'مدير النظام',
        role: user.employee?.role?.name || 'SALES_AGENT',
        permissions: permissionsList,
      },
    };
  }

}
