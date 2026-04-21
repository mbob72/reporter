import type { Preview } from '@storybook/react';

import '@mantine/core/styles.css';
import '../src/index.css';
import { StorybookProviders } from '../src/app/providers/StorybookProviders';

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const initialEntries = Array.isArray(context?.parameters?.initialEntries)
        ? (context.parameters.initialEntries as string[])
        : undefined;
      const withRouter =
        typeof context?.parameters?.withRouter === 'boolean'
          ? context.parameters.withRouter
          : true;

      return (
        <StorybookProviders initialEntries={initialEntries} withRouter={withRouter}>
          <div className="min-h-screen w-full overflow-x-hidden bg-slate-100/90 p-2 sm:p-4 lg:p-8">
            <Story />
          </div>
        </StorybookProviders>
      );
    },
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
