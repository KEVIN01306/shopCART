import {
    StorefrontOutlined,
    ShoppingCartOutlined,
    Inventory2Outlined,
    GroupOutlined,
    PersonOutlineOutlined,
    LoyaltyOutlined,
    LocalShippingOutlined,
    ReceiptLongOutlined,
    AssessmentOutlined,
    FactCheckOutlined,
} from '@mui/icons-material';
import type { ElementType } from 'react';

export interface MenuItem {
    name?: string;
    module?: string;
    group?: string;
    link?: string;
    icon?: ElementType;
    roles?: string[];
    requiresAuth?: boolean;
    children?: MenuItem[];
}

const MenuItems: MenuItem[] = [
    { group: 'Tienda shopCART' },
    {
        module: 'Shop',
        name: 'Catálogo de Tienda',
        icon: StorefrontOutlined,
        link: '/shop',
    },
    {
        module: 'Cart',
        name: 'Carrito de Compras',
        icon: ShoppingCartOutlined,
        link: '/cart',
    },

    { group: 'Gestión Comercial', roles: ['Administrador', 'Operador'] },
    {
        module: 'Orders',
        name: 'Pedidos y Despachos',
        icon: LocalShippingOutlined,
        link: '/orders',
        roles: ['Administrador', 'Operador'],
    },
    {
        module: 'Products',
        name: 'Productos, Inventario y Kardex',
        icon: Inventory2Outlined,
        link: '/products',
        roles: ['Administrador', 'Operador'],
    },

    { group: 'Administración', roles: ['Administrador'] },
    {
        module: 'Dashboard',
        name: 'Dashboard y Reportes',
        icon: AssessmentOutlined,
        link: '/dashboard',
        roles: ['Administrador'],
    },
    {
        module: 'AuditLogs',
        name: 'Bitácora de Auditoría',
        icon: FactCheckOutlined,
        link: '/audit-logs',
        roles: ['Administrador'],
    },
    {
        module: 'Coupons',
        name: 'Cupones y Promociones',
        icon: LoyaltyOutlined,
        link: '/coupons',
        roles: ['Administrador'],
    },
    {
        module: 'Users',
        name: 'Usuarios',
        icon: GroupOutlined,
        link: '/users',
        roles: ['Administrador'],
    },

    { group: 'Cuenta', requiresAuth: true },
    {
        module: 'MyOrders',
        name: 'Mis Pedidos',
        icon: ReceiptLongOutlined,
        link: '/my-orders',
        requiresAuth: true,
    },
    {
        module: 'Profile',
        name: 'Mi Perfil',
        icon: PersonOutlineOutlined,
        link: '/profile',
        requiresAuth: true,
    },
];

export default MenuItems;
