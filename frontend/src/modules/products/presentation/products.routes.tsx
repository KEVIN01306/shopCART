import type { RouteObject } from 'react-router-dom';
import { ProductsListPage } from './products.lazy';
import { RouteProtector } from '../../../shared/components/RouteProtector';

export const productsRoutes: RouteObject[] = [
    {
        index: true,
        element: (
            <RouteProtector requiredRole={['Administrador', 'Operador']}>
                <ProductsListPage />
            </RouteProtector>
        ),
    },
];
