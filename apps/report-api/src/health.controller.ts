import { Controller, Get, HttpCode } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  @HttpCode(200)
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
