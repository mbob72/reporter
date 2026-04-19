import type { Preview } from '@storybook/react';

import '@mantine/core/styles.css';
import '../src/index.css';
import { StorybookProviders } from '../src/app/providers/StorybookProviders';

const preview: Preview = {
  decorators: [
    (Story) => (
      <StorybookProviders>
        <div className="min-h-screen w-full overflow-x-hidden bg-slate-100/90 p-2 sm:p-4 lg:p-8">
          <Story />
        </div>
      </StorybookProviders>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'fullscreen',
  },
};

export default preview;
