import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.setting.findMany();
  }

  async update(key: string, value: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async updateMany(settings: Record<string, string>) {
    const promises = Object.entries(settings).map(([key, value]) =>
      this.prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    );
    await Promise.all(promises);
    return this.findAll();
  }

  async getCompanyProfile() {
    return this.prisma.companyProfile.findFirst();
  }

  async updateCompanyProfile(data: Record<string, any>) {
    const existing = await this.prisma.companyProfile.findFirst();
    if (existing) {
      return this.prisma.companyProfile.update({
        where: { id: existing.id },
        data,
      });
    }
    return this.prisma.companyProfile.create({ data: data as any });
  }

  async getEmailSettings() {
    return this.prisma.emailSetting.findFirst();
  }

  async updateEmailSettings(data: Record<string, any>) {
    const existing = await this.prisma.emailSetting.findFirst();
    if (existing) {
      return this.prisma.emailSetting.update({
        where: { id: existing.id },
        data,
      });
    }
    return this.prisma.emailSetting.create({ data: data as any });
  }

  async getSmsSettings() {
    return this.prisma.smsSetting.findFirst();
  }

  async updateSmsSettings(data: Record<string, any>) {
    const existing = await this.prisma.smsSetting.findFirst();
    if (existing) {
      return this.prisma.smsSetting.update({
        where: { id: existing.id },
        data,
      });
    }
    return this.prisma.smsSetting.create({ data: data as any });
  }

  async getWhatsAppSettings() {
    return this.prisma.whatsAppSetting.findFirst();
  }

  async updateWhatsAppSettings(data: Record<string, any>) {
    const existing = await this.prisma.whatsAppSetting.findFirst();
    if (existing) {
      return this.prisma.whatsAppSetting.update({
        where: { id: existing.id },
        data,
      });
    }
    return this.prisma.whatsAppSetting.create({ data: data as any });
  }
}
