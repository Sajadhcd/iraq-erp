import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  LeadStatus,
  LeadPriority,
  ActivityType,
  ActivityStatus,
  OpportunityStage,
} from '@prisma/client';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

// DTO Classes (TypeScript classes for runtime decorator metadata support)
export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  assignedSalespersonId?: string;

  @IsNumber()
  @IsOptional()
  expectedValue?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number;

  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @IsEnum(LeadPriority)
  @IsOptional()
  priority?: LeadPriority;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateLeadDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  assignedSalespersonId?: string;

  @IsNumber()
  @IsOptional()
  expectedValue?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number;

  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @IsEnum(LeadPriority)
  @IsOptional()
  priority?: LeadPriority;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ConvertLeadDto {
  @IsNumber()
  expectedRevenue: number;

  @IsString()
  expectedClosingDate: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number;

  @IsEnum(OpportunityStage)
  @IsOptional()
  stage?: OpportunityStage;

  @IsString()
  @IsOptional()
  assignedUserId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateActivityDto {
  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsOptional()
  opportunityId?: string;

  @IsEnum(ActivityType)
  type: ActivityType;

  @IsString()
  date: string;

  @IsString()
  @IsOptional()
  reminder?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  assignedUserId?: string;

  @IsEnum(ActivityStatus)
  @IsOptional()
  status?: ActivityStatus;
}

export class UpdateActivityDto {
  @IsEnum(ActivityType)
  @IsOptional()
  type?: ActivityType;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  reminder?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  assignedUserId?: string;

  @IsEnum(ActivityStatus)
  @IsOptional()
  status?: ActivityStatus;
}

@Injectable()
export class CRMService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // LEADS
  // ==========================================

  async createLead(data: CreateLeadDto, currentUserId?: string) {
    const leadNumber = `LD-${Date.now().toString().slice(-6)}`;

    const lead = await this.prisma.lead.create({
      data: {
        leadNumber,
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        mobile: data.mobile,
        email: data.email,
        country: data.country,
        city: data.city,
        address: data.address,
        industry: data.industry,
        source: data.source,
        assignedSalespersonId: data.assignedSalespersonId,
        expectedValue: data.expectedValue,
        probability: data.probability || 0,
        status: data.status || LeadStatus.NEW,
        priority: data.priority || LeadPriority.MEDIUM,
        notes: data.notes,
      },
    });

    // Record timeline event
    await this.prisma.leadTimeline.create({
      data: {
        leadId: lead.id,
        type: 'LEAD_CREATED',
        description: `Lead created with number ${leadNumber} for company ${data.companyName}`,
        userId: currentUserId,
      },
    });

    return lead;
  }

  async getLeads(filters: {
    page?: number;
    limit?: number;
    status?: LeadStatus;
    priority?: LeadPriority;
    salespersonId?: string;
    industry?: string;
    search?: string;
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = { deletedAt: null };

    if (filters.status) whereClause.status = filters.status;
    if (filters.priority) whereClause.priority = filters.priority;
    if (filters.salespersonId)
      whereClause.assignedSalespersonId = filters.salespersonId;
    if (filters.industry) whereClause.industry = filters.industry;

    if (filters.search) {
      whereClause.OR = [
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { contactPerson: { contains: filters.search, mode: 'insensitive' } },
        { mobile: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { leadNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderField = filters.orderBy || 'createdAt';
    const orderDirection = filters.orderDir || 'desc';

    const [total, items] = await Promise.all([
      this.prisma.lead.count({ where: whereClause }),
      this.prisma.lead.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderField]: orderDirection },
        include: { assignedSalesperson: true },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async getLead(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedSalesperson: true,
        opportunities: {
          where: { deletedAt: null },
          include: { assignedUser: true },
        },
        activities: {
          include: { assignedUser: true },
          orderBy: { date: 'asc' },
        },
        timelineEvents: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead || lead.deletedAt)
      throw new NotFoundException('العميل المحتمل غير موجود.');
    return lead;
  }

  async updateLead(id: string, data: UpdateLeadDto, currentUserId?: string) {
    const oldLead = await this.getLead(id);

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        mobile: data.mobile,
        email: data.email,
        country: data.country,
        city: data.city,
        address: data.address,
        industry: data.industry,
        source: data.source,
        assignedSalespersonId: data.assignedSalespersonId,
        expectedValue: data.expectedValue,
        probability: data.probability,
        status: data.status,
        priority: data.priority,
        notes: data.notes,
      },
    });

    // Write timeline events
    if (data.status && data.status !== oldLead.status) {
      await this.prisma.leadTimeline.create({
        data: {
          leadId: id,
          type: 'STATUS_CHANGED',
          description: `Status changed from ${oldLead.status} to ${data.status}`,
          userId: currentUserId,
        },
      });
    }

    if (
      data.assignedSalespersonId &&
      data.assignedSalespersonId !== oldLead.assignedSalespersonId
    ) {
      await this.prisma.leadTimeline.create({
        data: {
          leadId: id,
          type: 'SALESPERSON_ASSIGNED',
          description: `Lead assigned to salesperson`,
          userId: currentUserId,
        },
      });
    }

    return updated;
  }

  async deleteLead(id: string, currentUserId?: string) {
    await this.getLead(id);

    await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.leadTimeline.create({
      data: {
        leadId: id,
        type: 'LEAD_DELETED',
        description: `Lead soft deleted`,
        userId: currentUserId,
      },
    });

    return { success: true };
  }

  // ==========================================
  // CONVERT LEAD TO OPPORTUNITY
  // ==========================================

  async convertLead(
    leadId: string,
    data: ConvertLeadDto,
    currentUserId?: string,
  ) {
    const lead = await this.getLead(leadId);

    if (lead.status === LeadStatus.WON) {
      throw new BadRequestException('تم تحويل هذا العميل بالفعل بنجاح.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Lead Status
      await tx.lead.update({
        where: { id: leadId },
        data: { status: LeadStatus.WON },
      });

      // 2. Create Opportunity
      const opp = await tx.opportunity.create({
        data: {
          leadId,
          expectedRevenue: data.expectedRevenue,
          expectedClosingDate: new Date(data.expectedClosingDate),
          probability: data.probability || 50,
          stage: data.stage || OpportunityStage.QUALIFICATION,
          assignedUserId: data.assignedUserId || lead.assignedSalespersonId,
          notes: data.notes,
        },
      });

      // 3. Log Timeline Event
      await tx.leadTimeline.create({
        data: {
          leadId,
          type: 'LEAD_CONVERTED',
          description: `Converted Lead to Opportunity with expected revenue: ${data.expectedRevenue}`,
          userId: currentUserId,
        },
      });

      return opp;
    });
  }

  // ==========================================
  // OPPORTUNITIES
  // ==========================================

  async getOpportunities(filters: {
    page?: number;
    limit?: number;
    stage?: OpportunityStage;
    assignedUserId?: string;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = { deletedAt: null };
    if (filters.stage) whereClause.stage = filters.stage;
    if (filters.assignedUserId)
      whereClause.assignedUserId = filters.assignedUserId;

    const [total, items] = await Promise.all([
      this.prisma.opportunity.count({ where: whereClause }),
      this.prisma.opportunity.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { lead: true, assignedUser: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async getOpportunity(id: string) {
    const opp = await this.prisma.opportunity.findUnique({
      where: { id },
      include: { lead: true, assignedUser: true, activities: true },
    });
    if (!opp || opp.deletedAt)
      throw new NotFoundException('الفرصة البيعية غير موجودة.');
    return opp;
  }

  async updateOpportunity(id: string, data: any, currentUserId?: string) {
    const oldOpp = await this.getOpportunity(id);

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: {
        expectedRevenue: data.expectedRevenue,
        expectedClosingDate: data.expectedClosingDate
          ? new Date(data.expectedClosingDate)
          : undefined,
        probability: data.probability,
        stage: data.stage,
        assignedUserId: data.assignedUserId,
        notes: data.notes,
      },
    });

    if (data.stage && data.stage !== oldOpp.stage) {
      await this.prisma.leadTimeline.create({
        data: {
          leadId: oldOpp.leadId,
          type: 'STAGE_CHANGED',
          description: `Opportunity stage changed from ${oldOpp.stage} to ${data.stage}`,
          userId: currentUserId,
        },
      });
    }

    return updated;
  }

  async deleteOpportunity(id: string, currentUserId?: string) {
    const opp = await this.getOpportunity(id);
    await this.prisma.opportunity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.leadTimeline.create({
      data: {
        leadId: opp.leadId,
        type: 'OPPORTUNITY_DELETED',
        description: `Opportunity soft deleted`,
        userId: currentUserId,
      },
    });

    return { success: true };
  }

  // ==========================================
  // ACTIVITIES
  // ==========================================

  async createActivity(data: CreateActivityDto, currentUserId?: string) {
    const activity = await this.prisma.activity.create({
      data: {
        leadId: data.leadId,
        opportunityId: data.opportunityId,
        type: data.type,
        date: new Date(data.date),
        reminder: data.reminder ? new Date(data.reminder) : null,
        notes: data.notes,
        assignedUserId: data.assignedUserId || currentUserId,
        status: data.status || ActivityStatus.PENDING,
      },
    });

    if (data.leadId) {
      await this.prisma.leadTimeline.create({
        data: {
          leadId: data.leadId,
          type: `SCHEDULED_${data.type}`,
          description: `Scheduled a new ${data.type} activity for ${new Date(data.date).toLocaleDateString()}`,
          userId: currentUserId,
        },
      });
    }

    return activity;
  }

  async updateActivity(
    id: string,
    data: UpdateActivityDto,
    currentUserId?: string,
  ) {
    const oldAct = await this.prisma.activity.findUnique({ where: { id } });
    if (!oldAct) throw new NotFoundException('النشاط غير موجود.');

    const updated = await this.prisma.activity.update({
      where: { id },
      data: {
        type: data.type,
        date: data.date ? new Date(data.date) : undefined,
        reminder: data.reminder ? new Date(data.reminder) : undefined,
        notes: data.notes,
        assignedUserId: data.assignedUserId,
        status: data.status,
      },
    });

    if (data.status && data.status !== oldAct.status && updated.leadId) {
      await this.prisma.leadTimeline.create({
        data: {
          leadId: updated.leadId,
          type: `ACTIVITY_${data.status}`,
          description: `${updated.type} activity marked as ${data.status}: ${data.notes || ''}`,
          userId: currentUserId,
        },
      });
    }

    return updated;
  }

  async deleteActivity(id: string) {
    await this.prisma.activity.delete({ where: { id } });
    return { success: true };
  }

  // ==========================================
  // FILE ATTACHMENTS
  // ==========================================

  async addAttachment(
    leadId: string,
    file: {
      fileName: string;
      filePath: string;
      mimeType: string;
      size: number;
    },
    currentUserId?: string,
  ) {
    const attach = await this.prisma.attachment.create({
      data: {
        leadId,
        fileName: file.fileName,
        filePath: file.filePath,
        mimeType: file.mimeType,
        size: file.size,
      },
    });

    await this.prisma.leadTimeline.create({
      data: {
        leadId,
        type: 'ATTACHMENT_ADDED',
        description: `Uploaded file attachment: ${file.fileName}`,
        userId: currentUserId,
      },
    });

    return attach;
  }

  // ==========================================
  // DASHBOARD METRICS
  // ==========================================

  async getCRMDashboard() {
    // 1. Total active leads count
    const totalLeads = await this.prisma.lead.count({
      where: { deletedAt: null },
    });

    // 2. Leads count by status
    const statusCounts = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: true,
    });

    const newLeads = await this.prisma.lead.count({
      where: { status: LeadStatus.NEW, deletedAt: null },
    });

    // 3. Won & Lost Opportunities count
    const wonCount = await this.prisma.opportunity.count({
      where: { stage: OpportunityStage.CLOSED_WON, deletedAt: null },
    });

    const lostCount = await this.prisma.opportunity.count({
      where: { stage: OpportunityStage.CLOSED_LOST, deletedAt: null },
    });

    // 4. Pipeline Value (sum of expected revenues of active opportunities)
    const pipelineSum = await this.prisma.opportunity.aggregate({
      where: {
        stage: {
          notIn: [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST],
        },
        deletedAt: null,
      },
      _sum: { expectedRevenue: true },
    });

    const pipelineValue = pipelineSum._sum.expectedRevenue?.toNumber() || 0;

    // 5. Conversion Rate
    const totalConversions = wonCount;
    const totalCompletedLeads = await this.prisma.lead.count({
      where: {
        status: { in: [LeadStatus.WON, LeadStatus.LOST] },
        deletedAt: null,
      },
    });

    let conversionRate = 0;
    if (totalCompletedLeads > 0) {
      conversionRate = parseFloat(
        ((totalConversions / totalCompletedLeads) * 100).toFixed(2),
      );
    }

    // 6. Opportunities Funnel Stage Distribution
    const funnelStages = await this.prisma.opportunity.groupBy({
      by: ['stage'],
      where: { deletedAt: null },
      _count: true,
      _sum: { expectedRevenue: true },
    });

    const mappedFunnel = funnelStages.map((item) => ({
      stage: item.stage,
      count: item._count,
      value: item._sum.expectedRevenue?.toNumber() || 0,
    }));

    // 7. Monthly lead creation trend (last 6 months)
    const monthlyLeads = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const count = await this.prisma.lead.count({
        where: {
          createdAt: { gte: start, lte: end },
          deletedAt: null,
        },
      });

      const monthName = d.toLocaleString(i18nLanguagePlaceholder(), {
        month: 'short',
      });
      monthlyLeads.push({ month: monthName, count });
    }

    return {
      totalLeads,
      newLeads,
      wonDeals: wonCount,
      lostDeals: lostCount,
      pipelineValue,
      conversionRate,
      funnel: mappedFunnel,
      leadsTrend: monthlyLeads,
      statusDistribution: statusCounts.map((s) => ({
        status: s.status,
        count: s._count,
      })),
    };
  }
}

// Simple language helper for trend chart dates
function i18nLanguagePlaceholder() {
  return 'en-US';
}
