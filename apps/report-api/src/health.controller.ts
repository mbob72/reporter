import { Controller, Get, HttpCode } from '@nestjs/common';

import { Public } from './common/auth/public.decorator';

@Controller()
export class HealthController {
  @Get('health')
  @Public()
  @HttpCode(200)
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
