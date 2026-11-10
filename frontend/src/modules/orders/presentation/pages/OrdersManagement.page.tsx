import React, { useEffect, useState, useCallback } from 'react';
import { Box, Card, Typography, Button, Stack, Chip, TextField, MenuItem, Alert } from '@mui/material';
import { LocalShippingOutlined, VisibilityOutlined } from '@mui/icons-material';
import {
    advanceOrderStatus, cancelOrderById, getAllOrdersPaginated,
    getOrderById, processOrderReturn,
} from '../../infrastructure/services/orders.service';
import type { OrderDetailDto, OrderItemDto, OrderStatus, OrderSummaryDto } from '../../domain/order.dto';
import { OrderDetailDialog } from '../components/OrderDetailDialog';
import { OrderReturnDialog } from '../components/OrderReturnDialog';

const NEXT_STEP_MAP: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
    CREADO: { next: 'PAGADO', label: 'Confirmar Pago' },
    PAGADO: { next: 'PREPARACION', label: 'Preparar Pedido' },
    PREPARACION: { next: 'DESPACHADO', label: 'Despachar Pedido' },
    DESPACHADO: { next: 'ENTREGADO', label: 'Marcar Entregado' },
};

export const OrdersManagementPage: React.FC = () => {
    const [orders, setOrders] = useState<OrderSummaryDto[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [search, setSearch] = useState<string>('');
    const [selectedOrder, setSelectedOrder] = useState<OrderDetailDto | null>(null);
    const [detailOpen, setDetailOpen] = useState<boolean>(false);
    const [returnItem, setReturnItem] = useState<OrderItemDto | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadOrders = useCallback(async () => {
        try {
            const res = await getAllOrdersPaginated({
                page: 1, limit: 30, status: statusFilter || undefined, q: search || undefined,
            });
            setOrders(res.data);
        } catch {
            setError('Error al cargar la bandeja operativa de pedidos.');
        }
    }, [statusFilter, search]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const handleOpenDetail = async (id: string) => {
        const detail = await getOrderById(id);
        setSelectedOrder(detail);
        setDetailOpen(true);
    };

    const handleAdvance = async (order: OrderSummaryDto, nextStatus: OrderStatus) => {
        try {
            const updated = await advanceOrderStatus(order.id, nextStatus);
            setFeedback(`Pedido ${order.orderNumber} avanzado a ${nextStatus}.`);
            if (selectedOrder?.id === order.id) setSelectedOrder(updated);
            await loadOrders();
        } catch (err: unknown) {
            setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al cambiar el estado del pedido.');
        }
    };

    const handleCancel = async (order: OrderSummaryDto) => {
        try {
            await cancelOrderById(order.id, 'Cancelado por Operador/Administrador');
            setFeedback(`Pedido ${order.orderNumber} cancelado y stock reintegrado al Kardex.`);
            await loadOrders();
        } catch (err: unknown) {
            setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'No se puede cancelar este pedido.');
        }
    };

    const handleConfirmReturn = async (payload: { orderItemId: string; quantity: number; reason: string }) => {
        if (!selectedOrder) return;
        const updated = await processOrderReturn(selectedOrder.id, payload);
        setSelectedOrder(updated);
        setFeedback('Devolución procesada y existencias reintegradas al Kardex.');
        await loadOrders();
    };

    return (
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
                <LocalShippingOutlined sx={{ color: '#FD9636', fontSize: 30 }} />
                <Box>
                    <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#425A8B' }}>Gestión de Pedidos, Despachos y Devoluciones</Typography>
                    <Typography sx={{ fontSize: '13px', color: '#66789C' }}>Panel Operativo (Operador / Administrador) — Ciclo de vida controlado y reintegro a Kardex</Typography>
                </Box>
            </Stack>

            {feedback && <Alert severity="success" onClose={() => setFeedback(null)} sx={{ mb: 2 }}>{feedback}</Alert>}
            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

            <Card elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: '10px', border: '1px solid #D5DFE4' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField size="small" fullWidth placeholder="Buscar por # de pedido, nombre o correo del cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    <TextField select size="small" label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 210 }}>
                        <MenuItem value="">Todos los estados</MenuItem>
                        {['PAGADO', 'PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO', 'DEVUELTO'].map((st) => (
                            <MenuItem key={st} value={st}>{st}</MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </Card>

            <Stack spacing={1.5}>
                {orders.map((o) => {
                    const step = NEXT_STEP_MAP[o.status];
                    const canCancel = ['CREADO', 'PAGADO', 'PREPARACION'].includes(o.status);
                    return (
                        <Card key={o.id} elevation={0} sx={{ p: 2.25, borderRadius: '10px', border: '1px solid #D5DFE4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                                    <Typography sx={{ fontWeight: 800, color: '#425A8B' }}>{o.orderNumber}</Typography>
                                    <Chip label={o.status} size="small" color="primary" sx={{ fontWeight: 700 }} />
                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#FD9636' }}>Q{o.total.toFixed(2)}</Typography>
                                </Stack>
                                <Typography sx={{ fontSize: '12.5px', color: '#66789C' }}>
                                    Cliente: <strong>{o.customerName}</strong> ({o.customerEmail}) · {o.itemsCount} uds · {o.shippingAddressSummary}
                                </Typography>
                            </Box>
                            <Stack direction="row" spacing={1}>
                                {step && <Button size="small" variant="contained" onClick={() => handleAdvance(o, step.next)} sx={{ bgcolor: '#425A8B', textTransform: 'none', fontWeight: 700 }}>{step.label}</Button>}
                                {canCancel && <Button size="small" color="error" variant="outlined" onClick={() => handleCancel(o)} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancelar</Button>}
                                <Button size="small" variant="outlined" startIcon={<VisibilityOutlined />} onClick={() => handleOpenDetail(o.id)} sx={{ textTransform: 'none', fontWeight: 700 }}>Detalle / Devoluciones</Button>
                            </Stack>
                        </Card>
                    );
                })}
            </Stack>

            <OrderDetailDialog open={detailOpen} order={selectedOrder} canProcessReturns={true} onClose={() => setDetailOpen(false)} onOpenReturnDialog={(item) => setReturnItem(item)} />
            <OrderReturnDialog open={Boolean(returnItem)} orderId={selectedOrder?.id || ''} item={returnItem} onClose={() => setReturnItem(null)} onConfirmReturn={handleConfirmReturn} />
        </Box>
    );
};

export default OrdersManagementPage;
