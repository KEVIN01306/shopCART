import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Avatar,
    Box,
    Tooltip,
    Menu,
    MenuItem,
    ListItemIcon,
    Divider,
    Button,
    TextField,
    InputAdornment,
    Stack,
} from '@mui/material';
import {
    MenuOutlined,
    MenuOpenOutlined,
    PersonOutlined,
    LogoutOutlined,
    LoginOutlined,
    SearchRounded,
    Inventory2Outlined,
    StorefrontOutlined,
    GroupOutlined,
} from '@mui/icons-material';
import { useAuthStore } from '../../../../core/store/authStore';
import { hasSomeRole, hasRole } from '../../../../core/utils/permissions';
import {
    useSidebar,
    SIDEBAR_EXPANDED_WIDTH,
    SIDEBAR_COLLAPSED_WIDTH,
} from '../sidebar/SidebarContext';
import { api } from '../../../../core/api/axios.instance';
import { CartFloatingMenu } from '../../../../modules/cart/presentation/components/CartFloatingMenu.component';

export const Navbar: React.FC = () => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [quickSearch, setQuickSearch] = useState<string>('');
    const { user, clearAuth } = useAuthStore();
    const { toggleSidebar, isCollapsed } = useSidebar();
    const navigate = useNavigate();
    const location = useLocation();

    const currentSidebarWidth = isCollapsed
        ? SIDEBAR_COLLAPSED_WIDTH
        : SIDEBAR_EXPANDED_WIDTH;

    const canManageProducts = hasSomeRole(user, ['Administrador', 'Operador']);
    const isAdminUser = hasRole(user, 'Administrador');

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleNavigateProfile = () => {
        handleCloseMenu();
        navigate('/profile');
    };

    const handleLogout = async () => {
        handleCloseMenu();
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error('Logout error on server:', err);
        } finally {
            clearAuth();
            navigate('/');
        }
    };

    const handleQuickSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = quickSearch.trim();
        if (trimmed) {
            navigate(`/shop?q=${encodeURIComponent(trimmed)}`);
        } else {
            navigate('/shop');
        }
    };

    const initials = user?.name
        ? user.name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
        : user?.email?.charAt(0).toUpperCase() || 'U';

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                width: { md: `calc(100% - ${currentSidebarWidth}px)` },
                ml: { md: `${currentSidebarWidth}px` },
                transition: 'width 0.25s ease, margin-left 0.25s ease',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #D5DFE4',
                color: '#425A8B',
            }}
        >
            <Toolbar sx={{ minHeight: 68, px: { xs: 2, sm: 3 }, gap: 2 }}>
                {/* Sidebar Toggle Button */}
                <Tooltip title={isCollapsed ? 'Expandir menú' : 'Contraer menú'} arrow>
                    <IconButton
                        id="navbar-toggle-sidebar"
                        aria-label="Toggle navigation sidebar"
                        edge="start"
                        onClick={toggleSidebar}
                        sx={{
                            color: '#425A8B',
                            borderRadius: '8px',
                            '&:hover': {
                                backgroundColor: '#F0F3F8',
                            },
                        }}
                    >
                        {isCollapsed ? <MenuOpenOutlined /> : <MenuOutlined />}
                    </IconButton>
                </Tooltip>

                {/* shopCART Brand Identifier */}
                <Box
                    onClick={() => navigate('/shop')}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        cursor: 'pointer',
                        flexShrink: 0,
                    }}
                >
                    <Box
                        component="img"
                        src="/logo.png"
                        alt="shopCART"
                        sx={{
                            width: 36,
                            height: 36,
                            objectFit: 'contain',
                        }}
                    />
                    <Typography
                        component="div"
                        noWrap
                        sx={{
                            fontWeight: 800,
                            color: '#425A8B',
                            fontSize: '21px',
                            letterSpacing: '-0.5px',
                        }}
                    >
                        shop
                        <Box component="span" sx={{ color: '#FD9636' }}>
                            CART
                        </Box>
                    </Typography>
                </Box>

                {/* Center shopCART Search Bar */}
                <Box
                    component="form"
                    onSubmit={handleQuickSearchSubmit}
                    sx={{
                        display: { xs: 'none', md: 'flex' },
                        flex: 1,
                        maxWidth: 460,
                        mx: 1,
                    }}
                >
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Search for items, brands or SKU..."
                        value={quickSearch}
                        onChange={(e) => setQuickSearch(e.target.value)}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '6px',
                                backgroundColor: '#FFFFFF',
                                borderColor: '#D5DFE4',
                                height: 38,
                                fontSize: '13px',
                            },
                        }}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            type="submit"
                                            size="small"
                                            sx={{ color: '#425A8B' }}
                                        >
                                            <SearchRounded sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                </Box>

                {/* Navigation Links (Home / Shop / Admin Products / Users) */}
                <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                        display: { xs: 'none', lg: 'flex' },
                        alignItems: 'center',
                        ml: 'auto',
                    }}
                >
                    <Button
                        onClick={() => navigate('/shop')}
                        startIcon={<StorefrontOutlined sx={{ fontSize: 17 }} />}
                        sx={{
                            color:
                                location.pathname === '/' ||
                                location.pathname.startsWith('/shop')
                                    ? '#FD9636'
                                    : '#425A8B',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            textTransform: 'none',
                            '&:hover': { color: '#FD9636', backgroundColor: '#F0F3F8' },
                        }}
                    >
                        Shop
                    </Button>

                    {canManageProducts && (
                        <Button
                            onClick={() => navigate('/products')}
                            startIcon={<Inventory2Outlined sx={{ fontSize: 17 }} />}
                            sx={{
                                color: location.pathname.startsWith('/products')
                                    ? '#FD9636'
                                    : '#425A8B',
                                fontWeight: 700,
                                fontSize: '13.5px',
                                textTransform: 'none',
                                '&:hover': {
                                    color: '#FD9636',
                                    backgroundColor: '#F0F3F8',
                                },
                            }}
                        >
                            Subir / Editar Productos
                        </Button>
                    )}

                    {isAdminUser && (
                        <Button
                            onClick={() => navigate('/users')}
                            startIcon={<GroupOutlined sx={{ fontSize: 17 }} />}
                            sx={{
                                color: location.pathname.startsWith('/users')
                                    ? '#FD9636'
                                    : '#425A8B',
                                fontWeight: 700,
                                fontSize: '13.5px',
                                textTransform: 'none',
                                '&:hover': {
                                    color: '#FD9636',
                                    backgroundColor: '#F0F3F8',
                                },
                            }}
                        >
                            Usuarios
                        </Button>
                    )}
                </Stack>

                <Box sx={{ flexGrow: { xs: 1, lg: 0 } }} />

                {/* Floating Cart Menu on Hover / Click (shopCART) */}
                <CartFloatingMenu />

                {/* User Profile or Guest CTA */}
                {user ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                            sx={{
                                display: { xs: 'none', sm: 'flex' },
                                alignItems: 'center',
                                gap: 1.25,
                            }}
                        >
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        color: '#425A8B',
                                        fontSize: '13px',
                                        lineHeight: 1.2,
                                    }}
                                >
                                    {user.name}
                                </Typography>
                                <Typography
                                    sx={{
                                        color: '#8C9EC5',
                                        fontSize: '11px',
                                    }}
                                >
                                    {user.email}
                                </Typography>
                            </Box>
                        </Box>

                        <Tooltip title="Menú de cuenta" arrow>
                            <IconButton
                                id="navbar-user-menu-button"
                                onClick={handleOpenMenu}
                                size="small"
                                sx={{ p: 0.25 }}
                                aria-controls={anchorEl ? 'user-account-menu' : undefined}
                                aria-haspopup="true"
                                aria-expanded={anchorEl ? 'true' : undefined}
                            >
                                <Avatar
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        backgroundColor: '#425A8B',
                                        color: '#FFFFFF',
                                    }}
                                >
                                    {initials}
                                </Avatar>
                            </IconButton>
                        </Tooltip>

                        <Menu
                            id="user-account-menu"
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleCloseMenu}
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            slotProps={{
                                paper: {
                                    sx: {
                                        minWidth: 230,
                                        mt: 1,
                                        borderRadius: '10px',
                                        border: '1px solid #D5DFE4',
                                        boxShadow: '0 10px 25px rgba(66, 90, 139, 0.12)',
                                        backgroundColor: '#FFFFFF',
                                    },
                                },
                            }}
                        >
                            <Box sx={{ px: 2, py: 1.5 }}>
                                <Typography
                                    sx={{
                                        color: '#425A8B',
                                        fontWeight: 700,
                                        fontSize: '13.5px',
                                    }}
                                >
                                    {user.name}
                                </Typography>
                                <Typography
                                    sx={{
                                        color: '#66789C',
                                        fontSize: '12px',
                                        display: 'block',
                                    }}
                                >
                                    {user.email}
                                </Typography>
                            </Box>

                            <Divider sx={{ borderColor: '#E5E9F2' }} />

                            {canManageProducts && (
                                <MenuItem
                                    onClick={() => {
                                        handleCloseMenu();
                                        navigate('/products');
                                    }}
                                    sx={{ py: 1, gap: 1.5 }}
                                >
                                    <ListItemIcon sx={{ color: '#FD9636', minWidth: 0 }}>
                                        <Inventory2Outlined fontSize="small" />
                                    </ListItemIcon>
                                    <Typography
                                        sx={{
                                            color: '#425A8B',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Gestión de Productos
                                    </Typography>
                                </MenuItem>
                            )}

                            <MenuItem
                                id="navbar-menu-profile"
                                onClick={handleNavigateProfile}
                                sx={{ py: 1, gap: 1.5 }}
                            >
                                <ListItemIcon sx={{ color: '#66789C', minWidth: 0 }}>
                                    <PersonOutlined fontSize="small" />
                                </ListItemIcon>
                                <Typography sx={{ color: '#425A8B', fontSize: '13px' }}>
                                    Mi Perfil
                                </Typography>
                            </MenuItem>

                            <Divider sx={{ borderColor: '#E5E9F2' }} />

                            <MenuItem
                                id="navbar-menu-logout"
                                onClick={handleLogout}
                                sx={{ py: 1, gap: 1.5 }}
                            >
                                <ListItemIcon sx={{ color: '#425A8B', minWidth: 0 }}>
                                    <LogoutOutlined fontSize="small" />
                                </ListItemIcon>
                                <Typography
                                    sx={{
                                        color: '#425A8B',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                    }}
                                >
                                    Cerrar Sesión
                                </Typography>
                            </MenuItem>
                        </Menu>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Button
                            id="navbar-login-button"
                            onClick={() => navigate('/auth/login')}
                            startIcon={<LoginOutlined sx={{ fontSize: 16 }} />}
                            sx={{
                                borderRadius: '6px',
                                backgroundColor: '#425A8B',
                                color: '#FFFFFF',
                                fontWeight: 700,
                                fontSize: '13px',
                                px: 2,
                                py: 0.85,
                                textTransform: 'none',
                                '&:hover': {
                                    backgroundColor: '#2B3E66',
                                },
                            }}
                        >
                            Iniciar sesión
                        </Button>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
