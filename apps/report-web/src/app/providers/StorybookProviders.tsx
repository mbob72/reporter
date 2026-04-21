import { MantineProvider } from '@mantine/core';
import { type PropsWithChildren, useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { createStorybookStore } from '../storybookStore';
import { reportWebTheme } from '../theme';

type StorybookProvidersProps = PropsWithChildren<{
  initialEntries?: string[];
  withRouter?: boolean;
}>;

export function StorybookProviders({
  children,
  initialEntries = ['/'],
  withRouter = true,
}: StorybookProvidersProps) {
  const store = useMemo(() => createStorybookStore(), []);
  const content = (
    <MantineProvider theme={reportWebTheme} defaultColorScheme="light">
      {children}
    </MantineProvider>
  );

  return (
    <Provider store={store}>
      {withRouter ? (
        <MemoryRouter initialEntries={initialEntries}>{content}</MemoryRouter>
      ) : (
        content
      )}
    </Provider>
  );
}
