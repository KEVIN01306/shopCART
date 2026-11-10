import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Card, Typography, Button, Stack, Chip, Alert } from '@mui/material';
import { VisibilityOutlined, CancelOutlined, ReceiptLongOutlined } from '@mui/icons-material';
import { cancelOrderById, getMyOrdersPaginated, getOrderById } from '../../infrastructure/services/orders.service';
import type { OrderDetailDto, OrderSummaryDto } from '../../domain/order.dto';
import { OrderDetailDialog } from '../components/OrderDetailDialog';

export const MyOrdersPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const createdOrderNum = searchParams.get('created');
    const [orders, setOrders] = useState<OrderSummaryDto[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetailDto | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(
        createdOrderNum ? `¡Pedido ${createdOrderNum} confirmado y pagado exitosamente!` : null
    );
    const [error, setError] = useState<string | null>(null);

    const loadOrders = useCallback(async () => {
        try {
            const res = await getMyOrdersPaginated({ page: 1, limit: 25 });
            setOrders(res.data);
        } catch {
            setError('Error al cargar tu historial de pedidos.');
        }
    }, []);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const handleViewDetail = async (id: string) => {
        try {
            const detail = await getOrderById(id);
            setSelectedOrder(detail);
            setDetailOpen(true);
        } catch {
            setError('No se pudo cargar el detalle del pedido.');
        }
    };

    const handleCancelOrder = async (order: OrderSummaryDto) => {
        try {
            await cancelOrderById(order.id, 'Cancelado por el cliente antes de despacho');
            setFeedback(`El pedido ${order.orderNumber} fue cancelado y su stock reintegrado.`);
            await loadOrders();
        } catch (err: unknown) {
            setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'No se pudo cancelar el pedido.');
        }
    };

    return (
        <Box sx={{ maxWidth: 1180, mx: 'auto', px: 3, py: 3 }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2.5 }}>
                <ReceiptLongOutlined sx={{ color: '#FD9636', fontSize: 28 }} />
                <Box>
                    <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#425A8B' }}>Mis Pedidos y Seguimiento</Typography>
                    <Typography sx={{ fontSize: '13px', color: '#66789C' }}>Consulta el estado de tus compras, historial de estados y devoluciones</Typography>
                </Box>
            </Stack>

            {feedback && <Alert severity="success" onClose={() => setFeedback(null)} sx={{ mb: 2 }}>{feedback}</Alert>}
            {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

            <Stack spacing={1.5}>
                {orders.length === 0 ? (
                    <Card elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid #D5DFE4', borderRadius: '10px' }}>
                        <Typography sx={{ color: '#66789C', fontWeight: 600 }}>Aún no has realizado ningún pedido.</Typography>
                    </Card>
                ) : (
                    orders.map((o) => {
                        const canCancel = ['CREADO', 'PAGADO', 'PREPARACION'].includes(o.status);
                        return (
                            <Card
                                key={o.id}
                                elevation={0}
                                sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #D5DFE4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
                            >
                                <Box>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                                        <Typography sx={{ fontWeight: 800, fontSize: '15px', color: '#425A8B' }}>{o.orderNumber}</Typography>
                                        <Chip
                                            label={o.status}
                                            size="small"
                                            color={o.status === 'ENTREGADO' ? 'success' : o.status === 'CANCELADO' || o.status === 'DEVUELTO' ? 'error' : 'primary'}
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </Stack>
                                    <Typography sx={{ fontSize: '12.5px', color: '#66789C' }}>
                                        Fecha: {new Date(o.createdAt).toLocaleString('es-GT')} · {o.itemsCount} artículos · Entrega: {o.shippingAddressSummary}
                                    </Typography>
                                </Box>

                                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                    <Typography sx={{ fontWeight: 800, fontSize: '16px', color: '#FD9636' }}>Q{o.total.toFixed(2)}</Typography>
                                    <Button size="small" variant="outlined" startIcon={<VisibilityOutlined />} onClick={() => handleViewDetail(o.id)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                        Ver Detalle
                                    </Button>
                                    {canCancel && (
                                        <Button size="small" color="error" variant="outlined" startIcon={<CancelOutlined />} onClick={() => handleCancelOrder(o)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                            Cancelar
                                        </Button>
                                    )}
                                </Stack>
                            </Card>
                        );
                    })
                )}
            </Stack>

            <OrderDetailDialog open={detailOpen} order={selectedOrder} onClose={() => setDetailOpen(false)} />
        </Box>
    );
};

export default MyOrdersPage;
