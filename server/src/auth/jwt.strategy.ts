import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: { sub: string; email: string; role?: string; permissions?: string[] }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        employee: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('الحساب غير نشط أو غير موجود.');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.employee?.role?.name || 'SALES_AGENT',
      name: user.employee
        ? `${user.employee.firstName} ${user.employee.lastName}`
        : 'مستخدم',
      permissions: payload.permissions || [],
    };
  }
}
