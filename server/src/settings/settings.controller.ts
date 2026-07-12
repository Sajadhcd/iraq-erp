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
}
