import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from '../auth.controller';
import { getJwtModuleOptions } from '../common/auth/jwt.config';
import { DevAuthService } from './auth/services/dev-auth.service';

@Module({
  imports: [JwtModule.register(getJwtModuleOptions())],
  providers: [DevAuthService],
  controllers: [AuthController],
})
export class AuthModule {}
