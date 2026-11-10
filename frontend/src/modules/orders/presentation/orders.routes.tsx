import type { RouteObject } from 'react-router-dom';
import { OrdersManagementPage } from './orders.lazy';
import { RouteProtector } from '../../../shared/components/RouteProtector';

export const ordersRoutes: RouteObject[] = [
    {
        index: true,
        element: (
            <RouteProtector requiredRole={['Administrador', 'Operador']}>
                <OrdersManagementPage />
            </RouteProtector>
        ),
    },
];
