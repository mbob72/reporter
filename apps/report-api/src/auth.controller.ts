import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { z } from 'zod';

import { Public } from './common/auth/public.decorator';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { DevAuthService } from './modules/auth/services/dev-auth.service';

const IssueDevTokenBodySchema = z.object({
  mockUserId: z.string().trim().min(1),
});

type IssueDevTokenBody = z.infer<typeof IssueDevTokenBodySchema>;

@Controller()
export class AuthController {
  constructor(
    @Inject(DevAuthService)
    private readonly devAuthService: DevAuthService,
  ) {}

  @Post('auth/dev-token')
  @Public()
  @HttpCode(200)
  issueDevToken(
    @Body(new ZodValidationPipe(IssueDevTokenBodySchema, 'Invalid dev token request payload.'))
    body: IssueDevTokenBody,
  ) {
    return this.devAuthService.issueDevToken(body.mockUserId);
  }
}
