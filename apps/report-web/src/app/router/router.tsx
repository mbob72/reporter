import {
  Navigate,
  createBrowserRouter,
  type RouteObject,
} from 'react-router-dom';

import { ReportLaunchShell } from '../../features/report-launcher-runtime/containers/ReportLaunchShell';
import { Step1ReportSelectionContainer } from '../../features/report-launcher-runtime/containers/Step1ReportSelectionContainer';
import { Step2LaunchConfigurationContainer } from '../../features/report-launcher-runtime/containers/Step2LaunchConfigurationContainer';
import { Step3RunProgressContainer } from '../../features/report-launcher-runtime/containers/Step3RunProgressContainer';
import { Step4ResultContainer } from '../../features/report-launcher-runtime/containers/Step4ResultContainer';

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <ReportLaunchShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/report-launch" replace />,
      },
      {
        path: 'report-launch',
        element: <Step1ReportSelectionContainer />,
      },
      {
        path: 'report-launch/configure',
        element: <Step2LaunchConfigurationContainer />,
      },
      {
        path: 'report-runs/:reportInstanceId',
        element: <Step3RunProgressContainer />,
      },
      {
        path: 'report-runs/:reportInstanceId/result',
        element: <Step4ResultContainer />,
      },
      {
        path: '*',
        element: <Navigate to="/report-launch" replace />,
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

export const appRouter = createAppRouter();
