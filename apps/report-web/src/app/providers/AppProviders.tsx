import { MantineProvider } from '@mantine/core';
import { type PropsWithChildren, useMemo } from 'react';
import { Provider } from 'react-redux';

import { createAppStore } from '../store';
import { reportWebTheme } from '../theme';

export function AppProviders({ children }: PropsWithChildren) {
  const store = useMemo(() => createAppStore(), []);

  return (
    <Provider store={store}>
      <MantineProvider theme={reportWebTheme} defaultColorScheme="light">
        {children}
      </MantineProvider>
    </Provider>
  );
}
