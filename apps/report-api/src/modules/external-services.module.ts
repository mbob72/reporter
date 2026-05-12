import { Module } from '@nestjs/common';

import {
  EXTERNAL_CLIENT_FACTORY_TOKEN,
  ExternalClientFactory,
  MockSharedSettingsProvider,
  SHARED_SETTINGS_PROVIDER_TOKEN,
  type SharedSettingsProvider,
} from '@report-platform/external-api';

@Module({
  providers: [
    {
      provide: SHARED_SETTINGS_PROVIDER_TOKEN,
      useFactory: (): SharedSettingsProvider => new MockSharedSettingsProvider(),
    },
    {
      provide: EXTERNAL_CLIENT_FACTORY_TOKEN,
      inject: [SHARED_SETTINGS_PROVIDER_TOKEN],
      useFactory: (sharedSettingsProvider: SharedSettingsProvider): ExternalClientFactory =>
        new ExternalClientFactory(sharedSettingsProvider),
    },
  ],
  exports: [SHARED_SETTINGS_PROVIDER_TOKEN, EXTERNAL_CLIENT_FACTORY_TOKEN],
})
export class ExternalServicesModule {}
