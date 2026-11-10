import { lazy } from 'react';

export const CheckoutPage = lazy(() => import('./pages/Checkout.page'));
export const MyOrdersPage = lazy(() => import('./pages/MyOrders.page'));
export const OrdersManagementPage = lazy(
    () => import('./pages/OrdersManagement.page')
);
