import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Grid,
    Card,
    Typography,
    Breadcrumbs,
    Link,
    IconButton,
    Button,
    Divider,
    Stack,
    TextField,
    InputAdornment,
    Alert,
    Chip,
    Tooltip,
    LinearProgress,
} from '@mui/material';
import {
    NavigateNextRounded,
    ShoppingCartOutlined,
    DeleteOutlineRounded,
    AddRounded,
    RemoveRounded,
    LocalMallOutlined,
    ShoppingBagOutlined,
    ArrowBackRounded,
    PaymentRounded,
    CheckCircleOutlineRounded,
    SecurityRounded,
    LocalShippingOutlined,
    LoyaltyOutlined,
} from '@mui/icons-material';
import { useCartStore } from '../../../../core/store/cartStore';
import { validateCouponCode } from '../../../coupons/infrastructure/services/coupons.service';

const FREE_SHIPPING_THRESHOLD = 300;
const STANDARD_SHIPPING_COST = 25;

export const CartPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        items,
        guestToken,
        appliedCoupon,
        setAppliedCoupon,
        removeCoupon,
        updateQuantity,
        removeItem,
        clearCart,
    } = useCartStore();

    const [couponCode, setCouponCode] = useState<string>(
        appliedCoupon?.code || ''
    );
    const [validatingCoupon, setValidatingCoupon] = useState<boolean>(false);
    const [couponMessage, setCouponMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    const subtotal = Number(
        items
            .reduce((acc, item) => acc + item.quantity * item.price, 0)
            .toFixed(2)
    );
    const shippingCost =
        items.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
            ? 0
            : STANDARD_SHIPPING_COST;

    // Recalculate discount accurately against current cart items (including category filter & cap >= Q0.00)
    let discountAmount = 0;
    if (appliedCoupon && subtotal >= appliedCoupon.minOrderAmount) {
        const eligibleSub = appliedCoupon.categoryId
            ? Number(
                  items
                      .filter(
                          (i) =>
                              !i.categoryId ||
                              i.categoryId === appliedCoupon.categoryId
                      )
                      .reduce((acc, i) => acc + i.quantity * i.price, 0)
                      .toFixed(2)
              )
            : subtotal;

        const rawDiscount =
            appliedCoupon.discountType === 'PORCENTAJE'
                ? Number(
                      (
                          eligibleSub *
                          (appliedCoupon.discountValue / 100)
                      ).toFixed(2)
                  )
                : Number(appliedCoupon.discountValue.toFixed(2));

        discountAmount = Math.min(rawDiscount, eligibleSub, subtotal);
    }

    const discountedSubtotal = Math.max(
        0,
        Number((subtotal - discountAmount).toFixed(2))
    );
    const grandTotal = Number((discountedSubtotal + shippingCost).toFixed(2));

    const amountForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
    const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

    const handleApplyCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = couponCode.trim().toUpperCase();
        if (!code) {
            setCouponMessage({
                type: 'error',
                text: 'Ingresa un código de cupón válido.',
            });
            return;
        }

        setValidatingCoupon(true);
        setCouponMessage(null);
        try {
            const result = await validateCouponCode({
                code,
                subtotal,
                guestToken,
            });
            setAppliedCoupon(result);
            setCouponCode(result.code);
            setCouponMessage({
                type: 'success',
                text: `¡Cupón ${result.code} aplicado! Ahorras Q${result.discountAmount.toFixed(2)}${
                    result.categoryName
                        ? ` en la categoría ${result.categoryName}`
                        : ''
                }.`,
            });
        } catch (err: unknown) {
            removeCoupon();
            const axiosErr = err as {
                response?: { data?: { message?: string } };
            };
            const backendMsg =
                axiosErr.response?.data?.message ||
                'El cupón ingresado no existe, ha vencido o no cumple las condiciones.';
            setCouponMessage({
                type: 'error',
                text: backendMsg,
            });
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        removeCoupon();
        setCouponCode('');
        setCouponMessage(null);
    };

    const handleProceedToCheckout = () => {
        // En una tienda real llevaría a la pantalla de Checkout o pasarela
        // Aquí mostramos confirmación o preparamos la orden
        navigate('/shop');
    };

    return (
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>
            {/* Breadcrumb Ecom Marketplace: Home > Shop > Carrito de Compras */}
            <Breadcrumbs
                separator={<NavigateNextRounded sx={{ fontSize: 16, color: '#8C9EC5' }} />}
                sx={{ mb: 2.5 }}
            >
                <Link
                    component={RouterLink}
                    to="/"
                    underline="hover"
                    sx={{
                        fontSize: '13px',
                        color: '#66789C',
                        fontWeight: 600,
                        '&:hover': { color: '#FD9636' },
                    }}
                >
                    Home
                </Link>
                <Link
                    component={RouterLink}
                    to="/shop"
                    underline="hover"
                    sx={{
                        fontSize: '13px',
                        color: '#66789C',
                        fontWeight: 600,
                        '&:hover': { color: '#FD9636' },
                    }}
                >
                    Shop
                </Link>
                <Typography sx={{ fontSize: '13px', color: '#425A8B', fontWeight: 700 }}>
                    Carrito de Compras
                </Typography>
            </Breadcrumbs>

            {/* Header de la página */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    mb: 3,
                    flexWrap: 'wrap',
                    gap: 1.5,
                }}
            >
                <Box>
                    <Typography
                        component="h1"
                        sx={{
                            fontSize: { xs: '24px', sm: '28px' },
                            fontWeight: 800,
                            color: '#425A8B',
                            letterSpacing: '-0.5px',
                        }}
                    >
                        Carrito de Compras
                    </Typography>
                    <Typography sx={{ fontSize: '13.5px', color: '#66789C', mt: 0.25 }}>
                        Revisa tus artículos seleccionados antes de completar el pedido
                    </Typography>
                </Box>

                {items.length > 0 && (
                    <Button
                        id="cart-clear-all-btn"
                        size="small"
                        onClick={() => clearCart()}
                        startIcon={<DeleteOutlineRounded sx={{ fontSize: 16 }} />}
                        sx={{
                            color: '#66789C',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '13px',
                            '&:hover': {
                                color: '#EF4444',
                                backgroundColor: '#FEE2E2',
                            },
                        }}
                    >
                        Vaciar Carrito
                    </Button>
                )}
            </Box>

            {items.length === 0 ? (
                /* ── ESTADO VACÍO ─────────────────────────────────────────── */
                <Card
                    elevation={0}
                    sx={{
                        borderRadius: '10px',
                        border: '1px solid #D5DFE4',
                        p: { xs: 4, sm: 6 },
                        textAlign: 'center',
                        backgroundColor: '#FFFFFF',
                    }}
                >
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            backgroundColor: '#FFF3E6',
                            color: '#FD9636',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 2.5,
                        }}
                    >
                        <ShoppingCartOutlined sx={{ fontSize: 40 }} />
                    </Box>
                    <Typography
                        sx={{
                            fontSize: '20px',
                            fontWeight: 800,
                            color: '#425A8B',
                            mb: 1,
                        }}
                    >
                        Tu carrito de compras está vacío
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '14px',
                            color: '#66789C',
                            maxWidth: 420,
                            mx: 'auto',
                            mb: 3,
                        }}
                    >
                        Parece que aún no has agregado productos a tu bolsa. ¡Explora nuestra tienda
                        y encuentra las mejores ofertas!
                    </Typography>
                    <Button
                        id="cart-empty-state-shop-cta"
                        variant="contained"
                        startIcon={<LocalMallOutlined sx={{ fontSize: 18 }} />}
                        onClick={() => navigate('/shop')}
                        sx={{
                            borderRadius: '8px',
                            backgroundColor: '#425A8B',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '14.5px',
                            px: 3.5,
                            py: 1.2,
                            textTransform: 'none',
                            boxShadow: '0 4px 14px rgba(66, 90, 139, 0.25)',
                            '&:hover': {
                                backgroundColor: '#2B3E66',
                            },
                        }}
                    >
                        Explorar Catálogo de Productos
                    </Button>
                </Card>
            ) : (
                /* ── CONTENIDO PRINCIPAL: TABLA + SIDEBAR ─────────────────── */
                <Grid container spacing={3}>
                    {/* Columna Izquierda: Tabla interactiva de compras */}
                    <Grid size={{ xs: 12, lg: 8 }}>
                        {/* Barra de progreso de Envío Gratis */}
                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: '10px',
                                border: '1px solid #D5DFE4',
                                mb: 2.5,
                                backgroundColor: '#FFFFFF',
                                p: 2,
                            }}
                        >
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
                                <LocalShippingOutlined
                                    sx={{
                                        color: amountForFreeShipping === 0 ? '#10B981' : '#FD9636',
                                        fontSize: 22,
                                    }}
                                />
                                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#425A8B' }}>
                                    {amountForFreeShipping === 0 ? (
                                        <Box component="span" sx={{ color: '#10B981' }}>
                                            ¡Felicidades! Tienes Envío Gratis para este pedido.
                                        </Box>
                                    ) : (
                                        <>
                                            Agrega{' '}
                                            <Box component="span" sx={{ color: '#FD9636' }}>
                                                Q{amountForFreeShipping.toFixed(2)}
                                            </Box>{' '}
                                            más en productos para obtener <strong>Envío Gratis</strong>.
                                        </>
                                    )}
                                </Typography>
                            </Stack>
                            <LinearProgress
                                variant="determinate"
                                value={freeShippingProgress}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: '#EFF3F8',
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 4,
                                        backgroundColor:
                                            amountForFreeShipping === 0 ? '#10B981' : '#FD9636',
                                    },
                                }}
                            />
                        </Card>

                        {/* Tarjeta de Lista / Tabla de Productos */}
                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: '10px',
                                border: '1px solid #D5DFE4',
                                backgroundColor: '#FFFFFF',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Cabecera de la Tabla (Visible en pantallas md y mayores) */}
                            <Box
                                sx={{
                                    display: { xs: 'none', md: 'grid' },
                                    gridTemplateColumns: '4fr 1.5fr 2fr 1.5fr 0.8fr',
                                    gap: 2,
                                    px: 3,
                                    py: 1.75,
                                    backgroundColor: '#F8FAFC',
                                    borderBottom: '1px solid #D5DFE4',
                                }}
                            >
                                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#425A8B' }}>
                                    PRODUCTO
                                </Typography>
                                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#425A8B', textAlign: 'right' }}>
                                    PRECIO UNITARIO
                                </Typography>
                                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#425A8B', textAlign: 'center' }}>
                                    CANTIDAD
                                </Typography>
                                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#425A8B', textAlign: 'right' }}>
                                    SUBTOTAL
                                </Typography>
                                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#425A8B', textAlign: 'center' }}>
                                    ACCIÓN
                                </Typography>
                            </Box>

                            {/* Filas de Ítems */}
                            <Box sx={{ divideY: '1px solid #EFF3F8' }}>
                                {items.map((item) => {
                                    const itemSubtotal = item.quantity * item.price;
                                    const attributePairs = Object.entries(item.attributes || {});
                                    const maxStock = item.stockAvailable ?? 999;

                                    return (
                                        <Box
                                            key={item.variantId}
                                            sx={{
                                                p: { xs: 2, sm: 3 },
                                                borderBottom: '1px solid #EFF3F8',
                                                display: { xs: 'flex', md: 'grid' },
                                                flexDirection: { xs: 'column', sm: 'row' },
                                                gridTemplateColumns: { md: '4fr 1.5fr 2fr 1.5fr 0.8fr' },
                                                gap: 2,
                                                alignItems: { xs: 'flex-start', md: 'center' },
                                                transition: 'background-color 0.15s ease',
                                                '&:hover': {
                                                    backgroundColor: '#FAFCFE',
                                                },
                                            }}
                                        >
                                            {/* Columna Producto */}
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    gap: 2,
                                                    alignItems: 'center',
                                                    width: '100%',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 72,
                                                        height: 72,
                                                        minWidth: 72,
                                                        borderRadius: '8px',
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
                                                            sx={{ color: '#8C9EC5', fontSize: 32 }}
                                                        />
                                                    )}
                                                </Box>

                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography
                                                        component={RouterLink}
                                                        to={`/shop/products/${item.productId}`}
                                                        sx={{
                                                            fontSize: '14px',
                                                            fontWeight: 700,
                                                            color: '#425A8B',
                                                            textDecoration: 'none',
                                                            lineHeight: 1.3,
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                            '&:hover': {
                                                                color: '#FD9636',
                                                                textDecoration: 'underline',
                                                            },
                                                        }}
                                                    >
                                                        {item.productName}
                                                    </Typography>
                                                    <Typography
                                                        sx={{
                                                            fontSize: '11.5px',
                                                            color: '#66789C',
                                                            mt: 0.3,
                                                        }}
                                                    >
                                                        SKU: <strong>{item.sku}</strong>
                                                        {item.stockAvailable !== undefined && (
                                                            <Box
                                                                component="span"
                                                                sx={{
                                                                    ml: 1,
                                                                    color:
                                                                        item.quantity >=
                                                                        item.stockAvailable
                                                                            ? '#D97706'
                                                                            : '#047857',
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                · Stock disponible:{' '}
                                                                {item.stockAvailable} uds.
                                                            </Box>
                                                        )}
                                                    </Typography>

                                                    {attributePairs.length > 0 && (
                                                        <Stack
                                                            direction="row"
                                                            spacing={0.5}
                                                            sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}
                                                        >
                                                            {attributePairs.map(([k, v]) => (
                                                                <Chip
                                                                    key={k}
                                                                    label={`${k}: ${v}`}
                                                                    size="small"
                                                                    sx={{
                                                                        height: 20,
                                                                        fontSize: '10.5px',
                                                                        borderRadius: '4px',
                                                                        backgroundColor: '#EFF3F8',
                                                                        color: '#425A8B',
                                                                        fontWeight: 600,
                                                                    }}
                                                                />
                                                            ))}
                                                        </Stack>
                                                    )}
                                                </Box>
                                            </Box>

                                            {/* Columna Precio Unitario */}
                                            <Box
                                                sx={{
                                                    textAlign: { xs: 'left', md: 'right' },
                                                    width: { xs: '100%', md: 'auto' },
                                                    display: 'flex',
                                                    justifyContent: { xs: 'space-between', md: 'flex-end' },
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        display: { xs: 'block', md: 'none' },
                                                        fontSize: '12px',
                                                        color: '#66789C',
                                                    }}
                                                >
                                                    Precio unitario:
                                                </Typography>
                                                <Typography
                                                    sx={{
                                                        fontSize: '14px',
                                                        fontWeight: 700,
                                                        color: '#425A8B',
                                                    }}
                                                >
                                                    Q{item.price.toFixed(2)}
                                                </Typography>
                                            </Box>

                                            {/* Columna Cantidad interactiva con selector - / + */}
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: { xs: 'space-between', md: 'center' },
                                                    width: { xs: '100%', md: 'auto' },
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        display: { xs: 'block', md: 'none' },
                                                        fontSize: '12px',
                                                        color: '#66789C',
                                                    }}
                                                >
                                                    Cantidad:
                                                </Typography>
                                                <Box
                                                    sx={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        border: '1px solid #D5DFE4',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#FFFFFF',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <IconButton
                                                        id={`cart-item-decrease-${item.variantId}`}
                                                        size="small"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.variantId,
                                                                Math.max(1, item.quantity - 1)
                                                            )
                                                        }
                                                        disabled={item.quantity <= 1}
                                                        sx={{
                                                            p: 0.75,
                                                            color: '#425A8B',
                                                            borderRadius: 0,
                                                            '&:hover': { backgroundColor: '#F0F3F8' },
                                                        }}
                                                    >
                                                        <RemoveRounded sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                    <Typography
                                                        sx={{
                                                            minWidth: 36,
                                                            textAlign: 'center',
                                                            fontWeight: 700,
                                                            fontSize: '13.5px',
                                                            color: '#425A8B',
                                                        }}
                                                    >
                                                        {item.quantity}
                                                    </Typography>
                                                    <IconButton
                                                        id={`cart-item-increase-${item.variantId}`}
                                                        size="small"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.variantId,
                                                                item.quantity + 1
                                                            )
                                                        }
                                                        disabled={item.quantity >= maxStock}
                                                        sx={{
                                                            p: 0.75,
                                                            color: '#425A8B',
                                                            borderRadius: 0,
                                                            '&:hover': { backgroundColor: '#F0F3F8' },
                                                        }}
                                                    >
                                                        <AddRounded sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Box>
                                            </Box>

                                            {/* Columna Subtotal */}
                                            <Box
                                                sx={{
                                                    textAlign: { xs: 'left', md: 'right' },
                                                    width: { xs: '100%', md: 'auto' },
                                                    display: 'flex',
                                                    justifyContent: { xs: 'space-between', md: 'flex-end' },
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        display: { xs: 'block', md: 'none' },
                                                        fontSize: '12px',
                                                        color: '#66789C',
                                                    }}
                                                >
                                                    Subtotal:
                                                </Typography>
                                                <Typography
                                                    sx={{
                                                        fontSize: '15px',
                                                        fontWeight: 800,
                                                        color: '#FD9636',
                                                    }}
                                                >
                                                    Q{itemSubtotal.toFixed(2)}
                                                </Typography>
                                            </Box>

                                            {/* Columna Acción: Remover */}
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: { xs: 'flex-end', md: 'center' },
                                                    width: { xs: '100%', md: 'auto' },
                                                }}
                                            >
                                                <Tooltip title="Eliminar ítem del carrito" arrow>
                                                    <IconButton
                                                        id={`cart-item-remove-${item.variantId}`}
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
                                                        <DeleteOutlineRounded sx={{ fontSize: 19 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Card>

                        {/* Botón Volver a la tienda */}
                        <Box sx={{ mt: 2.5 }}>
                            <Button
                                id="cart-continue-shopping-btn"
                                component={RouterLink}
                                to="/shop"
                                startIcon={<ArrowBackRounded sx={{ fontSize: 16 }} />}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    fontSize: '13.5px',
                                    color: '#425A8B',
                                    '&:hover': {
                                        color: '#FD9636',
                                        backgroundColor: '#EFF3F8',
                                    },
                                }}
                            >
                                Continuar Comprando
                            </Button>
                        </Box>
                    </Grid>

                    {/* Columna Derecha: Resumen del Pedido (Sidebar) */}
                    <Grid size={{ xs: 12, lg: 4 }}>
                        <Card
                            elevation={0}
                            sx={{
                                borderRadius: '10px',
                                border: '1px solid #D5DFE4',
                                backgroundColor: '#FFFFFF',
                                p: 3,
                                boxShadow: '0 8px 24px rgba(66, 90, 139, 0.06)',
                            }}
                        >
                            <Typography
                                component="h2"
                                sx={{
                                    fontSize: '17px',
                                    fontWeight: 800,
                                    color: '#425A8B',
                                    mb: 2,
                                }}
                            >
                                Resumen del Pedido
                            </Typography>

                            <Stack spacing={1.5} sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography sx={{ fontSize: '13.5px', color: '#66789C' }}>
                                        Subtotal ({items.reduce((acc, i) => acc + i.quantity, 0)}{' '}
                                        artículos)
                                    </Typography>
                                    <Typography
                                        sx={{ fontSize: '14px', fontWeight: 700, color: '#425A8B' }}
                                    >
                                        Q{subtotal.toFixed(2)}
                                    </Typography>
                                </Box>

                                {appliedCoupon && discountAmount > 0 && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            color: '#10B981',
                                        }}
                                    >
                                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                            <Typography sx={{ fontSize: '13.5px', fontWeight: 600 }}>
                                                Descuento ({appliedCoupon.code})
                                            </Typography>
                                            <Chip
                                                label="Quitar"
                                                size="small"
                                                onClick={handleRemoveCoupon}
                                                sx={{
                                                    height: 18,
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    backgroundColor: '#FEE2E2',
                                                    color: '#B91C1C',
                                                    cursor: 'pointer',
                                                }}
                                            />
                                        </Stack>
                                        <Typography sx={{ fontSize: '14px', fontWeight: 700 }}>
                                            -Q{discountAmount.toFixed(2)}
                                        </Typography>
                                    </Box>
                                )}

                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography sx={{ fontSize: '13.5px', color: '#66789C' }}>
                                        Envío Estimado
                                    </Typography>
                                    <Typography
                                        sx={{
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            color: shippingCost === 0 ? '#10B981' : '#425A8B',
                                        }}
                                    >
                                        {shippingCost === 0 ? 'Gratis' : `Q${shippingCost.toFixed(2)}`}
                                    </Typography>
                                </Box>
                            </Stack>

                            {/* Campo de Cupón de Descuento */}
                            <Box component="form" onSubmit={handleApplyCoupon} sx={{ mb: 2.5 }}>
                                <Typography
                                    sx={{
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: '#425A8B',
                                        mb: 0.75,
                                    }}
                                >
                                    Cupón de Descuento
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        placeholder="Ej. SHOP10"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '8px',
                                                borderColor: '#D5DFE4',
                                                fontSize: '13px',
                                            },
                                        }}
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <LoyaltyOutlined
                                                            sx={{ fontSize: 16, color: '#8C9EC5' }}
                                                        />
                                                    </InputAdornment>
                                                ),
                                            },
                                        }}
                                    />
                                    <Button
                                        id="cart-apply-coupon-btn"
                                        type="submit"
                                        variant="outlined"
                                        disabled={validatingCoupon}
                                        sx={{
                                            borderRadius: '8px',
                                            borderColor: '#425A8B',
                                            color: '#425A8B',
                                            fontWeight: 700,
                                            fontSize: '12.5px',
                                            px: 2,
                                            textTransform: 'none',
                                            '&:hover': {
                                                backgroundColor: '#EFF3F8',
                                                borderColor: '#2B3E66',
                                            },
                                        }}
                                    >
                                        {validatingCoupon ? 'Validando...' : 'Aplicar'}
                                    </Button>
                                </Stack>

                                {couponMessage && (
                                    <Alert
                                        severity={couponMessage.type}
                                        onClose={() => setCouponMessage(null)}
                                        sx={{
                                            mt: 1.25,
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            py: 0.25,
                                        }}
                                    >
                                        {couponMessage.text}
                                    </Alert>
                                )}
                            </Box>

                            <Divider sx={{ borderColor: '#D5DFE4', my: 2 }} />

                            {/* Total Final */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    mb: 2.5,
                                }}
                            >
                                <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#425A8B' }}>
                                    Total:
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: '22px',
                                        fontWeight: 800,
                                        color: '#FD9636',
                                    }}
                                >
                                    Q{grandTotal.toFixed(2)}
                                </Typography>
                            </Box>

                            {/* Botón Principal de Checkout */}
                            <Button
                                id="cart-proceed-checkout-btn"
                                fullWidth
                                variant="contained"
                                startIcon={<PaymentRounded sx={{ fontSize: 18 }} />}
                                onClick={handleProceedToCheckout}
                                sx={{
                                    borderRadius: '8px',
                                    backgroundColor: '#425A8B',
                                    color: '#FFFFFF',
                                    fontWeight: 700,
                                    fontSize: '14.5px',
                                    py: 1.35,
                                    textTransform: 'none',
                                    boxShadow: '0 4px 14px rgba(66, 90, 139, 0.25)',
                                    '&:hover': {
                                        backgroundColor: '#2B3E66',
                                    },
                                }}
                            >
                                Proceder al Pago / Checkout
                            </Button>

                            {/* Badges de Confianza */}
                            <Stack spacing={1} sx={{ mt: 3, pt: 2, borderTop: '1px solid #EFF3F8' }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <SecurityRounded sx={{ fontSize: 16, color: '#10B981' }} />
                                    <Typography sx={{ fontSize: '11.5px', color: '#66789C' }}>
                                        Pago 100% Seguro cifrado de 256 bits
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <CheckCircleOutlineRounded sx={{ fontSize: 16, color: '#10B981' }} />
                                    <Typography sx={{ fontSize: '11.5px', color: '#66789C' }}>
                                        Garantía de satisfacción y devolución fácil
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

export default CartPage;
