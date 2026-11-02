import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Tooltip,
    Collapse,
    List,
    Box,
    Divider,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import type { MenuItem } from './menuItems';
import { useSidebar } from './SidebarContext';
import { useAuthStore } from '../../../../core/store/authStore';
import { hasSomeRole } from '../../../../core/utils/permissions';

interface SidebarItemProps {
    item: MenuItem;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ item }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isCollapsed, closeMobileSidebar } = useSidebar();
    const user = useAuthStore((state) => state.user);

    const [openSubmenu, setOpenSubmenu] = useState(false);

    if (item.requiresAuth && !user) {
        return null;
    }

    if (item.roles && item.roles.length > 0 && !hasSomeRole(user, item.roles)) {
        return null;
    }

    if (item.group) {
        if (isCollapsed) {
            return <Divider sx={{ my: 1, borderColor: '#D5DFE4' }} />;
        }
        return (
            <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: '#8C9EC5',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                    }}
                >
                    {item.group}
                </Typography>
            </Box>
        );
    }

    const IconComponent = item.icon;
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isActive = item.link
        ? item.link === '/shop'
            ? location.pathname === '/' || location.pathname.startsWith('/shop')
            : location.pathname.startsWith(item.link)
        : false;

    const handleClick = () => {
        if (hasChildren) {
            setOpenSubmenu(!openSubmenu);
        } else if (item.link) {
            navigate(item.link);
            closeMobileSidebar();
        }
    };

    const buttonContent = (
        <ListItemButton
            selected={isActive}
            onClick={handleClick}
            sx={{
                minHeight: 40,
                px: 2,
                py: 0.75,
                mx: isCollapsed ? 1 : 1.5,
                my: 0.35,
                borderRadius: '8px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                backgroundColor: isActive ? '#FFF3E6' : 'transparent',
                border: isActive ? '1px solid #FD9636' : '1px solid transparent',
                '&:hover': {
                    backgroundColor: isActive ? '#FFF3E6' : '#F0F3F8',
                    borderColor: isActive ? '#FD9636' : '#D5DFE4',
                },
                '&.Mui-selected': {
                    backgroundColor: '#FFF3E6',
                    '&:hover': {
                        backgroundColor: '#FFF3E6',
                    },
                },
            }}
        >
            {IconComponent && (
                <ListItemIcon
                    sx={{
                        minWidth: 0,
                        mr: isCollapsed ? 0 : 1.5,
                        justifyContent: 'center',
                        color: isActive ? '#FD9636' : '#425A8B',
                    }}
                >
                    <IconComponent sx={{ fontSize: 19 }} />
                </ListItemIcon>
            )}

            {!isCollapsed && (
                <ListItemText
                    primary={item.name}
                    slotProps={{
                        primary: {
                            variant: 'body2',
                            sx: {
                                fontWeight: isActive ? 700 : 600,
                                color: isActive ? '#FD9636' : '#425A8B',
                                fontSize: '13.5px',
                            },
                        },
                    }}
                />
            )}

            {!isCollapsed && hasChildren && (
                openSubmenu ? (
                    <ExpandLess sx={{ fontSize: 18, color: '#8C9EC5' }} />
                ) : (
                    <ExpandMore sx={{ fontSize: 18, color: '#8C9EC5' }} />
                )
            )}
        </ListItemButton>
    );

    return (
        <>
            {isCollapsed ? (
                <Tooltip title={item.name ?? ''} placement="right" arrow>
                    {buttonContent}
                </Tooltip>
            ) : (
                buttonContent
            )}

            {hasChildren && !isCollapsed && (
                <Collapse in={openSubmenu} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ pl: 2 }}>
                        {item.children?.map((child, idx) => (
                            <SidebarItem key={child.name || idx} item={child} />
                        ))}
                    </List>
                </Collapse>
            )}
        </>
    );
};

export default SidebarItem;
