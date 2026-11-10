import type { RouteObject } from 'react-router-dom';
import { DashboardPage, AuditLogsPage } from './reports.lazy';
import { RouteProtector } from '../../../shared/components/RouteProtector';

export const dashboardRoutes: RouteObject[] = [
    {
        index: true,
        element: (
            <RouteProtector requiredRole={['Administrador']}>
                <DashboardPage />
            </RouteProtector>
        ),
    },
];

export const auditLogsRoutes: RouteObject[] = [
    {
        index: true,
        element: (
            <RouteProtector requiredRole={['Administrador']}>
                <AuditLogsPage />
            </RouteProtector>
        ),
    },
];
