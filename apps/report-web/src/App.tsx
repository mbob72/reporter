import type { ComponentProps } from 'react';
import { RouterProvider } from 'react-router-dom';

import { appRouter } from './app/router/router';

type AppProps = {
  router?: ComponentProps<typeof RouterProvider>['router'];
};

export function App({ router = appRouter }: AppProps) {
  return <RouterProvider router={router} />;
}
