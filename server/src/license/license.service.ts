import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as os from 'os';

@Injectable()
export class LicenseService {
  private readonly logger = new Logger('LicenseService');

  constructor(private readonly prisma: PrismaService) {}

  async validateLicense(key: string): Promise<{ valid: boolean; message: string; license?: any }> {
    try {
      if (!key || typeof key !== 'string') {
        throw new BadRequestException('License key is required');
      }

      const trimmedKey = key.trim();
      if (trimmedKey.length < 10 || trimmedKey.length > 500) {
        throw new BadRequestException('Invalid license key format');
      }

      const license = await this.prisma.license.findUnique({
        where: { licenseKey: trimmedKey },
      });

      if (!license) {
        return { valid: false, message: 'License key not found' };
      }

      if (!license.isActive) {
        return { valid: false, message: 'License is inactive' };
      }

      if (new Date() > license.expiresAt) {
        return { valid: false, message: 'License has expired' };
      }

      const fingerprint = this.getLicenseFingerprint();
      if (license.fingerprint && license.fingerprint !== fingerprint) {
        return { valid: false, message: 'License is bound to a different machine' };
      }

      await this.prisma.license.update({
        where: { id: license.id },
        data: { lastValidated: new Date() },
      });

      const currentUserCount = await this.prisma.user.count();
      if (license.maxUsers < currentUserCount) {
        return {
          valid: false,
          message: `License allows ${license.maxUsers} users but ${currentUserCount} are active`,
        };
      }

      return { valid: true, message: 'License is valid', license };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`License validation failed: ${(error as Error).message}`);
      throw new BadRequestException('Failed to validate license');
    }
  }

  async activateLicense(
    key: string,
    companyName: string,
    companyEmail: string,
  ): Promise<{ success: boolean; message: string; license?: any }> {
    try {
      if (!key || !companyName || !companyEmail) {
        throw new BadRequestException('License key, company name, and company email are required');
      }

      const trimmedKey = key.trim();
      const license = await this.prisma.license.findUnique({
        where: { licenseKey: trimmedKey },
      });

      if (!license) {
        throw new NotFoundException('License key not found');
      }

      if (license.isActive) {
        return { success: false, message: 'License is already active' };
      }

      if (new Date() > license.expiresAt) {
        return { success: false, message: 'License has expired and cannot be activated' };
      }

      const fingerprint = this.getLicenseFingerprint();

      const updatedLicense = await this.prisma.license.update({
        where: { id: license.id },
        data: {
          isActive: true,
          activatedAt: new Date(),
          companyName,
          companyEmail,
          fingerprint,
          lastValidated: new Date(),
        },
      });

      this.logger.log(`License activated for company: ${companyName}`);
      return { success: true, message: 'License activated successfully', license: updatedLicense };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`License activation failed: ${(error as Error).message}`);
      throw new BadRequestException('Failed to activate license');
    }
  }

  async getLicenseInfo(): Promise<any> {
    const license = await this.prisma.license.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!license) {
      throw new NotFoundException('No active license found');
    }

    const currentUserCount = await this.prisma.user.count();

    return {
      id: license.id,
      licenseKey: license.licenseKey,
      companyName: license.companyName,
      companyEmail: license.companyEmail,
      licenseType: license.licenseType,
      maxUsers: license.maxUsers,
      maxBranches: license.maxBranches,
      expiresAt: license.expiresAt,
      isActive: license.isActive,
      activatedAt: license.activatedAt,
      lastValidated: license.lastValidated,
      currentUserCount,
      isExpired: new Date() > license.expiresAt,
      exceedsMaxUsers: currentUserCount > license.maxUsers,
      createdAt: license.createdAt,
      updatedAt: license.updatedAt,
    };
  }

  async checkLicenseStatus(): Promise<{ valid: boolean; message: string; details?: any }> {
    try {
      const license = await this.prisma.license.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!license) {
        return { valid: false, message: 'No active license found' };
      }

      if (new Date() > license.expiresAt) {
        return {
          valid: false,
          message: 'License has expired',
          details: { expiresAt: license.expiresAt },
        };
      }

      const currentUserCount = await this.prisma.user.count();
      if (license.maxUsers < currentUserCount) {
        return {
          valid: false,
          message: `User count (${currentUserCount}) exceeds license limit (${license.maxUsers})`,
          details: { maxUsers: license.maxUsers, currentUserCount },
        };
      }

      const fingerprint = this.getLicenseFingerprint();
      if (license.fingerprint && license.fingerprint !== fingerprint) {
        return {
          valid: false,
          message: 'License is bound to a different machine',
        };
      }

      await this.prisma.license.update({
        where: { id: license.id },
        data: { lastValidated: new Date() },
      });

      return {
        valid: true,
        message: 'License is valid',
        details: {
          licenseType: license.licenseType,
          maxUsers: license.maxUsers,
          maxBranches: license.maxBranches,
          expiresAt: license.expiresAt,
          companyName: license.companyName,
        },
      };
    } catch (error) {
      this.logger.error(`License status check failed: ${(error as Error).message}`);
      throw new BadRequestException('Failed to check license status');
    }
  }

  getLicenseFingerprint(): string {
    const hostname = os.hostname();
    const platform = os.platform();
    const cpus = os.cpus();
    const networkInterfaces = os.networkInterfaces();

    const cpuInfo = cpus.length > 0 ? `${cpus[0].model}-${cpus.length}` : 'unknown';

    let macAddress = 'unknown';
    for (const interfaces of Object.values(networkInterfaces)) {
      if (!interfaces) continue;
      for (const iface of interfaces) {
        if (iface.mac && iface.mac !== '00:00:00:00:00:00' && !iface.internal) {
          macAddress = iface.mac;
          break;
        }
      }
      if (macAddress !== 'unknown') break;
    }

    const raw = `${hostname}-${platform}-${cpuInfo}-${macAddress}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}
