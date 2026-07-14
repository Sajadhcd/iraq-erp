import { Controller, Get, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LicenseService } from './license.service';
import { Public } from '../auth/public.decorator';

@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get()
  async getLicenseInfo() {
    return this.licenseService.getLicenseInfo();
  }

  @Post('activate')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async activateLicense(
    @Body() body: { key: string; companyName: string; companyEmail: string },
  ) {
    return this.licenseService.activateLicense(body.key, body.companyName, body.companyEmail);
  }

  @Post('validate')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async validateLicense(@Body() body: { key: string }) {
    return this.licenseService.validateLicense(body.key);
  }

  @Get('status')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async checkLicenseStatus() {
    return this.licenseService.checkLicenseStatus();
  }
}
