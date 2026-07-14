import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger('HealthService');
  private startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  async checkDatabase(): Promise<{ status: string; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
      };
    }
  }

  async getSystemInfo() {
    const memUsage = process.memoryUsage();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const os = require('os');

    return {
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        systemFree: Math.round(os.freemem() / 1024 / 1024),
        systemTotal: Math.round(os.totalmem() / 1024 / 1024),
      },
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      loadAverage: os.loadavg(),
      arch: process.arch,
    };
  }

  async getFullHealth() {
    const [db, system] = await Promise.all([
      this.checkDatabase(),
      this.getSystemInfo(),
    ]);

    const isHealthy = db.status === 'healthy';

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: db,
      system,
    };
  }

  async getReadiness() {
    const db = await this.checkDatabase();
    return {
      ready: db.status === 'healthy',
      database: db.status,
    };
  }

  async getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
}
