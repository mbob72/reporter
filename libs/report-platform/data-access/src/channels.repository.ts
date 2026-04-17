import type { CurrentUser } from '@report-platform/contracts';

import type { ChannelTemplateRow } from './product-channel-template.types';

export interface ChannelsRepository {
  listChannelsForTemplate(
    currentUser: CurrentUser,
    datasetKey: string,
  ): Promise<ChannelTemplateRow[]>;
}

export const CHANNELS_REPOSITORY_TOKEN = 'CHANNELS_REPOSITORY_TOKEN';
