import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
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

    const payload = { sub: user.id, email: user.email };
    return {
      token: this.jwtService.sign(payload),
      user: {
        email: user.email,
        name: user.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`
          : 'مدير النظام',
        role: user.employee?.role?.name || 'SALES_AGENT',
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });
    if (existing) {
      throw new BadRequestException('البريد الإلكتروني مسجل بالفعل.');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Find or create role
    let role = await this.prisma.role.findFirst({
      where: { name: registerDto.roleName },
    });
    if (!role) {
      role = await this.prisma.role.create({
        data: {
          name: registerDto.roleName,
          description: `دور ${registerDto.roleName} في النظام`,
        },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: registerDto.email,
          passwordHash,
        },
      });

      const employee = await tx.employee.create({
        data: {
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          phone: registerDto.phone,
          userId: user.id,
          roleId: role.id,
        },
      });

      return {
        id: user.id,
        email: user.email,
        employeeName: `${employee.firstName} ${employee.lastName}`,
      };
    });
  }
}
