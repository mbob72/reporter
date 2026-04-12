import { Module } from '@nestjs/common';

import { ReportsController } from './reports.controller';
import { reportingProviders } from './reporting.providers';

@Module({
  controllers: [ReportsController],
  providers: [...reportingProviders],
})
export class AppModule {}
