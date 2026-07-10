import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  // Helper to calculate hours, overtime, and late minutes
  private calculateMetrics(checkIn: Date | null, checkOut: Date | null, attendanceDate: Date) {
    let workHours = 0;
    let overtimeHours = 0;
    let lateMinutes = 0;

    if (checkIn) {
      // Calculate late minutes: baseline is 09:00 AM on the attendance date
      const checkInTime = new Date(checkIn);
      const baseline = new Date(checkInTime);
      baseline.setHours(9, 0, 0, 0);
      if (checkInTime.getTime() > baseline.getTime()) {
        lateMinutes = Math.floor((checkInTime.getTime() - baseline.getTime()) / 60000);
      }

      if (checkOut) {
        const checkOutTime = new Date(checkOut);
        const diffMs = checkOutTime.getTime() - checkInTime.getTime();
        if (diffMs < 0) {
          throw new BadRequestException('وقت الانصراف لا يمكن أن يكون قبل وقت الحضور.');
        }
        const totalHours = Number((diffMs / 3600000).toFixed(2));
        workHours = totalHours;
        // Overtime is any work exceeding 8 hours
        if (totalHours > 8) {
          overtimeHours = Number((totalHours - 8).toFixed(2));
        }
      }
    }

    return { workHours, overtimeHours, lateMinutes };
  }

  // ==========================================
  // CHECK IN
  // ==========================================
  async checkIn(dto: { employeeId: string; checkInTime?: string; notes?: string }, currentUserId?: string) {
    if (!dto.employeeId) {
      throw new BadRequestException('معرف الموظف مطلوب.');
    }

    const checkInDate = dto.checkInTime ? new Date(dto.checkInTime) : new Date();
    // Normalize date to YYYY-MM-DD
    const attendanceDate = new Date(checkInDate);
    attendanceDate.setHours(0, 0, 0, 0);

    return this.prisma.$transaction(async (tx) => {
      // Check for duplicate attendance on the same day
      const existing = await tx.attendance.findUnique({
        where: {
          employeeId_attendanceDate: {
            employeeId: dto.employeeId,
            attendanceDate,
          },
        },
      });

      if (existing) {
        throw new BadRequestException('تم تسجيل حضور للموظف بالفعل في هذا اليوم.');
      }

      const metrics = this.calculateMetrics(checkInDate, null, attendanceDate);

      const att = await tx.attendance.create({
        data: {
          employeeId: dto.employeeId,
          attendanceDate,
          checkIn: checkInDate,
          checkOut: null,
          workHours: metrics.workHours,
          overtimeHours: metrics.overtimeHours,
          lateMinutes: metrics.lateMinutes,
          status: 'PRESENT',
          notes: dto.notes || '',
        },
        include: { employee: true },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'ATTENDANCE_CHECK_IN',
          entityName: 'Attendance',
          entityId: att.id,
          userId: currentUserId || null,
          newValues: att as any,
        },
      });

      return att;
    });
  }

  // ==========================================
  // CHECK OUT
  // ==========================================
  async checkOut(dto: { employeeId: string; checkOutTime?: string; notes?: string }, currentUserId?: string) {
    if (!dto.employeeId) {
      throw new BadRequestException('معرف الموظف مطلوب.');
    }

    const checkOutDate = dto.checkOutTime ? new Date(dto.checkOutTime) : new Date();
    // Normalize date to YYYY-MM-DD
    const attendanceDate = new Date(checkOutDate);
    attendanceDate.setHours(0, 0, 0, 0);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.attendance.findUnique({
        where: {
          employeeId_attendanceDate: {
            employeeId: dto.employeeId,
            attendanceDate,
          },
        },
      });

      if (!existing) {
        throw new NotFoundException('سجل الحضور لهذا اليوم غير موجود. يرجى تسجيل الحضور أولاً.');
      }

      if (existing.checkOut) {
        throw new BadRequestException('تم تسجيل الانصراف بالفعل لهذا اليوم.');
      }

      if (!existing.checkIn) {
        throw new BadRequestException('سجل الحضور لا يحتوي على وقت دخول.');
      }

      const metrics = this.calculateMetrics(existing.checkIn, checkOutDate, attendanceDate);

      const updated = await tx.attendance.update({
        where: { id: existing.id },
        data: {
          checkOut: checkOutDate,
          workHours: metrics.workHours,
          overtimeHours: metrics.overtimeHours,
          notes: dto.notes ? `${existing.notes}\n${dto.notes}` : existing.notes,
        },
        include: { employee: true },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'ATTENDANCE_CHECK_OUT',
          entityName: 'Attendance',
          entityId: updated.id,
          userId: currentUserId || null,
          oldValues: existing as any,
          newValues: updated as any,
        },
      });

      return updated;
    });
  }

  // ==========================================
  // MANUAL CRUD - CREATE
  // ==========================================
  async createAttendance(dto: any, currentUserId?: string) {
    if (!dto.employeeId || !dto.attendanceDate || !dto.status) {
      throw new BadRequestException('البيانات الأساسية للحضور ناقصة.');
    }

    const attendanceDate = new Date(dto.attendanceDate);
    attendanceDate.setHours(0, 0, 0, 0);

    const checkIn = dto.checkIn ? new Date(dto.checkIn) : null;
    const checkOut = dto.checkOut ? new Date(dto.checkOut) : null;

    if (checkIn && checkOut && checkOut.getTime() < checkIn.getTime()) {
      throw new BadRequestException('وقت الانصراف لا يمكن أن يكون قبل وقت الحضور.');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.attendance.findUnique({
        where: {
          employeeId_attendanceDate: {
            employeeId: dto.employeeId,
            attendanceDate,
          },
        },
      });

      if (existing) {
        throw new BadRequestException('تم تسجيل حضور للموظف بالفعل في هذا اليوم.');
      }

      const metrics = this.calculateMetrics(checkIn, checkOut, attendanceDate);

      const att = await tx.attendance.create({
        data: {
          employeeId: dto.employeeId,
          attendanceDate,
          checkIn,
          checkOut,
          workHours: metrics.workHours,
          overtimeHours: metrics.overtimeHours,
          lateMinutes: metrics.lateMinutes,
          status: dto.status,
          notes: dto.notes || '',
        },
        include: { employee: true },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'ATTENDANCE_CREATED',
          entityName: 'Attendance',
          entityId: att.id,
          userId: currentUserId || null,
          newValues: att as any,
        },
      });

      return att;
    });
  }

  // ==========================================
  // MANUAL CRUD - UPDATE
  // ==========================================
  async updateAttendance(id: string, dto: any, currentUserId?: string) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('سجل الحضور المطلوب غير موجود.');
    }

    const checkIn = dto.checkIn !== undefined ? (dto.checkIn ? new Date(dto.checkIn) : null) : existing.checkIn;
    const checkOut = dto.checkOut !== undefined ? (dto.checkOut ? new Date(dto.checkOut) : null) : existing.checkOut;

    if (checkIn && checkOut && checkOut.getTime() < checkIn.getTime()) {
      throw new BadRequestException('وقت الانصراف لا يمكن أن يكون قبل وقت الحضور.');
    }

    const metrics = this.calculateMetrics(checkIn, checkOut, existing.attendanceDate);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.attendance.update({
        where: { id },
        data: {
          checkIn,
          checkOut,
          workHours: metrics.workHours,
          overtimeHours: metrics.overtimeHours,
          lateMinutes: metrics.lateMinutes,
          status: dto.status !== undefined ? dto.status : existing.status,
          notes: dto.notes !== undefined ? dto.notes : existing.notes,
        },
        include: { employee: true },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'ATTENDANCE_UPDATED',
          entityName: 'Attendance',
          entityId: id,
          userId: currentUserId || null,
          oldValues: existing as any,
          newValues: updated as any,
        },
      });

      return updated;
    });
  }

  // ==========================================
  // MANUAL CRUD - DELETE
  // ==========================================
  async deleteAttendance(id: string, currentUserId?: string) {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('سجل الحضور المطلوب غير موجود.');
    }

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.attendance.delete({
        where: { id },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'ATTENDANCE_DELETED',
          entityName: 'Attendance',
          entityId: id,
          userId: currentUserId || null,
          oldValues: existing as any,
        },
      });

      return deleted;
    });
  }

  // ==========================================
  // LIST ATTENDANCE
  // ==========================================
  async getAttendanceList(filters: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.attendanceDate = {};
      if (filters.startDate) {
        where.attendanceDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.attendanceDate.lte = new Date(filters.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        include: { employee: true },
        orderBy: { attendanceDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ==========================================
  // GET ATTENDANCE BY EMPLOYEE
  // ==========================================
  async getAttendanceByEmployee(employeeId: string, filters: { startDate?: string; endDate?: string }) {
    const where: any = { employeeId };

    if (filters.startDate || filters.endDate) {
      where.attendanceDate = {};
      if (filters.startDate) {
        where.attendanceDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.attendanceDate.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.attendance.findMany({
      where,
      orderBy: { attendanceDate: 'desc' },
    });
  }

  // ==========================================
  // GET MONTHLY ATTENDANCE SUMMARY
  // ==========================================
  async getMonthlyAttendance(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // last day of month

    const attendances = await this.prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { employee: true },
    });

    // Compute basic statistics
    const totalRecords = attendances.length;
    const presentCount = attendances.filter((a) => a.status === 'PRESENT').length;
    const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;
    const leaveCount = attendances.filter((a) => a.status === 'LEAVE').length;
    const holidayCount = attendances.filter((a) => a.status === 'HOLIDAY').length;

    const totalWorkHours = attendances.reduce((acc, curr) => acc + Number(curr.workHours), 0);
    const totalOvertimeHours = attendances.reduce((acc, curr) => acc + Number(curr.overtimeHours), 0);
    const totalLateMinutes = attendances.reduce((acc, curr) => acc + curr.lateMinutes, 0);

    return {
      stats: {
        totalRecords,
        presentCount,
        absentCount,
        leaveCount,
        holidayCount,
        totalWorkHours: Number(totalWorkHours.toFixed(2)),
        totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
        totalLateMinutes,
      },
      records: attendances,
    };
  }
}
