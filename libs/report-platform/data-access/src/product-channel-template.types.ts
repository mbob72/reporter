export type ProductTemplateRow = {
  productName: string;
  basePrice: number;
  baseUnits: number;
};

export type ChannelTemplateRow = {
  channelName: string;
  priceMultiplier: number;
  volumeMultiplier: number;
  channelFeeRate: number;
};
