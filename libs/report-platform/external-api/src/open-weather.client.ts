import { z } from 'zod';

import { ExternalDependencyError } from './external-dependency.error';

const OPEN_WEATHER_SERVICE_KEY = 'openWeather';
const REQUEST_TIMEOUT_MS = 8_000;

const OpenWeatherCurrentWeatherSchema = z.object({
  main: z.object({
    temp: z.number().finite(),
  }),
});

function throwInvalidInput(message: string): never {
  throw new ExternalDependencyError({
    serviceKey: OPEN_WEATHER_SERVICE_KEY,
    category: 'invalid_input',
    message,
  });
}

function assertCoordinates(params: { latitude: number; longitude: number }) {
  if (!Number.isFinite(params.latitude) || !Number.isFinite(params.longitude)) {
    throwInvalidInput('OpenWeather coordinates must be finite numbers.');
  }

  if (params.latitude < -90 || params.latitude > 90) {
    throwInvalidInput('OpenWeather latitude must be between -90 and 90.');
  }

  if (params.longitude < -180 || params.longitude > 180) {
    throwInvalidInput('OpenWeather longitude must be between -180 and 180.');
  }
}

function toAbortErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name;
  }

  return '';
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export class OpenWeatherClient {
  private readonly normalizedApiKey: string;

  constructor(apiKey: string) {
    const normalizedApiKey = apiKey.trim();

    if (!normalizedApiKey) {
      throwInvalidInput('OpenWeather API key is required.');
    }

    this.normalizedApiKey = normalizedApiKey;
  }

  async getCurrentTemperatureCelsius(params: {
    latitude: number;
    longitude: number;
  }): Promise<number> {
    assertCoordinates(params);

    const query = new URLSearchParams({
      lat: String(params.latitude),
      lon: String(params.longitude),
      units: 'metric',
      appid: this.normalizedApiKey,
    });
    const requestUrl =
      `https://api.openweathermap.org/data/2.5/weather?${query.toString()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(requestUrl, {
        signal: controller.signal,
      });
    } catch (error) {
      if (toAbortErrorName(error) === 'AbortError') {
        throw new ExternalDependencyError({
          serviceKey: OPEN_WEATHER_SERVICE_KEY,
          category: 'timeout',
          message: `OpenWeather request timed out after ${REQUEST_TIMEOUT_MS}ms.`,
          cause: error,
        });
      }

      throw new ExternalDependencyError({
        serviceKey: OPEN_WEATHER_SERVICE_KEY,
        category: 'network',
        message: `Failed to reach OpenWeather Current Weather API: ${toErrorMessage(error, 'network error')}`,
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ExternalDependencyError({
        serviceKey: OPEN_WEATHER_SERVICE_KEY,
        category: 'http',
        httpStatus: response.status,
        message: `OpenWeather Current Weather request failed with status ${response.status}.`,
      });
    }

    const payload = await response.json().catch((error: unknown) => {
      throw new ExternalDependencyError({
        serviceKey: OPEN_WEATHER_SERVICE_KEY,
        category: 'invalid_response',
        message: 'OpenWeather Current Weather returned non-JSON response.',
        cause: error,
      });
    });
    const parsedPayload = OpenWeatherCurrentWeatherSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new ExternalDependencyError({
        serviceKey: OPEN_WEATHER_SERVICE_KEY,
        category: 'invalid_response',
        message: 'OpenWeather Current Weather response is invalid.',
      });
    }

    return parsedPayload.data.main.temp;
  }
}
