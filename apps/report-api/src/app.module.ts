import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { getJwtModuleOptions } from './common/auth/jwt.config';

import { AuthModule } from './modules/auth.module';
import { HealthModule } from './modules/health.module';
import { ReportRunsModule } from './modules/report-runs.module';
import { ReportsModule } from './modules/reports.module';
import { RuntimeStatusModule } from './modules/runtime-status.module';

@Module({
  imports: [
    JwtModule.register(getJwtModuleOptions()),
    AuthModule,
    HealthModule,
    ReportsModule,
    ReportRunsModule,
    RuntimeStatusModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
