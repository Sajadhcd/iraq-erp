import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
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
      this.logger.warn(`Login attempt for non-existent or inactive user: ${loginDto.email} from IP: ${ip}`);
      throw new UnauthorizedException('الحساب غير موجود أو تم تعطيله.');
    }

    // Check login lockout
    const lockoutUntil = (user as any).lockoutUntil;
    if (lockoutUntil && new Date(lockoutUntil) > new Date()) {
      const remainingMs = new Date(lockoutUntil).getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      this.logger.warn(`Locked out user attempted login: ${user.email} from IP: ${ip}`);
      throw new UnauthorizedException(`الحساب مقفل مؤقتاً. يرجى المحاولة بعد ${remainingMin} دقيقة.`);
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      // Increment failed attempts
      const failedAttempts = ((user as any).failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: failedAttempts };

      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        this.logger.warn(`User ${user.email} locked out after ${MAX_LOGIN_ATTEMPTS} failed attempts from IP: ${ip}`);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedException('كلمة المرور غير صحيحة.');
    }

    // Reset failed attempts and update lastLogin
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), failedLoginAttempts: 0, lockoutUntil: null },
    });

    // Compile active permissions
    const activePermissions = new Set<string>();

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

    const token = this.jwtService.sign(payload, { expiresIn: '24h' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );

    // Store refresh token hash
    const refreshHash = await bcrypt.hash(refreshToken, 4);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: refreshHash },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        action: 'USER_LOGIN',
        entityName: 'User',
        entityId: user.id,
        userId: user.id,
        ipAddress: ip || null,
        userAgent: userAgent || null,
        newValues: { email: user.email } as any,
      },
    });

    return {
      token,
      refreshToken,
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

  async refreshToken(refreshTokenValue: string) {
    try {
      const decoded = this.jwtService.verify(refreshTokenValue);

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('رمز التحديث غير صالح.');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: {
          employee: { include: { role: true } },
        },
      });

      if (!user || !user.isActive || user.deletedAt) {
        throw new UnauthorizedException('الحساب غير نشط.');
      }

      // Verify refresh token hash
      if (user.refreshTokenHash) {
        const isValid = await bcrypt.compare(refreshTokenValue, user.refreshTokenHash);
        if (!isValid) {
          throw new UnauthorizedException('رمز التحديث غير صالح. يرجى تسجيل الدخول مرة أخرى.');
        }
      }

      const activePermissions = new Set<string>();

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

      const newToken = this.jwtService.sign(payload, { expiresIn: '24h' });
      const newRefreshToken = this.jwtService.sign(
        { sub: user.id, type: 'refresh' },
        { expiresIn: '7d' },
      );

      const refreshHash = await bcrypt.hash(newRefreshToken, 4);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: refreshHash },
      });

      return {
        token: newToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('رمز التحديث منتهي الصلاحية.');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_LOGOUT',
        entityName: 'User',
        entityId: userId,
        userId,
      },
    });

    return { success: true };
  }
}
