import { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { authRoutes } from '../../modules/auth/presentation/auth.routes';
import { usersRoutes } from '../../modules/users/presentation/users.routes';
import { profileRoutes } from '../../modules/profile/presentation/profile.routes';
import { shopRoutes } from '../../modules/shop/presentation/shop.routes';
import { productsRoutes } from '../../modules/products/presentation/products.routes';
import { couponsRoutes } from '../../modules/coupons/presentation/coupons.routes';
import { ShopCatalogPage } from '../../modules/shop/presentation/shop.lazy';
import { CartPage } from '../../modules/cart/presentation/cart.lazy';
import ProtectedRoute from './ProtectedRoute';

import { FullPageLoader } from '../../shared/components/loaders';
import { AccessDeniedPage } from '../../shared/pages';

import BlankLayout from '../layouts/blankLayout';
import FullLayout from '../layouts/fullLayout';

export const appRouter = createBrowserRouter([
    // ── Auth routes (BlankLayout) ────────────────────────────────────────────
    {
        path: '/auth',
        element: (
            <Suspense fallback={<FullPageLoader />}>
                <BlankLayout />
            </Suspense>
        ),
        children: [...authRoutes],
    },

    // ── Main Storefront & Application Shell (FullLayout) ─────────────────────
    {
        path: '/',
        element: (
            <Suspense fallback={<FullPageLoader />}>
                <FullLayout />
            </Suspense>
        ),
        children: [
            // Public Storefront / Catalog — freely accessible to Guest (invitado) and Cliente/Operador/Administrador
            {
                index: true,
                element: <ShopCatalogPage />,
            },
            {
                path: 'shop',
                children: [...shopRoutes],
            },
            {
                path: 'cart',
                element: <CartPage />,
            },

            // Access Denied — reached when RouteProtector denies role access
            {
                path: 'access-denied',
                element: <AccessDeniedPage />,
            },

            // ── Authenticated routes ─────────────────────────────────────────
            {
                element: <ProtectedRoute />,
                children: [
                    {
                        path: 'products',
                        children: [...productsRoutes],
                    },
                    {
                        path: 'coupons',
                        children: [...couponsRoutes],
                    },
                    {
                        path: 'users',
                        children: [...usersRoutes],
                    },
                    {
                        path: 'profile',
                        children: [...profileRoutes],
                    },
                ],
            },
        ],
    },

    // ── Catch-all — redirect unknown paths to home ───────────────────────────
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);
