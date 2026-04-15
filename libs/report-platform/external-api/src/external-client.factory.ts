import type {
  ApiError,
  BrokerCredentialInput as ContractBrokerCredentialInput,
  CurrentUser,
  ReportMetadata,
} from '@report-platform/contracts';

import type { ExternalAuthProvider } from './auth-provider';
import type { BrokerApiClient } from './broker-api.client';
import { MockBrokerApiClient } from './broker-api.client';
import type { SharedSettingsProvider } from './shared-settings.provider';

export type BrokerCredentialInput = ContractBrokerCredentialInput;

function throwValidationError(message: string): never {
  throw {
    code: 'VALIDATION_ERROR',
    message,
  } satisfies ApiError;
}

export class ExternalClientFactory {
  constructor(
    private readonly sharedSettingsProvider: SharedSettingsProvider,
    private readonly authProvider: ExternalAuthProvider,
  ) {}

  async getBrokerApiClient(params: {
    currentUser: CurrentUser;
    reportMetadata: ReportMetadata;
    reportCode: string;
    credentialInput: BrokerCredentialInput;
  }): Promise<BrokerApiClient> {
    const declaredDependency = params.reportMetadata.externalDependencies.find(
      (dependency) => dependency.serviceKey === 'brokerApi',
    );

    if (!declaredDependency) {
      throwValidationError('Report requested undeclared external dependency.');
    }

    let username: string;
    let password: string;

    if (params.credentialInput.mode === 'manual') {
      username = params.credentialInput.username;
      password = params.credentialInput.password;
    } else {
      const resolvedSharedCredentials =
        await this.sharedSettingsProvider.resolveCredentials({
          currentUser: params.currentUser,
          reportCode: params.reportCode,
          serviceKey: 'brokerApi',
          sharedSettingId: params.credentialInput.sharedSettingId,
        });

      username = resolvedSharedCredentials.username;
      password = resolvedSharedCredentials.password;
    }

    const authSession = await this.authProvider.authenticate({
      serviceKey: 'brokerApi',
      username,
      password,
    });

    return new MockBrokerApiClient(authSession.accessToken);
  }
}
