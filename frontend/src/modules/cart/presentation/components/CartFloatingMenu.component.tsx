import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Popover,
    Typography,
    IconButton,
    Button,
    Divider,
    Stack,
    Badge,
    Tooltip,
} from '@mui/material';
import {
    ShoppingCartOutlined,
    DeleteOutlineRounded,
    ShoppingBagOutlined,
    ArrowForwardRounded,
    PaymentRounded,
} from '@mui/icons-material';
import { useCartStore } from '../../../../core/store/cartStore';

export const CartFloatingMenu: React.FC = () => {
    const navigate = useNavigate();
    const { items, removeItem } = useCartStore();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const totalCount = items.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = items.reduce((acc, item) => acc + item.quantity * item.price, 0);

    const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setAnchorEl(event.currentTarget);
    };

    const handleMouseLeave = () => {
        closeTimeoutRef.current = setTimeout(() => {
            setAnchorEl(null);
        }, 250);
    };

    const handlePopoverMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    const handleClose = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
        }
        setAnchorEl(null);
    };

    const handleViewCart = () => {
        handleClose();
        navigate('/cart');
    };

    const handleCheckout = () => {
        handleClose();
        navigate('/cart');
    };

    const handleGoToShop = () => {
        handleClose();
        navigate('/shop');
    };

    const isOpen = Boolean(anchorEl);

    return (
        <Box
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            sx={{ display: 'inline-flex', alignItems: 'center' }}
        >
            <Tooltip title={`Carrito (${totalCount} productos)`} arrow>
                <IconButton
                    id="header-cart-icon-btn"
                    onClick={() => navigate('/cart')}
                    sx={{
                        color: '#425A8B',
                        borderRadius: '8px',
                        '&:hover': {
                            backgroundColor: '#F0F3F8',
                        },
                    }}
                >
                    <Badge
                        badgeContent={totalCount}
                        sx={{
                            '& .MuiBadge-badge': {
                                backgroundColor: '#FD9636',
                                color: '#FFFFFF',
                                fontWeight: 700,
                                fontSize: '11px',
                                minWidth: 18,
                                height: 18,
                            },
                        }}
                    >
                        <ShoppingCartOutlined sx={{ fontSize: 22 }} />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                id="cart-floating-popover"
                open={isOpen}
                anchorEl={anchorEl}
                onClose={handleClose}
                disableRestoreFocus
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                slotProps={{
                    paper: {
                        onMouseEnter: handlePopoverMouseEnter,
                        onMouseLeave: handleMouseLeave,
                        sx: {
                            width: { xs: 320, sm: 380 },
                            maxHeight: 520,
                            borderRadius: '10px',
                            border: '1px solid #D5DFE4',
                            boxShadow: '0 12px 32px rgba(66, 90, 139, 0.16)',
                            backgroundColor: '#FFFFFF',
                            mt: 1.5,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        },
                    },
                }}
                sx={{
                    pointerEvents: isOpen ? 'auto' : 'none',
                }}
            >
                {/* Header del Menú Flotante */}
                <Box
                    sx={{
                        px: 2.25,
                        py: 1.5,
                        backgroundColor: '#F8FAFC',
                        borderBottom: '1px solid #D5DFE4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <ShoppingBagOutlined sx={{ fontSize: 20, color: '#FD9636' }} />
                        <Typography
                            sx={{
                                fontWeight: 700,
                                color: '#425A8B',
                                fontSize: '14px',
                            }}
                        >
                            Mi Carrito
                        </Typography>
                    </Stack>
                    <Typography
                        sx={{
                            fontSize: '12px',
                            color: '#66789C',
                            fontWeight: 600,
                        }}
                    >
                        {totalCount} {totalCount === 1 ? 'ítem' : 'ítems'}
                    </Typography>
                </Box>

                {/* Contenido / Lista de productos */}
                {items.length === 0 ? (
                    <Box
                        sx={{
                            p: 4,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1.5,
                        }}
                    >
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                backgroundColor: '#FFF3E6',
                                color: '#FD9636',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ShoppingCartOutlined sx={{ fontSize: 28 }} />
                        </Box>
                        <Typography
                            sx={{
                                fontWeight: 700,
                                color: '#425A8B',
                                fontSize: '15px',
                            }}
                        >
                            Tu carrito está vacío
                        </Typography>
                        <Typography
                            sx={{
                                color: '#66789C',
                                fontSize: '13px',
                                maxWidth: 260,
                            }}
                        >
                            Explora nuestro catálogo y agrega tus productos favoritos.
                        </Typography>
                        <Button
                            id="cart-empty-shop-cta"
                            variant="contained"
                            size="small"
                            onClick={handleGoToShop}
                            sx={{
                                mt: 1,
                                borderRadius: '8px',
                                backgroundColor: '#425A8B',
                                color: '#FFFFFF',
                                fontWeight: 700,
                                textTransform: 'none',
                                px: 2.5,
                                py: 0.85,
                                '&:hover': {
                                    backgroundColor: '#2B3E66',
                                },
                            }}
                        >
                            Explorar Tienda
                        </Button>
                    </Box>
                ) : (
                    <>
                        <Box
                            sx={{
                                p: 1.5,
                                overflowY: 'auto',
                                maxHeight: 280,
                                '&::-webkit-scrollbar': {
                                    width: '6px',
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    backgroundColor: '#D5DFE4',
                                    borderRadius: '3px',
                                },
                            }}
                        >
                            <Stack spacing={1.25}>
                                {items.map((item) => {
                                    const attributePairs = Object.entries(item.attributes || {});
                                    const attributesLabel = attributePairs
                                        .map(([k, v]) => `${k}: ${v}`)
                                        .join(', ');

                                    return (
                                        <Box
                                            key={item.variantId}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                p: 1,
                                                borderRadius: '8px',
                                                transition: 'background-color 0.15s ease',
                                                '&:hover': {
                                                    backgroundColor: '#F8FAFC',
                                                },
                                            }}
                                        >
                                            {/* Imagen 50x50px */}
                                            <Box
                                                sx={{
                                                    width: 50,
                                                    height: 50,
                                                    minWidth: 50,
                                                    borderRadius: '6px',
                                                    border: '1px solid #D5DFE4',
                                                    backgroundColor: '#FFFFFF',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                {item.imageUrl ? (
                                                    <Box
                                                        component="img"
                                                        src={item.imageUrl}
                                                        alt={item.productName}
                                                        sx={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'contain',
                                                        }}
                                                    />
                                                ) : (
                                                    <ShoppingBagOutlined
                                                        sx={{ color: '#8C9EC5', fontSize: 24 }}
                                                    />
                                                )}
                                            </Box>

                                            {/* Detalle Producto */}
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    noWrap
                                                    sx={{
                                                        fontSize: '13px',
                                                        fontWeight: 700,
                                                        color: '#425A8B',
                                                    }}
                                                >
                                                    {item.productName}
                                                </Typography>
                                                <Typography
                                                    noWrap
                                                    sx={{
                                                        fontSize: '11px',
                                                        color: '#66789C',
                                                        mt: 0.2,
                                                    }}
                                                >
                                                    SKU: {item.sku}
                                                    {attributesLabel ? ` • ${attributesLabel}` : ''}
                                                </Typography>
                                                <Typography
                                                    sx={{
                                                        fontSize: '12.5px',
                                                        color: '#425A8B',
                                                        mt: 0.3,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {item.quantity} ×{' '}
                                                    <Box
                                                        component="span"
                                                        sx={{ color: '#FD9636', fontWeight: 700 }}
                                                    >
                                                        Q{item.price.toFixed(2)}
                                                    </Box>
                                                </Typography>
                                            </Box>

                                            {/* Botón Eliminar */}
                                            <Tooltip title="Eliminar ítem" arrow>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removeItem(item.variantId)}
                                                    sx={{
                                                        color: '#8C9EC5',
                                                        '&:hover': {
                                                            color: '#EF4444',
                                                            backgroundColor: '#FEE2E2',
                                                        },
                                                    }}
                                                >
                                                    <DeleteOutlineRounded sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Box>

                        <Divider sx={{ borderColor: '#D5DFE4' }} />

                        {/* Subtotal y Botones de Acción */}
                        <Box sx={{ p: 2, backgroundColor: '#F8FAFC' }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    mb: 1.75,
                                }}
                            >
                                <Typography
                                    sx={{
                                        color: '#425A8B',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                    }}
                                >
                                    Subtotal:
                                </Typography>
                                <Typography
                                    sx={{
                                        color: '#FD9636',
                                        fontWeight: 800,
                                        fontSize: '17px',
                                    }}
                                >
                                    Q{subtotal.toFixed(2)}
                                </Typography>
                            </Box>

                            <Stack spacing={1}>
                                <Button
                                    id="cart-flyout-view-cart-btn"
                                    fullWidth
                                    variant="outlined"
                                    endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
                                    onClick={handleViewCart}
                                    sx={{
                                        borderRadius: '8px',
                                        borderColor: '#D5DFE4',
                                        color: '#425A8B',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        py: 0.9,
                                        textTransform: 'none',
                                        backgroundColor: '#FFFFFF',
                                        '&:hover': {
                                            borderColor: '#425A8B',
                                            backgroundColor: '#EFF3F8',
                                        },
                                    }}
                                >
                                    Ver Carrito Completo
                                </Button>

                                <Button
                                    id="cart-flyout-checkout-btn"
                                    fullWidth
                                    variant="contained"
                                    startIcon={<PaymentRounded sx={{ fontSize: 17 }} />}
                                    onClick={handleCheckout}
                                    sx={{
                                        borderRadius: '8px',
                                        backgroundColor: '#425A8B',
                                        color: '#FFFFFF',
                                        fontWeight: 700,
                                        fontSize: '13.5px',
                                        py: 1,
                                        textTransform: 'none',
                                        boxShadow: '0 4px 12px rgba(66, 90, 139, 0.25)',
                                        '&:hover': {
                                            backgroundColor: '#2B3E66',
                                        },
                                    }}
                                >
                                    Proceder al Pago / Checkout
                                </Button>
                            </Stack>
                        </Box>
                    </>
                )}
            </Popover>
        </Box>
    );
};

export default CartFloatingMenu;
