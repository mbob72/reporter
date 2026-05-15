import type { ComponentProps } from 'react';
import { RouterProvider } from 'react-router-dom';

import { appRouter } from './app/router/router';
import { SessionBootstrap } from './app/providers/SessionBootstrap';

type AppProps = {
  router?: ComponentProps<typeof RouterProvider>['router'];
};

export function App({ router = appRouter }: AppProps) {
  return (
    <SessionBootstrap>
      <RouterProvider router={router} />
    </SessionBootstrap>
  );
}
