import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // LEAVE TYPES CRUD
  // ==========================================
  async getLeaveTypes() {
    return this.prisma.leaveType.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLeaveType(dto: any) {
    if (!dto.code || !dto.nameAr || !dto.nameEn || dto.defaultDays === undefined) {
      throw new BadRequestException('البيانات الأساسية لنوع الإجازة ناقصة.');
    }
    const existing = await this.prisma.leaveType.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException('رمز نوع الإجازة موجود بالفعل.');
    }
    return this.prisma.leaveType.create({
      data: {
        code: dto.code,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        defaultDays: parseInt(dto.defaultDays),
        paid: dto.paid !== undefined ? dto.paid : true,
        color: dto.color || '#3B82F6',
        requiresApproval: dto.requiresApproval !== undefined ? dto.requiresApproval : true,
        active: dto.active !== undefined ? dto.active : true,
      },
    });
  }

  async updateLeaveType(id: string, dto: any) {
    const existing = await this.prisma.leaveType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('نوع الإجازة المطلوب غير موجود.');
    }
    return this.prisma.leaveType.update({
      where: { id },
      data: {
        code: dto.code,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        defaultDays: dto.defaultDays !== undefined ? parseInt(dto.defaultDays) : undefined,
        paid: dto.paid,
        color: dto.color,
        requiresApproval: dto.requiresApproval,
        active: dto.active,
      },
    });
  }

  async deleteLeaveType(id: string) {
    const existing = await this.prisma.leaveType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('نوع الإجازة المطلوب غير موجود.');
    }
    return this.prisma.leaveType.delete({
      where: { id },
    });
  }

  // ==========================================
  // LEAVE BALANCE CALCULATION
  // ==========================================
  async getLeaveBalance(employeeId: string, leaveTypeId: string) {
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });
    if (!leaveType) {
      throw new NotFoundException('نوع الإجازة غير موجود.');
    }

    // Sum total approved days
    const approvedRequests = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        leaveTypeId,
        status: 'APPROVED',
      },
    });

    const usedDays = approvedRequests.reduce((acc, curr) => acc + curr.totalDays, 0);
    const remainingDays = leaveType.defaultDays - usedDays;

    return {
      defaultDays: leaveType.defaultDays,
      usedDays,
      remainingDays,
    };
  }

  async getAllLeaveBalances(employeeId: string) {
    const types = await this.getLeaveTypes();
    const balances = [];
    for (const t of types) {
      const bal = await this.getLeaveBalance(employeeId, t.id);
      balances.push({
        leaveTypeId: t.id,
        code: t.code,
        nameAr: t.nameAr,
        nameEn: t.nameEn,
        color: t.color,
        ...bal,
      });
    }
    return balances;
  }

  // ==========================================
  // LEAVE REQUESTS CRUD
  // ==========================================
  async getLeaveRequests(filters: {
    employeeId?: string;
    leaveTypeId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.leaveTypeId) where.leaveTypeId = filters.leaveTypeId;
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.startDate = {};
      if (filters.startDate) where.startDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.startDate.lte = new Date(filters.endDate);
    }

    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        employee: true,
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLeaveRequestById(id: string) {
    const req = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: true,
        leaveType: true,
      },
    });
    if (!req) {
      throw new NotFoundException('طلب الإجازة غير موجود.');
    }
    return req;
  }

  async createLeaveRequest(dto: any, currentUserId?: string) {
    if (!dto.employeeId || !dto.leaveTypeId || !dto.startDate || !dto.endDate) {
      throw new BadRequestException('بيانات طلب الإجازة ناقصة.');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    startDate.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);

    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية.');
    }

    // 1. Calculate total leave days
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

    // 2. Prevent overlapping leave requests (SUBMITTED or APPROVED)
    const overlaps = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId: dto.employeeId,
        status: { in: ['SUBMITTED', 'APPROVED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlaps) {
      throw new BadRequestException('يوجد طلب إجازة متداخل مع التواريخ المحددة.');
    }

    // 3. Verify leave balance
    const bal = await this.getLeaveBalance(dto.employeeId, dto.leaveTypeId);
    if (totalDays > bal.remainingDays) {
      throw new BadRequestException('رصيد الإجازات المتبقي غير كافٍ.');
    }

    const req = await this.prisma.leaveRequest.create({
      data: {
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate,
        endDate,
        totalDays,
        reason: dto.reason || '',
        attachment: dto.attachment || '',
        status: 'DRAFT',
      },
      include: { employee: true, leaveType: true },
    });

    // Audit Log
    await this.prisma.auditLog.create({
      data: {
        action: 'LEAVE_CREATED',
        entityName: 'LeaveRequest',
        entityId: req.id,
        userId: currentUserId || null,
        newValues: req as any,
      },
    });

    return req;
  }

  async updateLeaveRequest(id: string, dto: any, currentUserId?: string) {
    const existing = await this.getLeaveRequestById(id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('يمكن تعديل الطلبات في حالة مسودة فقط.');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    startDate.setHours(0,0,0,0);
    endDate.setHours(0,0,0,0);

    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية.');
    }

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

    // Check overlap
    const overlaps = await this.prisma.leaveRequest.findFirst({
      where: {
        id: { not: id },
        employeeId: existing.employeeId,
        status: { in: ['SUBMITTED', 'APPROVED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlaps) {
      throw new BadRequestException('يوجد طلب إجازة متداخل مع التواريخ المحددة.');
    }

    // Verify balance
    const leaveTypeId = dto.leaveTypeId || existing.leaveTypeId;
    const bal = await this.getLeaveBalance(existing.employeeId, leaveTypeId);
    if (totalDays > bal.remainingDays) {
      throw new BadRequestException('رصيد الإجازات المتبقي غير كافٍ.');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        leaveTypeId,
        startDate,
        endDate,
        totalDays,
        reason: dto.reason !== undefined ? dto.reason : existing.reason,
        attachment: dto.attachment !== undefined ? dto.attachment : existing.attachment,
      },
      include: { employee: true, leaveType: true },
    });

    return updated;
  }

  // ==========================================
  // LEAVE WORKFLOW ACTIONS
  // ==========================================
  async submitLeaveRequest(id: string, currentUserId?: string) {
    const existing = await this.getLeaveRequestById(id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('يمكن تقديم طلب الإجازة في حالة مسودة فقط.');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'SUBMITTED' },
      include: { employee: true, leaveType: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'LEAVE_SUBMITTED',
        entityName: 'LeaveRequest',
        entityId: id,
        userId: currentUserId || null,
        newValues: updated as any,
      },
    });

    return updated;
  }

  async approveLeaveRequest(id: string, approverName: string, currentUserId?: string) {
    const existing = await this.getLeaveRequestById(id);
    if (existing.status !== 'SUBMITTED') {
      throw new BadRequestException('يمكن اعتماد الطلبات المقدمة فقط.');
    }

    // Re-verify balance at approval time
    const bal = await this.getLeaveBalance(existing.employeeId, existing.leaveTypeId);
    if (existing.totalDays > bal.remainingDays) {
      throw new BadRequestException('رصيد الإجازات المتبقي غير كافٍ حالياً لاعتماد الطلب.');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: approverName,
        approvedAt: new Date(),
      },
      include: { employee: true, leaveType: true },
    });

    // 1. Attendance integration: sync approved dates as LEAVE status
    await this.syncLeaveToAttendance(existing.employeeId, existing.startDate, existing.endDate, 'APPROVED');

    await this.prisma.auditLog.create({
      data: {
        action: 'LEAVE_APPROVED',
        entityName: 'LeaveRequest',
        entityId: id,
        userId: currentUserId || null,
        newValues: updated as any,
      },
    });

    return updated;
  }

  async rejectLeaveRequest(id: string, reason: string, currentUserId?: string) {
    const existing = await this.getLeaveRequestById(id);
    if (existing.status !== 'SUBMITTED') {
      throw new BadRequestException('يمكن رفض الطلبات المقدمة فقط.');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
      include: { employee: true, leaveType: true },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'LEAVE_REJECTED',
        entityName: 'LeaveRequest',
        entityId: id,
        userId: currentUserId || null,
        newValues: updated as any,
      },
    });

    return updated;
  }

  async cancelLeaveRequest(id: string, currentUserId?: string) {
    const existing = await this.getLeaveRequestById(id);
    if (existing.status !== 'SUBMITTED' && existing.status !== 'APPROVED') {
      throw new BadRequestException('يمكن إلغاء الطلبات المقدمة أو المعتمدة فقط.');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { employee: true, leaveType: true },
    });

    // Revert/delete Leave attendance sync if previously approved
    if (existing.status === 'APPROVED') {
      await this.syncLeaveToAttendance(existing.employeeId, existing.startDate, existing.endDate, 'CANCELLED');
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'LEAVE_CANCELLED',
        entityName: 'LeaveRequest',
        entityId: id,
        userId: currentUserId || null,
        newValues: updated as any,
      },
    });

    return updated;
  }

  // Attendance Integration Sync Loop
  private async syncLeaveToAttendance(employeeId: string, startDate: Date, endDate: Date, status: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const attendanceDate = new Date(d);
      attendanceDate.setHours(0, 0, 0, 0);

      if (status === 'APPROVED') {
        await this.prisma.attendance.upsert({
          where: {
            employeeId_attendanceDate: { employeeId, attendanceDate },
          },
          update: {
            status: 'LEAVE',
            checkIn: null,
            checkOut: null,
            workHours: 0,
            overtimeHours: 0,
            lateMinutes: 0,
          },
          create: {
            employeeId,
            attendanceDate,
            status: 'LEAVE',
            checkIn: null,
            checkOut: null,
            workHours: 0,
            overtimeHours: 0,
            lateMinutes: 0,
          },
        });
      } else if (status === 'CANCELLED') {
        await this.prisma.attendance.deleteMany({
          where: {
            employeeId,
            attendanceDate,
            status: 'LEAVE',
          },
        });
      }
    }
  }

  // ==========================================
  // LEAVE DASHBOARD STATS
  // ==========================================
  async getLeaveDashboard() {
    const today = new Date();
    today.setHours(0,0,0,0);

    const allRequests = await this.prisma.leaveRequest.findMany();

    const pendingCount = allRequests.filter(r => r.status === 'SUBMITTED').length;
    const approvedCount = allRequests.filter(r => r.status === 'APPROVED').length;
    const rejectedCount = allRequests.filter(r => r.status === 'REJECTED').length;

    // Employees on leave today
    const leavesToday = await this.prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
      },
      include: { employee: true, leaveType: true },
    });

    return {
      stats: {
        pendingRequests: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        onLeaveToday: leavesToday.length,
      },
      employeesOnLeaveToday: leavesToday.map(l => ({
        ...l.employee,
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
      })),
    };
  }
}
