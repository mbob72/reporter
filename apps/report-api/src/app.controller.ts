import { Controller, HttpCode, Post } from '@nestjs/common';

@Controller()
export class AppController {
  @Post('launch-report')
  @HttpCode(200)
  async launchReport() {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { status: 'done' };
  }
}
