import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permissions('settings:view')
  async findAll() {
    return this.settingsService.findAll();
  }

  @Put()
  @Permissions('settings:manage')
  async updateMany(@Body() settings: Record<string, string>) {
    return this.settingsService.updateMany(settings);
  }

  @Get('company-profile')
  @Permissions('settings:view')
  async getCompanyProfile() {
    return this.settingsService.getCompanyProfile();
  }

  @Put('company-profile')
  @Permissions('settings:manage')
  async updateCompanyProfile(@Body() data: Record<string, any>) {
    return this.settingsService.updateCompanyProfile(data);
  }

  @Get('email')
  @Permissions('settings:view')
  async getEmailSettings() {
    return this.settingsService.getEmailSettings();
  }

  @Put('email')
  @Permissions('settings:manage')
  async updateEmailSettings(@Body() data: Record<string, any>) {
    return this.settingsService.updateEmailSettings(data);
  }

  @Get('sms')
  @Permissions('settings:view')
  async getSmsSettings() {
    return this.settingsService.getSmsSettings();
  }

  @Put('sms')
  @Permissions('settings:manage')
  async updateSmsSettings(@Body() data: Record<string, any>) {
    return this.settingsService.updateSmsSettings(data);
  }

  @Get('whatsapp')
  @Permissions('settings:view')
  async getWhatsAppSettings() {
    return this.settingsService.getWhatsAppSettings();
  }

  @Put('whatsapp')
  @Permissions('settings:manage')
  async updateWhatsAppSettings(@Body() data: Record<string, any>) {
    return this.settingsService.updateWhatsAppSettings(data);
  }
}
