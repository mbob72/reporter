import type { ApiError, CurrentUser } from '@report-platform/contracts';
import type { SalesRepository, TenantRepository } from '@report-platform/data-access';
import { getOrganizationsByTenant } from '@report-platform/data-access';
import { canAccessTenantData } from '@report-platform/auth';
import {
  executeWithResilience,
  RetryStrategies,
  type OpenWeatherClient,
} from '@report-platform/external-api';

import {
  SIMPLE_SALES_SUMMARY_WEATHER_FALLBACK,
  SimpleSalesSummarySourceSchema,
  type SimpleSalesSummarySource,
} from './simple-sales-summary.contract';

type Coordinates = {
  latitude: number;
  longitude: number;
};

const coordinatesByTenantAndOrganization = new Map<string, Coordinates>([
  [
    'tenant-1:org-1',
    {
      latitude: 45.2671,
      longitude: 19.8335,
    },
  ],
  [
    'tenant-2:org-3',
    {
      latitude: 44.7866,
      longitude: 20.4489,
    },
  ],
]);

function throwValidationError(message: string): never {
  throw {
    code: 'VALIDATION_ERROR',
    message,
  } satisfies ApiError;
}

function throwNotFound(message: string): never {
  throw {
    code: 'NOT_FOUND',
    message,
  } satisfies ApiError;
}

function throwForbidden(message: string): never {
  throw {
    code: 'FORBIDDEN',
    message,
  } satisfies ApiError;
}

function buildTenantOrganizationKey(tenantId: string, organizationId: string): string {
  return `${tenantId}:${organizationId}`;
}

function getCoordinatesForTenantOrganization(params: {
  tenantId: string;
  organizationId: string;
}): Coordinates {
  const key = buildTenantOrganizationKey(params.tenantId, params.organizationId);
  const coordinates = coordinatesByTenantAndOrganization.get(key);

  if (!coordinates) {
    throwValidationError(
      `No coordinate mapping configured for tenant "${params.tenantId}" and organization "${params.organizationId}".`,
    );
  }

  return coordinates;
}

function formatTemperatureDisplay(temperatureCelsius: number): string {
  return `${temperatureCelsius.toFixed(1)} °C`;
}

export class SimpleSalesSummarySourceService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly salesRepository: SalesRepository,
    private readonly openWeatherClient: OpenWeatherClient,
  ) {}

  private async getAirTemperatureDisplay(params: {
    latitude: number;
    longitude: number;
  }): Promise<string> {
    return executeWithResilience({
      criticality: 'optional',
      retryStrategy: RetryStrategies.transientTwice,
      operation: async () => {
        const airTemperatureCelsius = await this.openWeatherClient.getCurrentTemperatureCelsius({
          latitude: params.latitude,
          longitude: params.longitude,
        });

        return formatTemperatureDisplay(airTemperatureCelsius);
      },
      fallback: () => SIMPLE_SALES_SUMMARY_WEATHER_FALLBACK,
    });
  }

  async getSource(
    currentUser: CurrentUser,
    params: { tenantId: string; organizationId: string },
  ): Promise<SimpleSalesSummarySource> {
    const tenantId = params.tenantId;
    const organizationId = params.organizationId;

    if (!canAccessTenantData(currentUser, tenantId)) {
      throwForbidden('You do not have access to requested tenant.');
    }

    const organization = getOrganizationsByTenant(tenantId).find(
      (item) => item.id === organizationId,
    );

    if (!organization) {
      throwNotFound('Organization not found for requested tenant.');
    }

    const coordinates = getCoordinatesForTenantOrganization({
      tenantId,
      organizationId,
    });

    const [tenantName, organizationName, currentSalesAmount, airTemperatureDisplay] =
      await Promise.all([
        this.tenantRepository.getTenantName(currentUser, tenantId),
        this.tenantRepository.getOrganizationName(currentUser, tenantId, organizationId),
        this.salesRepository.getCurrentSalesAmount(currentUser, tenantId, organizationId),
        this.getAirTemperatureDisplay({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }),
      ]);

    return SimpleSalesSummarySourceSchema.parse({
      tenantId,
      organizationId,
      tenantName,
      organizationName,
      currentSalesAmount,
      currency: 'USD',
      airTemperatureDisplay,
    });
  }
}
