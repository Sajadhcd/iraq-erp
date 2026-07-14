import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('dashboard')
  @Public()
  async getDashboard() {
    return this.monitoringService.getDashboard();
  }

  @Get('metrics')
  @Public()
  async getMetrics() {
    return this.monitoringService.getSystemMetrics();
  }
}
