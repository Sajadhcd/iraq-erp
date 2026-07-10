import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HrmsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // DEPARTMENTS
  // ==========================================

  async createDepartment(dto: any) {
    if (!dto.arabicName || !dto.englishName) {
      throw new BadRequestException('الاسم بالعربية والإنجليزية مطلوبان.');
    }

    const code = `DEP-${Date.now().toString().slice(-5)}`;

    return this.prisma.$transaction(async (tx) => {
      const dept = await tx.department.create({
        data: {
          departmentCode: code,
          arabicName: dto.arabicName,
          englishName: dto.englishName,
          parentId: dto.parentId || null,
          managerId: dto.managerId || null,
          description: dto.description || '',
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
        include: {
          parent: true,
          manager: true,
        },
      });

      return dept;
    });
  }

  async getDepartments() {
    return this.prisma.department.findMany({
      where: { deletedAt: null },
      include: {
        parent: true,
        manager: true,
        children: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDepartment(id: string, dto: any, currentUserId?: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!dept || dept.deletedAt) {
      throw new NotFoundException('القسم المطلوب غير موجود.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.department.update({
        where: { id },
        data: {
          arabicName: dto.arabicName !== undefined ? dto.arabicName : dept.arabicName,
          englishName: dto.englishName !== undefined ? dto.englishName : dept.englishName,
          parentId: dto.parentId !== undefined ? dto.parentId : dept.parentId,
          managerId: dto.managerId !== undefined ? dto.managerId : dept.managerId,
          description: dto.description !== undefined ? dto.description : dept.description,
          isActive: dto.isActive !== undefined ? dto.isActive : dept.isActive,
        },
        include: { parent: true, manager: true },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'DEPARTMENT_UPDATED',
          entityName: 'Department',
          entityId: id,
          userId: currentUserId || null,
          oldValues: dept as any,
          newValues: updated as any,
        },
      });

      return updated;
    });
  }

  async deleteDepartment(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: { employees: true, children: true },
    });

    if (!dept || dept.deletedAt) {
      throw new NotFoundException('القسم غير موجود.');
    }

    if (dept.employees.length > 0) {
      throw new BadRequestException('لا يمكن حذف قسم يحتوي على موظفين نشطين.');
    }

    if (dept.children.length > 0) {
      throw new BadRequestException('لا يمكن حذف قسم رئيسي يحتوي على أقسام فرعية.');
    }

    return this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==========================================
  // JOB POSITIONS
  // ==========================================

  async createPosition(dto: any) {
    if (!dto.arabicName || !dto.englishName || !dto.departmentId) {
      throw new BadRequestException('الاسم والقسم مطلوبان لإنشاء الوظيفة.');
    }

    const code = `POS-${Date.now().toString().slice(-5)}`;

    return this.prisma.jobPosition.create({
      data: {
        positionCode: code,
        arabicName: dto.arabicName,
        englishName: dto.englishName,
        departmentId: dto.departmentId,
        description: dto.description || '',
      },
      include: {
        department: true,
      },
    });
  }

  async getPositions(filters?: { departmentId?: string }) {
    const where: any = { deletedAt: null };
    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }

    return this.prisma.jobPosition.findMany({
      where,
      include: { department: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePosition(id: string, dto: any, currentUserId?: string) {
    const pos = await this.prisma.jobPosition.findUnique({
      where: { id },
    });

    if (!pos || pos.deletedAt) {
      throw new NotFoundException('الوظيفة المطلوبة غير موجودة.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.jobPosition.update({
        where: { id },
        data: {
          arabicName: dto.arabicName !== undefined ? dto.arabicName : pos.arabicName,
          englishName: dto.englishName !== undefined ? dto.englishName : pos.englishName,
          departmentId: dto.departmentId !== undefined ? dto.departmentId : pos.departmentId,
          description: dto.description !== undefined ? dto.description : pos.description,
        },
        include: { department: true },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'POSITION_UPDATED',
          entityName: 'JobPosition',
          entityId: id,
          userId: currentUserId || null,
          oldValues: pos as any,
          newValues: updated as any,
        },
      });

      return updated;
    });
  }

  async deletePosition(id: string) {
    const pos = await this.prisma.jobPosition.findUnique({
      where: { id },
      include: { employees: true },
    });

    if (!pos || pos.deletedAt) {
      throw new NotFoundException('الوظيفة غير موجودة.');
    }

    if (pos.employees.length > 0) {
      throw new BadRequestException('لا يمكن حذف وظيفة مسندة حالياً لموظفين.');
    }

    return this.prisma.jobPosition.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==========================================
  // EMPLOYEES
  // ==========================================

  async createEmployee(dto: any, currentUserId?: string) {
    if (!dto.firstName || !dto.lastName || !dto.roleId) {
      throw new BadRequestException('الاسم والدور مطلوبان للموظف الجديد.');
    }

    const employeeNumber = `EMP-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (tx) => {
      // Check unique constraint on National ID or Passport if provided
      if (dto.nationalId) {
        const existing = await tx.employee.findFirst({
          where: { nationalId: dto.nationalId, deletedAt: null },
        });
        if (existing) {
          throw new BadRequestException('الرقم الوطني مسجل بالفعل لموظف آخر.');
        }
      }

      const employee = await tx.employee.create({
        data: {
          employeeNumber,
          firstName: dto.firstName,
          lastName: dto.lastName,
          arabicFullName: dto.arabicFullName || `${dto.firstName} ${dto.lastName}`,
          englishFullName: dto.englishFullName || `${dto.firstName} ${dto.lastName}`,
          nationalId: dto.nationalId || null,
          passportNumber: dto.passportNumber || null,
          gender: dto.gender || null,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          nationality: dto.nationality || null,
          maritalStatus: dto.maritalStatus || null,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
          employmentType: dto.employmentType || 'FULL_TIME',
          branch: dto.branch || '',
          departmentId: dto.departmentId || null,
          positionId: dto.positionId || null,
          managerId: dto.managerId || null,
          email: dto.email || null,
          phone: dto.phone || null,
          address: dto.address || null,
          emergencyContact: dto.emergencyContact || null,
          notes: dto.notes || '',
          status: dto.status || 'ACTIVE',
          userId: dto.userId || null,
          roleId: dto.roleId,
        },
        include: {
          department: true,
          position: true,
          manager: true,
          role: true,
        },
      });

      // Write timeline log
      await tx.employeeTimeline.create({
        data: {
          employeeId: employee.id,
          type: 'CREATED',
          description: `تم إنشاء الموظف برقم وظيفي ${employeeNumber}`,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'EMPLOYEE_CREATED',
          entityName: 'Employee',
          entityId: employee.id,
          userId: currentUserId || null,
          newValues: employee as any,
        },
      });

      return employee;
    });
  }

  async getEmployees(filters: {
    search?: string;
    departmentId?: string;
    positionId?: string;
    branch?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.positionId) where.positionId = filters.positionId;
    if (filters.branch) where.branch = filters.branch;
    if (filters.status) where.status = filters.status;

    if (filters.search) {
      where.OR = [
        { employeeNumber: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { arabicFullName: { contains: filters.search, mode: 'insensitive' } },
        { englishFullName: { contains: filters.search, mode: 'insensitive' } },
        { nationalId: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: {
          department: true,
          position: true,
          manager: true,
          role: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getEmployeeDetails(id: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: true,
        position: true,
        manager: true,
        role: true,
        user: { select: { email: true, isActive: true } },
        documents: { where: { deletedAt: null } },
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!emp) {
      throw new NotFoundException('الموظف المطلوب غير موجود.');
    }

    return emp;
  }

  async updateEmployee(id: string, dto: any, currentUserId?: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!emp || emp.deletedAt) {
      throw new NotFoundException('الموظف غير موجود.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Validate unique National ID if changing
      if (dto.nationalId && dto.nationalId !== emp.nationalId) {
        const existing = await tx.employee.findFirst({
          where: { nationalId: dto.nationalId, deletedAt: null },
        });
        if (existing) {
          throw new BadRequestException('الرقم الوطني مسجل بالفعل لموظف آخر.');
        }
      }

      const updated = await tx.employee.update({
        where: { id },
        data: {
          firstName: dto.firstName !== undefined ? dto.firstName : emp.firstName,
          lastName: dto.lastName !== undefined ? dto.lastName : emp.lastName,
          arabicFullName: dto.arabicFullName !== undefined ? dto.arabicFullName : emp.arabicFullName,
          englishFullName: dto.englishFullName !== undefined ? dto.englishFullName : emp.englishFullName,
          nationalId: dto.nationalId !== undefined ? dto.nationalId : emp.nationalId,
          passportNumber: dto.passportNumber !== undefined ? dto.passportNumber : emp.passportNumber,
          gender: dto.gender !== undefined ? dto.gender : emp.gender,
          dateOfBirth: dto.dateOfBirth !== undefined ? (dto.dateOfBirth ? new Date(dto.dateOfBirth) : null) : emp.dateOfBirth,
          nationality: dto.nationality !== undefined ? dto.nationality : emp.nationality,
          maritalStatus: dto.maritalStatus !== undefined ? dto.maritalStatus : emp.maritalStatus,
          hireDate: dto.hireDate !== undefined ? (dto.hireDate ? new Date(dto.hireDate) : null) : emp.hireDate,
          employmentType: dto.employmentType !== undefined ? dto.employmentType : emp.employmentType,
          branch: dto.branch !== undefined ? dto.branch : emp.branch,
          departmentId: dto.departmentId !== undefined ? dto.departmentId : emp.departmentId,
          positionId: dto.positionId !== undefined ? dto.positionId : emp.positionId,
          managerId: dto.managerId !== undefined ? dto.managerId : emp.managerId,
          email: dto.email !== undefined ? dto.email : emp.email,
          phone: dto.phone !== undefined ? dto.phone : emp.phone,
          address: dto.address !== undefined ? dto.address : emp.address,
          emergencyContact: dto.emergencyContact !== undefined ? dto.emergencyContact : emp.emergencyContact,
          notes: dto.notes !== undefined ? dto.notes : emp.notes,
          status: dto.status !== undefined ? dto.status : emp.status,
          userId: dto.userId !== undefined ? dto.userId : emp.userId,
          roleId: dto.roleId !== undefined ? dto.roleId : emp.roleId,
        },
        include: {
          department: true,
          position: true,
          role: true,
        },
      });

      // Write to employee timeline
      let changeMsg = 'تم تحديث بيانات الموظف الشخصية والمهنية.';
      if (dto.status && dto.status !== emp.status) {
        changeMsg = `تم تغيير حالة الموظف من ${emp.status} إلى ${dto.status}`;
      }
      await tx.employeeTimeline.create({
        data: {
          employeeId: id,
          type: 'UPDATED',
          description: changeMsg,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'EMPLOYEE_UPDATED',
          entityName: 'Employee',
          entityId: id,
          userId: currentUserId || null,
          oldValues: emp as any,
          newValues: updated as any,
        },
      });

      return updated;
    });
  }

  async deleteEmployee(id: string, currentUserId?: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!emp || emp.deletedAt) {
      throw new NotFoundException('الموظف غير موجود.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Soft delete
      const deleted = await tx.employee.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Timeline Log
      await tx.employeeTimeline.create({
        data: {
          employeeId: id,
          type: 'DELETED',
          description: 'تم حذف الموظف من النظام.',
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          action: 'EMPLOYEE_DELETED',
          entityName: 'Employee',
          entityId: id,
          userId: currentUserId || null,
          oldValues: emp as any,
        },
      });

      return deleted;
    });
  }

  // ==========================================
  // EMPLOYEE DOCUMENTS
  // ==========================================

  async uploadDocument(employeeId: string, dto: any) {
    if (!dto.fileName || !dto.fileType || !dto.fileUrl) {
      throw new BadRequestException('بيانات الملف المرفوع غير مكتملة.');
    }

    return this.prisma.$transaction(async (tx) => {
      const doc = await tx.employeeDocument.create({
        data: {
          employeeId,
          fileName: dto.fileName,
          fileType: dto.fileType,
          fileUrl: dto.fileUrl,
        },
      });

      // Timeline Log
      await tx.employeeTimeline.create({
        data: {
          employeeId,
          type: 'DOCUMENT_UPLOADED',
          description: `تم رفع وثيقة جديدة: ${dto.fileName} (${dto.fileType})`,
        },
      });

      return doc;
    });
  }

  async deleteDocument(docId: string) {
    const doc = await this.prisma.employeeDocument.findUnique({
      where: { id: docId },
    });

    if (!doc || doc.deletedAt) {
      throw new NotFoundException('الملف المطلوب غير موجود.');
    }

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.employeeDocument.update({
        where: { id: docId },
        data: { deletedAt: new Date() },
      });

      // Timeline Log
      await tx.employeeTimeline.create({
        data: {
          employeeId: doc.employeeId,
          type: 'DOCUMENT_DELETED',
          description: `تم حذف الوثيقة: ${doc.fileName}`,
        },
      });

      return deleted;
    });
  }

  // ==========================================
  // HRMS DASHBOARD METRICS
  // ==========================================

  async getHrmsDashboard() {
    const [employees, depts] = await Promise.all([
      this.prisma.employee.findMany({ where: { deletedAt: null }, include: { department: true } }),
      this.prisma.department.findMany({ where: { deletedAt: null } }),
    ]);

    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((e) => e.status === 'ACTIVE').length;

    // New employees (hired in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newEmployees = employees.filter((e) => e.hireDate && e.hireDate >= thirtyDaysAgo).length;

    // Employees by department
    const employeesByDept: Record<string, number> = {};
    for (const d of depts) {
      employeesByDept[d.englishName] = 0;
    }
    employeesByDept['Unassigned'] = 0;

    for (const e of employees) {
      if (e.department) {
        const key = e.department.englishName;
        employeesByDept[key] = (employeesByDept[key] || 0) + 1;
      } else {
        employeesByDept['Unassigned']++;
      }
    }

    // Employees by branch
    const employeesByBranch: Record<string, number> = {};
    for (const e of employees) {
      const branchKey = e.branch || 'General';
      employeesByBranch[branchKey] = (employeesByBranch[branchKey] || 0) + 1;
    }

    return {
      totalEmployees,
      activeEmployees,
      newEmployees,
      employeesByDept,
      employeesByBranch,
    };
  }
}
