import {
    StorefrontOutlined,
    ShoppingCartOutlined,
    Inventory2Outlined,
    GroupOutlined,
    PersonOutlineOutlined,
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
        module: 'Products',
        name: 'Productos y Variantes',
        icon: Inventory2Outlined,
        link: '/products',
        roles: ['Administrador', 'Operador'],
    },

    { group: 'Administración', roles: ['Administrador'] },
    {
        module: 'Users',
        name: 'Usuarios',
        icon: GroupOutlined,
        link: '/users',
        roles: ['Administrador'],
    },

    { group: 'Cuenta', requiresAuth: true },
    {
        module: 'Profile',
        name: 'Mi Perfil',
        icon: PersonOutlineOutlined,
        link: '/profile',
        requiresAuth: true,
    },
];

export default MenuItems;
