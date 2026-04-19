import { MantineProvider } from '@mantine/core';
import { type PropsWithChildren, useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { createStorybookStore } from '../storybookStore';
import { reportWebTheme } from '../theme';

type StorybookProvidersProps = PropsWithChildren<{
  initialEntries?: string[];
}>;

export function StorybookProviders({
  children,
  initialEntries = ['/'],
}: StorybookProvidersProps) {
  const store = useMemo(() => createStorybookStore(), []);

  return (
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <MantineProvider theme={reportWebTheme} defaultColorScheme="light">
          {children}
        </MantineProvider>
      </MemoryRouter>
    </Provider>
  );
}
