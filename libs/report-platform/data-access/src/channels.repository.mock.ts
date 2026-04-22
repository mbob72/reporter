import type { ApiError, CurrentUser } from '@report-platform/contracts';

import type { ChannelTemplateRow } from './product-channel-template.types';
import type { ChannelsRepository } from './channels.repository';

const channelsByDatasetKey = new Map<string, ChannelTemplateRow[]>([
  [
    'winter_base',
    [
      {
        channelName: 'Wolt Push',
        priceMultiplier: 1.12,
        volumeMultiplier: 1.25,
        channelFeeRate: 0.28,
      },
      {
        channelName: 'Frozen Retail Promo',
        priceMultiplier: 0.95,
        volumeMultiplier: 1.7,
        channelFeeRate: 0.12,
      },
      {
        channelName: 'Cafe Lunch Combo',
        priceMultiplier: 1.05,
        volumeMultiplier: 1.15,
        channelFeeRate: 0.08,
      },
    ],
  ],
  [
    'holiday_spike',
    [
      {
        channelName: 'Wolt Holiday Boost',
        priceMultiplier: 1.15,
        volumeMultiplier: 1.4,
        channelFeeRate: 0.3,
      },
      {
        channelName: 'Supermarket Flyer',
        priceMultiplier: 0.9,
        volumeMultiplier: 1.95,
        channelFeeRate: 0.14,
      },
      {
        channelName: 'Office Catering Bundle',
        priceMultiplier: 1.08,
        volumeMultiplier: 1.3,
        channelFeeRate: 0.1,
      },
    ],
  ],
  [
    'margin_protection',
    [
      {
        channelName: 'Wolt Standard',
        priceMultiplier: 1.18,
        volumeMultiplier: 1.1,
        channelFeeRate: 0.28,
      },
      {
        channelName: 'Premium Retail Shelf',
        priceMultiplier: 1.03,
        volumeMultiplier: 1.35,
        channelFeeRate: 0.16,
      },
      {
        channelName: 'Cafe Evening Set',
        priceMultiplier: 1.1,
        volumeMultiplier: 1.05,
        channelFeeRate: 0.09,
      },
    ],
  ],
]);

function throwForbidden(): never {
  throw {
    code: 'FORBIDDEN',
    message: 'You do not have access to channel template data.',
  } satisfies ApiError;
}

function throwNotFound(): never {
  throw {
    code: 'NOT_FOUND',
    message: 'Channel template dataset not found.',
  } satisfies ApiError;
}

function assertTemplateAccess(currentUser: CurrentUser) {
  switch (currentUser.role) {
    case 'Admin':
    case 'TenantAdmin':
      return;
    case 'Member':
    case 'Auditor':
      return throwForbidden();
    default:
      return throwForbidden();
  }
}

export class MockChannelsRepository implements ChannelsRepository {
  async listChannelsForTemplate(
    currentUser: CurrentUser,
    datasetKey: string,
  ): Promise<ChannelTemplateRow[]> {
    assertTemplateAccess(currentUser);

    const datasetRows = channelsByDatasetKey.get(datasetKey);

    if (!datasetRows) {
      throwNotFound();
    }

    return datasetRows.map((row) => ({
      channelName: row.channelName,
      priceMultiplier: row.priceMultiplier,
      volumeMultiplier: row.volumeMultiplier,
      channelFeeRate: row.channelFeeRate,
    }));
  }
}
