import React from 'react';
import {
    Box,
    Drawer,
    List,
    Typography,
    Stack,
    Divider,
} from '@mui/material';
import MenuItems from './menuItems';
import SidebarItem from './SidebarItem';
import {
    useSidebar,
    SIDEBAR_EXPANDED_WIDTH,
    SIDEBAR_COLLAPSED_WIDTH,
} from './SidebarContext';

const SidebarContent: React.FC = () => {
    const { isCollapsed } = useSidebar();

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: '#FFFFFF',
                borderRight: '1px solid #D5DFE4',
                overflowX: 'hidden',
            }}
        >
            {/* Header with shopCART Logo */}
            <Stack
                direction="row"
                sx={{
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: 1.25,
                    px: isCollapsed ? 1 : 2.5,
                    minHeight: 68,
                    borderBottom: '1px solid #D5DFE4',
                }}
            >
                <Box
                    component="img"
                    src="/logo.png"
                    alt="shopCART"
                    sx={{
                        width: 32,
                        height: 32,
                        objectFit: 'contain',
                        flexShrink: 0,
                    }}
                />

                {!isCollapsed && (
                    <Box>
                        <Typography
                            noWrap
                            sx={{
                                fontWeight: 800,
                                color: '#425A8B',
                                fontSize: '16px',
                                letterSpacing: '-0.2px',
                                lineHeight: 1.2,
                            }}
                        >
                            shop
                            <Box component="span" sx={{ color: '#FD9636' }}>
                                CART
                            </Box>
                        </Typography>
                        <Typography
                            noWrap
                            sx={{
                                color: '#8C9EC5',
                                fontSize: '11px',
                                fontWeight: 500,
                                lineHeight: 1.2,
                            }}
                        >
                            Marketplace · GTQ
                        </Typography>
                    </Box>
                )}
            </Stack>

            {/* Navigation items list */}
            <List sx={{ flex: 1, py: 1.5, px: 0, overflowY: 'auto' }}>
                {MenuItems.map((item, index) => (
                    <SidebarItem key={item.name || item.group || index} item={item} />
                ))}
            </List>

            <Divider sx={{ borderColor: '#D5DFE4' }} />

            <Box
                sx={{
                    px: isCollapsed ? 1 : 2.5,
                    py: 1.5,
                    textAlign: isCollapsed ? 'center' : 'left',
                }}
            >
                <Typography variant="caption" sx={{ color: '#8C9EC5', fontSize: '11px' }}>
                    {isCollapsed ? 'v2' : 'shopCART v2.0 · GTQ'}
                </Typography>
            </Box>
        </Box>
    );
};

export const Sidebar: React.FC = () => {
    const { isMobileOpen, closeMobileSidebar, isCollapsed } = useSidebar();

    const currentWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

    return (
        <Box
            component="nav"
            sx={{
                width: { md: currentWidth },
                flexShrink: { md: 0 },
                transition: 'width 0.25s ease',
            }}
        >
            <Drawer
                variant="temporary"
                open={isMobileOpen}
                onClose={closeMobileSidebar}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        width: SIDEBAR_EXPANDED_WIDTH,
                        boxSizing: 'border-box',
                        boxShadow: '0 16px 40px rgba(66, 90, 139, 0.14)',
                        border: 'none',
                    },
                }}
            >
                <SidebarContent />
            </Drawer>

            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        width: currentWidth,
                        boxSizing: 'border-box',
                        transition: 'width 0.25s ease',
                        overflowX: 'hidden',
                        border: 'none',
                    },
                }}
                open
            >
                <SidebarContent />
            </Drawer>
        </Box>
    );
};

export default Sidebar;
