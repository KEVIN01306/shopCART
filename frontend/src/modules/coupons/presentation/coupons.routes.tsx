import type { RouteObject } from 'react-router-dom';
import { CouponsListPage } from './coupons.lazy';
import { RouteProtector } from '../../../shared/components/RouteProtector';

export const couponsRoutes: RouteObject[] = [
    {
        index: true,
        element: (
            <RouteProtector requiredRole={['Administrador']}>
                <CouponsListPage />
            </RouteProtector>
        ),
    },
];
