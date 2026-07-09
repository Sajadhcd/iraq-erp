import { Controller, Get, Put, Body, UseGuards } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("settings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async findAll() {
    return this.settingsService.findAll();
  }

  @Put()
  @Roles("SUPER_ADMIN")
  async updateMany(@Body() settings: Record<string, string>) {
    return this.settingsService.updateMany(settings);
  }
}
