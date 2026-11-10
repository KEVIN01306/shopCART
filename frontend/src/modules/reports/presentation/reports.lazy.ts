import { lazy } from 'react';

export const DashboardPage = lazy(() => import('./pages/Dashboard.page'));
export const AuditLogsPage = lazy(() => import('./pages/AuditLogs.page'));
