import type { RouteObject } from 'react-router-dom';
import { ShopCatalogPage, ShopProductDetailPage } from './shop.lazy';

export const shopRoutes: RouteObject[] = [
    {
        index: true,
        element: <ShopCatalogPage />,
    },
    {
        path: 'product/:id',
        element: <ShopProductDetailPage />,
    },
];
