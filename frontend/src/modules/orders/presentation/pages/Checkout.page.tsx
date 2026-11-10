import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Card, Typography, Button, Stack, Chip, Alert, Divider } from '@mui/material';
import { TimerOutlined, LockOutlined, ArrowBackRounded } from '@mui/icons-material';
import { useCartStore } from '../../../../core/store/cartStore';
import {
    createAddress, createCheckoutOrder, deleteAddress,
    getMyAddresses, reserveCheckoutStock,
} from '../../infrastructure/services/orders.service';
import type { CreateShippingAddressPayload, ShippingAddressDto } from '../../domain/order.dto';
import { AddressManagerSection } from '../components/AddressManagerSection';

export const CheckoutPage: React.FC = () => {
    const navigate = useNavigate();
    const { items, appliedCoupon, clearCart } = useCartStore();
    const [addresses, setAddresses] = useState<ShippingAddressDto[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [secondsLeft, setSecondsLeft] = useState<number>(900);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const idempotencyKey = useMemo(
        () => (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
        []
    );

    useEffect(() => {
        if (items.length === 0) return;
        Promise.all([getMyAddresses(), reserveCheckoutStock()])
            .then(([addrs, reservation]) => {
                setAddresses(addrs);
                const def = addrs.find((a) => a.isDefault) || addrs[0];
                if (def) setSelectedAddressId(def.id);
                if (reservation?.expiresAt) setExpiresAt(new Date(reservation.expiresAt));
            })
            .catch((err: unknown) => {
                setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al reservar existencias de tu carrito.');
            });
    }, [items.length]);

    useEffect(() => {
        if (!expiresAt) return;
        const timer = setInterval(() => {
            setSecondsLeft(Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)));
        }, 1000);
        return () => clearInterval(timer);
    }, [expiresAt]);

    const subtotal = Number(items.reduce((acc, i) => acc + i.quantity * i.price, 0).toFixed(2));
    const discount = appliedCoupon ? Math.min(appliedCoupon.discountAmount, subtotal) : 0;
    const total = Math.max(0, Number((subtotal - discount).toFixed(2)));
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const ss = String(secondsLeft % 60).padStart(2, '0');

    const handleCreateAddress = async (payload: CreateShippingAddressPayload) => {
        const created = await createAddress(payload);
        const updated = await getMyAddresses();
        setAddresses(updated);
        setSelectedAddressId(created.id);
    };

    const handleDeleteAddress = async (id: string) => {
        try {
            await deleteAddress(id);
            const updated = await getMyAddresses();
            setAddresses(updated);
            if (selectedAddressId === id) setSelectedAddressId(updated[0]?.id || '');
        } catch (err: unknown) {
            setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'No se pudo eliminar la dirección.');
        }
    };

    const handleConfirmCheckout = async () => {
        if (!selectedAddressId) {
            setError('Selecciona o registra una dirección de entrega.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const order = await createCheckoutOrder({ addressId: selectedAddressId, couponCode: appliedCoupon?.code || null, idempotencyKey });
            await clearCart();
            navigate(`/my-orders?created=${order.orderNumber}`);
        } catch (err: unknown) {
            setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'No se pudo procesar el pedido.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, py: 3 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                    <Typography sx={{ fontSize: '26px', fontWeight: 800, color: '#425A8B' }}>Finalizar Compra (Checkout Seguro)</Typography>
                    <Typography sx={{ fontSize: '13px', color: '#66789C' }}>Transacción atómica con protección de idempotencia y bloqueo de stock</Typography>
                </Box>
                <Chip icon={<TimerOutlined />} label={`Stock reservado por ${mm}:${ss} min`} color={secondsLeft > 120 ? 'warning' : 'error'} sx={{ fontWeight: 700 }} />
            </Stack>

            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2.5 }}>{error}</Alert>}

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <AddressManagerSection addresses={addresses} selectedAddressId={selectedAddressId} onSelectAddress={setSelectedAddressId} onCreateAddress={handleCreateAddress} onDeleteAddress={handleDeleteAddress} />
                    <Button startIcon={<ArrowBackRounded />} onClick={() => navigate('/cart')} sx={{ textTransform: 'none', fontWeight: 700, color: '#425A8B' }}>Volver al Carrito</Button>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Card elevation={0} sx={{ borderRadius: '10px', border: '1px solid #D5DFE4', p: 3 }}>
                        <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#425A8B', mb: 2 }}>2. Resumen y Confirmación</Typography>
                        <Stack spacing={1} sx={{ mb: 2 }}>
                            {items.map((item) => (
                                <Box key={item.variantId} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography sx={{ fontSize: '13px', color: '#425A8B' }}>{item.quantity}x {item.productName}</Typography>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#425A8B' }}>Q{(item.quantity * item.price).toFixed(2)}</Typography>
                                </Box>
                            ))}
                        </Stack>
                        <Divider sx={{ my: 1.5 }} />
                        <Stack spacing={0.75} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: '13px', color: '#66789C' }}>Subtotal:</Typography><Typography sx={{ fontSize: '13.5px', fontWeight: 700 }}>Q{subtotal.toFixed(2)}</Typography></Box>
                            {discount > 0 && <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}><Typography sx={{ fontSize: '13px', fontWeight: 700 }}>Cupón ({appliedCoupon?.code}):</Typography><Typography sx={{ fontSize: '13.5px', fontWeight: 700 }}>-Q{discount.toFixed(2)}</Typography></Box>}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}><Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#425A8B' }}>Total a Pagar:</Typography><Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#FD9636' }}>Q{total.toFixed(2)}</Typography></Box>
                        </Stack>
                        <Button id="checkout-confirm-order-btn" fullWidth variant="contained" disabled={submitting || items.length === 0 || secondsLeft === 0} startIcon={<LockOutlined />} onClick={handleConfirmCheckout} sx={{ bgcolor: '#425A8B', fontWeight: 700, py: 1.3, textTransform: 'none', '&:hover': { bgcolor: '#2B3E66' } }}>
                            {submitting ? 'Procesando Pago...' : 'Confirmar y Pagar Pedido'}
                        </Button>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default CheckoutPage;
