import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Stack, Chip, Divider,
} from '@mui/material';
import type { OrderDetailDto, OrderItemDto } from '../../domain/order.dto';

interface Props {
    open: boolean;
    order: OrderDetailDto | null;
    canProcessReturns?: boolean;
    onClose: () => void;
    onOpenReturnDialog?: (item: OrderItemDto) => void;
}

export const OrderDetailDialog: React.FC<Props> = ({
    open, order, canProcessReturns = false, onClose, onOpenReturnDialog,
}) => {
    if (!order) return null;
    const allowReturns = canProcessReturns && ['DESPACHADO', 'ENTREGADO', 'DEVUELTO'].includes(order.status);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, color: '#425A8B' }}>
                Detalle del Pedido {order.orderNumber} —{' '}
                <Chip label={order.status} size="small" color="primary" sx={{ fontWeight: 700 }} />
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: '#F8FAFC', border: '1px solid #D5DFE4' }}>
                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#425A8B' }}>
                            Cliente: {order.customerName} ({order.customerEmail})
                        </Typography>
                        <Typography sx={{ fontSize: '12.5px', color: '#66789C' }}>
                            Entrega: {order.address.title} — {order.address.recipientName} ({order.address.phone}) ·{' '}
                            {order.address.streetAddress}, {order.address.city}, {order.address.state}
                        </Typography>
                    </Box>

                    <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#425A8B' }}>Artículos del Pedido</Typography>
                    <Stack spacing={1}>
                        {order.items.map((item) => (
                            <Box
                                key={item.id}
                                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.25, borderRadius: '8px', border: '1px solid #E5E9F2' }}
                            >
                                <Box>
                                    <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#425A8B' }}>
                                        {item.productName} ({item.variantSku})
                                    </Typography>
                                    <Typography sx={{ fontSize: '12px', color: '#66789C' }}>
                                        Cant: {item.quantity} × Q{item.unitPrice.toFixed(2)} = Q{item.subtotal.toFixed(2)}
                                        {item.returnedQuantity > 0 && (
                                            <Box component="span" sx={{ color: '#DC2626', ml: 1, fontWeight: 700 }}>
                                                · Devueltos: {item.returnedQuantity}
                                            </Box>
                                        )}
                                    </Typography>
                                </Box>
                                {allowReturns && item.availableToReturn > 0 && onOpenReturnDialog && (
                                    <Button size="small" variant="outlined" color="warning" onClick={() => onOpenReturnDialog(item)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                        Devolver ({item.availableToReturn} disp.)
                                    </Button>
                                )}
                            </Box>
                        ))}
                    </Stack>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
                        <Typography sx={{ fontSize: '13px', color: '#66789C' }}>Subtotal: <strong>Q{order.subtotal.toFixed(2)}</strong></Typography>
                        {order.discount > 0 && (
                            <Typography sx={{ fontSize: '13px', color: '#10B981' }}>
                                Descuento ({order.couponCode}): <strong>-Q{order.discount.toFixed(2)}</strong>
                            </Typography>
                        )}
                        <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#FD9636' }}>Total: Q{order.total.toFixed(2)}</Typography>
                    </Box>

                    <Divider />
                    <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#425A8B' }}>Historial de Estados (Trazabilidad)</Typography>
                    <Stack spacing={0.75}>
                        {order.statusHistory.map((h) => (
                            <Typography key={h.id} sx={{ fontSize: '12.5px', color: '#66789C' }}>
                                • <strong>{h.previousStatus ? `${h.previousStatus} → ${h.newStatus}` : h.newStatus}</strong> por{' '}
                                {h.changedByName} ({new Date(h.changedAt).toLocaleString('es-GT')})
                            </Typography>
                        ))}
                    </Stack>

                    {order.returns.length > 0 && (
                        <>
                            <Divider />
                            <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#DC2626' }}>Devoluciones Registradas (Kardex)</Typography>
                            <Stack spacing={0.75}>
                                {order.returns.map((r) => (
                                    <Typography key={r.id} sx={{ fontSize: '12.5px', color: '#66789C' }}>
                                        • <strong>{r.productName}</strong> ({r.quantity} uds.) — Motivo: {r.reason} · Autorizado por {r.processedByName}
                                    </Typography>
                                ))}
                            </Stack>
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
};
