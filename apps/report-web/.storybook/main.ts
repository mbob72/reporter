import type { StorybookConfig } from '@storybook/react-vite';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

import { reportWebAliases } from '../vite.aliases';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  typescript: {
    reactDocgen: false,
  },
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  async viteFinal(baseConfig) {
    return mergeConfig(baseConfig, {
      resolve: {
        alias: reportWebAliases,
      },
      css: {
        postcss: fileURLToPath(new URL('../postcss.config.cjs', import.meta.url)),
      },
    });
  },
};

export default config;
