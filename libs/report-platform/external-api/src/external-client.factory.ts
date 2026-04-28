import type {
  ApiError,
  CurrentUser,
  OpenWeatherCredentialInput,
  ReportMetadata,
} from '@report-platform/contracts';

import { OpenWeatherClient } from './open-weather.client';
import type { SharedSettingsProvider } from './shared-settings.provider';

function throwValidationError(message: string): never {
  throw {
    code: 'VALIDATION_ERROR',
    message,
  } satisfies ApiError;
}

export class ExternalClientFactory {
  constructor(private readonly sharedSettingsProvider: SharedSettingsProvider) {}

  async getOpenWeatherClient(params: {
    currentUser: CurrentUser;
    reportMetadata: ReportMetadata;
    reportCode: string;
    credentialInput: OpenWeatherCredentialInput;
  }): Promise<OpenWeatherClient> {
    const declaredDependency = params.reportMetadata.externalDependencies.find(
      (dependency) => dependency.serviceKey === 'openWeather',
    );

    if (!declaredDependency) {
      throwValidationError('Report requested undeclared external dependency.');
    }

    if (params.credentialInput.mode === 'manual') {
      return new OpenWeatherClient(params.credentialInput.apiKey);
    }

    const resolvedSharedCredentials = await this.sharedSettingsProvider.resolveCredentials({
      currentUser: params.currentUser,
      reportCode: params.reportCode,
      serviceKey: 'openWeather',
      sharedSettingId: params.credentialInput.sharedSettingId,
    });

    return new OpenWeatherClient(resolvedSharedCredentials.apiKey);
  }
}
