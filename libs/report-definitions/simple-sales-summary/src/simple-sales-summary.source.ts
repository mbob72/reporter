import type { ApiError, CurrentUser } from '@report-platform/contracts';
import type { SalesRepository, TenantRepository } from '@report-platform/data-access';
import { getOrganizationsByTenant } from '@report-platform/data-access';
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
        const airTemperatureCelsius =
          await this.openWeatherClient.getCurrentTemperatureCelsius({
            latitude: params.latitude,
            longitude: params.longitude,
          });

        return formatTemperatureDisplay(airTemperatureCelsius);
      },
      fallback: () => SIMPLE_SALES_SUMMARY_WEATHER_FALLBACK,
    });
  }

  async getSource(currentUser: CurrentUser): Promise<SimpleSalesSummarySource> {
    const tenantId = currentUser.tenantId;

    if (!tenantId) {
      throwValidationError('Simple Sales Summary requires a tenant-scoped user.');
    }

    const defaultOrganization = getOrganizationsByTenant(tenantId)[0];

    if (!defaultOrganization) {
      throwNotFound('Organization not found for current tenant.');
    }

    const coordinates = getCoordinatesForTenantOrganization({
      tenantId,
      organizationId: defaultOrganization.id,
    });

    const [tenantName, organizationName, currentSalesAmount, airTemperatureDisplay] =
      await Promise.all([
        this.tenantRepository.getTenantName(currentUser, tenantId),
        this.tenantRepository.getOrganizationName(
          currentUser,
          tenantId,
          defaultOrganization.id,
        ),
        this.salesRepository.getCurrentSalesAmount(
          currentUser,
          tenantId,
          defaultOrganization.id,
        ),
        this.getAirTemperatureDisplay({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }),
      ]);

    return SimpleSalesSummarySourceSchema.parse({
      tenantId,
      organizationId: defaultOrganization.id,
      tenantName,
      organizationName,
      currentSalesAmount,
      currency: 'USD',
      airTemperatureDisplay,
    });
  }
}
