import { Navigate, Outlet, createBrowserRouter, type RouteObject } from 'react-router-dom';

import { useAppSelector } from '../hooks';
import { LoginContainer } from '../../features/report-launcher-runtime/containers/LoginContainer';
import { ReportLaunchShell } from '../../features/report-launcher-runtime/containers/ReportLaunchShell';
import { Step1ReportSelectionContainer } from '../../features/report-launcher-runtime/containers/Step1ReportSelectionContainer';
import { Step2LaunchConfigurationContainer } from '../../features/report-launcher-runtime/containers/Step2LaunchConfigurationContainer';
import { Step3RunProgressContainer } from '../../features/report-launcher-runtime/containers/Step3RunProgressContainer';
import { Step4ResultContainer } from '../../features/report-launcher-runtime/containers/Step4ResultContainer';

function ProtectedLayout() {
  const selectedMockUserId = useAppSelector((state) => state.session.selectedMockUserId);

  if (!selectedMockUserId) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function LoginLayout() {
  const selectedMockUserId = useAppSelector((state) => state.session.selectedMockUserId);

  if (selectedMockUserId) {
    return <Navigate to="/report-launch" replace />;
  }

  return <Outlet />;
}

export const appRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginLayout />,
    children: [
      {
        index: true,
        element: <LoginContainer />,
      },
    ],
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      {
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
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

export const appRouter = createAppRouter();
