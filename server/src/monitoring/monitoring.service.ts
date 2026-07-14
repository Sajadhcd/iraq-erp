import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger('MonitoringService');
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  private startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  incrementRequests() {
    this.requestCount++;
  }

  incrementErrors() {
    this.errorCount++;
  }

  recordResponseTime(ms: number) {
    this.responseTimes.push(ms);
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-500);
    }
  }

  async getDashboard() {
    const [dbHealth, counts, system] = await Promise.all([
      this.checkDbHealth(),
      this.getEntityCounts(),
      this.getSystemMetrics(),
    ]);

    return {
      server: {
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        totalRequests: this.requestCount,
        totalErrors: this.errorCount,
        errorRate:
          this.requestCount > 0
            ? ((this.errorCount / this.requestCount) * 100).toFixed(2) + '%'
            : '0%',
        avgResponseTime: this.getAvgResponseTime(),
        p95ResponseTime: this.getP95ResponseTime(),
      },
      database: dbHealth,
      counts,
      system,
      alerts: await this.getAlerts(),
      timestamp: new Date().toISOString(),
    };
  }

  async getEntityCounts() {
    try {
      const [
        users,
        employees,
        products,
        customers,
        suppliers,
        sales,
        purchases,
        quotations,
        salesOrders,
        invoices,
      ] = await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.employee.count({ where: { deletedAt: null } }),
        this.prisma.product.count({ where: { deletedAt: null } }),
        this.prisma.customer.count({ where: { deletedAt: null } }),
        this.prisma.supplier.count({ where: { deletedAt: null } }),
        this.prisma.sale.count(),
        this.prisma.purchase.count(),
        this.prisma.quotation.count({ where: { deletedAt: null } }),
        this.prisma.salesOrder.count({ where: { deletedAt: null } }),
        this.prisma.invoice.count(),
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todaySales, todayRevenue, openOrders, activeUsers, failedJobs] =
        await Promise.all([
          this.prisma.sale.count({ where: { createdAt: { gte: today } } }),
          this.prisma.sale.aggregate({
            _sum: { netAmount: true },
            where: { createdAt: { gte: today } },
          }),
          this.prisma.salesOrder.count({
            where: {
              deletedAt: null,
              status: { in: ['DRAFT', 'CONFIRMED', 'PROCESSING'] },
            },
          }),
          this.prisma.user.count({
            where: {
              deletedAt: null,
              isActive: true,
              lastLogin: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          }),
          this.prisma.auditLog.count({
            where: {
              action: { contains: 'FAILED' },
              createdAt: { gte: today },
            },
          }),
        ]);

      return {
        users,
        employees,
        products,
        customers,
        suppliers,
        sales,
        purchases,
        quotations,
        salesOrders,
        invoices,
        todaySales,
        todayRevenue: todayRevenue._sum.netAmount || 0,
        openOrders,
        activeUsers,
        failedJobs,
      };
    } catch (error) {
      this.logger.error('Failed to get entity counts', error);
      return {};
    }
  }

  async checkDbHealth() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', latencyMs: Date.now() - start };
    } catch {
      return { status: 'unhealthy', latencyMs: Date.now() - start };
    }
  }

  async getSystemMetrics() {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const os = require('os');
    const fs = require('fs');

    const freeMem = os.freemem();
    const totalMem = os.totalmem();

    let diskUsage = { total: 0, free: 0, used: 0, percent: '0' };
    try {
      const stats = fs.statSync(process.platform === 'win32' ? 'C:\\' : '/');
      if (process.platform !== 'win32') {
        // Linux disk usage would need exec, simplified here
        diskUsage = { total: 0, free: 0, used: 0, percent: '0' };
      }
    } catch {
      // Ignore disk check errors
    }

    return {
      memory: {
        used: Math.round(mem.heapUsed / 1024 / 1024),
        total: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        systemFree: Math.round(freeMem / 1024 / 1024),
        systemTotal: Math.round(totalMem / 1024 / 1024),
        usagePercent: (((totalMem - freeMem) / totalMem) * 100).toFixed(1),
      },
      cpu: {
        user: cpu.user,
        system: cpu.system,
      },
      disk: diskUsage,
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      loadAverage: os.loadavg(),
      arch: process.arch,
      uptime: os.uptime(),
    };
  }

  async getAlerts() {
    const alerts: { level: string; message: string; timestamp: string }[] = [];

    try {
      const mem = process.memoryUsage();
      const heapUsagePercent = (mem.heapUsed / mem.heapTotal) * 100;
      if (heapUsagePercent > 80) {
        alerts.push({
          level: 'critical',
          message: `High memory usage: ${heapUsagePercent.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
        });
      } else if (heapUsagePercent > 60) {
        alerts.push({
          level: 'warning',
          message: `Moderate memory usage: ${heapUsagePercent.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
        });
      }

      const lowStockProducts = await this.prisma.inventory.count({
        where: {
          quantity: { lte: 10 },
        },
      });
      if (lowStockProducts > 0) {
        alerts.push({
          level: 'warning',
          message: `${lowStockProducts} products with low stock levels`,
          timestamp: new Date().toISOString(),
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lockedUsers = await this.prisma.user.count({
        where: {
          lockoutUntil: { gt: new Date() },
        },
      });
      if (lockedUsers > 0) {
        alerts.push({
          level: 'info',
          message: `${lockedUsers} user(s) currently locked out`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // Silently handle
    }

    return alerts;
  }

  private getAvgResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.responseTimes.length);
  }

  private getP95ResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[idx] || 0;
  }
}
